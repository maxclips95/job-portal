/**
 * Screening API Service
 * Handles all API calls to backend screening endpoints
 * Includes file upload, results retrieval, analytics, and exports
 */

import apiClient from '@/services/api';

// ===================== TYPES =====================

export interface ScreeningUploadRequest {
  jobId: string;
  files: File[];
  metadata?: Record<string, any>;
}

export interface ScreeningJobResponse {
  id: string;
  jobId: string;
  employerId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalResumes: number;
  processedCount: number;
  startedAt: string;
  completedAt?: string;
  metadata: Record<string, any>;
}

export interface ScreeningResult {
  id: string;
  screeningJobId: string;
  candidateId: string;
  candidateName: string;
  matchPercentage: number;
  matchCategory: 'STRONG' | 'MODERATE' | 'WEAK';
  rank: number;
  isShortlisted: boolean;
  matchedSkills: string[];
  scoringBreakdown: {
    experience: number;
    skills: number;
    education: number;
    certifications: number;
    overall: number;
  };
  resumeUrl?: string;
  candidateEmail?: string;
  candidatePhone?: string;
}

export interface ScreeningResultsResponse {
  screeningJobId: string;
  totalResults: number;
  page: number;
  pageSize: number;
  totalPages: number;
  results: ScreeningResult[];
  summary: {
    strongMatches: number;
    moderateMatches: number;
    weakMatches: number;
    averageScore: number;
  };
}

export interface ScreeningAnalyticsResponse {
  screeningJobId: string;
  totalCandidates: number;
  matchDistribution: {
    STRONG: number;
    MODERATE: number;
    WEAK: number;
  };
  scoreDistribution: {
    bins: Array<{
      range: string;
      count: number;
      percentage: number;
    }>;
  };
  topMatchedSkills: Array<{
    skill: string;
    count: number;
    percentage: number;
  }>;
  topCandidates: ScreeningResult[];
  processingMetrics: {
    totalProcessingTime: number; // seconds
    averageTimePerResume: number; // ms
    averageScoreCalculationTime: number; // ms
  };
}

export interface ShortlistRequest {
  screeningJobId: string;
  candidateIds: string[];
  action: 'add' | 'remove';
}

export interface ExportRequest {
  screeningJobId: string;
  format: 'csv' | 'json';
  includeAll: boolean;
  selectedCandidateIds?: string[];
}

// ===================== SERVICE CLASS =====================

class ScreeningService {
  private baseUrl = '/api/screening';

  /**
   * Initiate bulk resume screening
   * @param jobId Job posting ID
   * @param files Resume files to upload
   * @param metadata Optional metadata
   * @returns Screening job details
   */
  async initiateScreening(
    jobId: string,
    files: File[],
    metadata?: Record<string, any>
  ): Promise<ScreeningJobResponse> {
    const formData = new FormData();
    formData.append('jobId', jobId);

    files.forEach((file) => {
      formData.append(`files`, file);
    });

    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const response = await apiClient.post<ScreeningJobResponse>(
      `${this.baseUrl}/initiate`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            // Dispatch progress event for component to listen
            window.dispatchEvent(
              new CustomEvent('screening-upload-progress', {
                detail: { progress, loaded: progressEvent.loaded, total: progressEvent.total },
              })
            );
          }
        },
      }
    );

    return response.data;
  }

  /**
   * Get screening results with filters and pagination
   * @param screeningJobId Screening job ID
   * @param options Filtering and pagination options
   * @returns Screening results
   */
  async getResults(
    screeningJobId: string,
    options?: {
      page?: number;
      pageSize?: number;
      sortBy?: 'rank' | 'match' | 'name';
      sortOrder?: 'asc' | 'desc';
      minMatch?: number;
      maxMatch?: number;
      matchCategory?: 'STRONG' | 'MODERATE' | 'WEAK';
      showShortlistedOnly?: boolean;
    }
  ): Promise<ScreeningResultsResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('screeningJobId', screeningJobId);

    if (options) {
      if (options.page) queryParams.append('page', options.page.toString());
      if (options.pageSize) queryParams.append('pageSize', options.pageSize.toString());
      if (options.sortBy) queryParams.append('sortBy', options.sortBy);
      if (options.sortOrder) queryParams.append('sortOrder', options.sortOrder);
      if (options.minMatch) queryParams.append('minMatch', options.minMatch.toString());
      if (options.maxMatch) queryParams.append('maxMatch', options.maxMatch.toString());
      if (options.matchCategory) queryParams.append('matchCategory', options.matchCategory);
      if (options.showShortlistedOnly) queryParams.append('shortlistedOnly', 'true');
    }

    const response = await apiClient.get<ScreeningResultsResponse>(
      `${this.baseUrl}/results?${queryParams.toString()}`
    );

    return response.data;
  }

  /**
   * Get screening analytics and insights
   * @param screeningJobId Screening job ID
   * @returns Analytics data
   */
  async getAnalytics(screeningJobId: string): Promise<ScreeningAnalyticsResponse> {
    const response = await apiClient.get<ScreeningAnalyticsResponse>(
      `${this.baseUrl}/${screeningJobId}/analytics`
    );

    return response.data;
  }

  /**
   * Get screening job status
   * @param screeningJobId Screening job ID
   * @returns Job details
   */
  async getJobStatus(screeningJobId: string): Promise<ScreeningJobResponse> {
    const response = await apiClient.get<ScreeningJobResponse>(
      `${this.baseUrl}/${screeningJobId}`
    );

    return response.data;
  }

  /**
   * Add/remove candidates from shortlist
   * @param request Shortlist request
   * @returns Updated job details
   */
  async updateShortlist(request: ShortlistRequest): Promise<ScreeningJobResponse> {
    const response = await apiClient.post<ScreeningJobResponse>(
      `${this.baseUrl}/${request.screeningJobId}/shortlist`,
      {
        candidateIds: request.candidateIds,
        action: request.action,
      }
    );

    return response.data;
  }

  /**
   * Export screening results
   * @param request Export request
   * @returns Blob of exported data
   */
  async exportResults(request: ExportRequest): Promise<Blob> {
    const response = await apiClient.post<Blob>(
      `${this.baseUrl}/${request.screeningJobId}/export`,
      {
        format: request.format,
        includeAll: request.includeAll,
        selectedCandidateIds: request.selectedCandidateIds,
      },
      {
        responseType: 'blob',
      }
    );

    return response.data;
  }

  /**
   * Delete screening job
   * @param screeningJobId Screening job ID
   */
  async deleteScreeningJob(screeningJobId: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${screeningJobId}`);
  }

  /**
   * Poll screening job status
   * @param screeningJobId Screening job ID
   * @param maxAttempts Maximum polling attempts
   * @param intervalMs Interval between polls in milliseconds
   * @returns Final job status
   */
  async pollJobStatus(
    screeningJobId: string,
    maxAttempts = 120,
    intervalMs = 5000
  ): Promise<ScreeningJobResponse> {
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const job = await this.getJobStatus(screeningJobId);

          if (job.status === 'COMPLETED' || job.status === 'FAILED') {
            resolve(job);
            return;
          }

          attempts++;
          if (attempts >= maxAttempts) {
            reject(new Error('Polling timeout: Screening job did not complete'));
            return;
          }

          setTimeout(poll, intervalMs);
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }
}

// Export singleton instance
export const screeningService = new ScreeningService();

// Export type for use in components
export type IScreeningService = ScreeningService;
