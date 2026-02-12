/**
 * Screening Controller
 * HTTP request handlers for screening endpoints
 * Production-grade: Input validation, error handling, logging
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';
import { AppError } from '@/shared/errors/app.error';
import { ScreeningService } from './screening.service';
import {
  uploadScreeningBatchSchema,
  screeningFilterSchema,
  shortlistSchema,
} from '@/shared/validators/screening.validator';
import type { ScreeningJob, ScreeningResult, ScreeningMetrics } from '@/shared/types/database.types';

/**
 * Data Transfer Objects (DTOs) for API responses
 */
interface ScreeningResultDTO {
  id: string;
  matchPercentage: number;
  skillsMatched: string[];
  skillsMissing: string[];
  strengths: string[];
  improvementAreas: string[];
  recommendations: string[];
  rank?: number;
}

interface ScreeningResponseDTO {
  screeningJobId: string;
  status: string;
  totalResumes: number;
  processedCount: number;
  createdAt: string;
}

interface AnalyticsResponseDTO {
  totalScreened: number;
  averageMatch: number;
  strongMatches: number;
  moderateMatches: number;
  weakMatches: number;
  distribution: {
    strong: number;
    moderate: number;
    weak: number;
  };
}

export class ScreeningController {
  constructor(private screeningService: ScreeningService) {}

  /**
   * Upload and initiate screening of multiple resumes
   * POST /api/screening/batch-upload
   */
  async uploadBatch(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const employerId = req.user?.id;
      const jobId = req.body.jobId;

      // Validate employer authentication
      if (!employerId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      // Validate job ID format
      if (!jobId || typeof jobId !== 'string') {
        throw new AppError('Invalid job ID', 400, 'VALIDATION_ERROR');
      }

      // Validate files exist
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        throw new AppError('At least 1 resume required', 400, 'VALIDATION_ERROR');
      }

      if (req.files.length > 500) {
        throw new AppError('Maximum 500 resumes per batch', 400, 'VALIDATION_ERROR');
      }

      // Filter only PDF files
      const pdfFiles = req.files.filter((f: any) =>
        f.mimetype === 'application/pdf'
      );

      if (pdfFiles.length === 0) {
        throw new AppError('Only PDF files are supported', 400, 'VALIDATION_ERROR');
      }

      logger.info('Screening batch upload initiated', {
        employerId,
        jobId,
        fileCount: pdfFiles.length,
      });

      // Initiate screening
      const screeningJob = await this.screeningService.initiateBulkScreening({
        employerId,
        jobId,
        resumes: pdfFiles.map((f: any) => ({
          buffer: f.buffer,
          filename: f.originalname,
        })),
      });

      // Return response
      res.status(202).json({
        success: true,
        data: this.formatScreeningResponse(screeningJob),
        message: 'Screening job created. Processing in background.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get screening results with filters
   * GET /api/screening/results?screeningJobId=...&minMatch=70&limit=20&offset=0
   */
  async getResults(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { screeningJobId } = req.query;

      // Validate screening job ID
      if (!screeningJobId || typeof screeningJobId !== 'string') {
        throw new AppError('Invalid screening job ID', 400, 'VALIDATION_ERROR');
      }

      // Parse and validate filters
      const filters = screeningFilterSchema.parse({
        minMatchPercentage: req.query.minMatch
          ? parseInt(req.query.minMatch as string)
          : undefined,
        status: req.query.status,
        sortBy: req.query.sortBy,
        sortDesc: req.query.sortDesc === 'true',
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      });

      logger.info('Fetching screening results', {
        screeningJobId,
        filters,
      });

      // Get results
      const { results, total } = await this.screeningService.getScreeningResults(
        screeningJobId,
        filters
      );

      // Format response
      res.status(200).json({
        success: true,
        data: {
          results: results.map(this.formatResultDTO),
          pagination: {
            total,
            limit: filters.limit,
            offset: filters.offset,
            hasMore: filters.offset + filters.limit < total,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get screening analytics/insights
   * GET /api/screening/analytics?screeningJobId=...
   */
  async getAnalytics(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { screeningJobId } = req.query;

      if (!screeningJobId || typeof screeningJobId !== 'string') {
        throw new AppError('Invalid screening job ID', 400, 'VALIDATION_ERROR');
      }

      logger.info('Fetching screening analytics', { screeningJobId });

      const analytics = await this.screeningService.getScreeningAnalytics(
        screeningJobId
      );

      res.status(200).json({
        success: true,
        data: this.formatAnalyticsDTO(analytics),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Save shortlist of candidates
   * PUT /api/screening/shortlist
   */
  async saveShortlist(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const employerId = req.user?.id;
      const { screeningJobId, candidateIds } = req.body;

      if (!employerId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      // Validate input
      const validated = shortlistSchema.parse({ candidateIds });

      logger.info('Saving shortlist', {
        employerId,
        screeningJobId,
        candidateCount: validated.candidateIds.length,
      });

      // Save shortlist
      const updated = await this.screeningService.saveShortlist(
        screeningJobId,
        validated.candidateIds
      );

      res.status(200).json({
        success: true,
        data: this.formatScreeningResponse(updated),
        message: `${validated.candidateIds.length} candidates shortlisted`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get screening job status
   * GET /api/screening/:screeningJobId
   */
  async getStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { screeningJobId } = req.params;

      logger.info('Fetching screening status', { screeningJobId });

      // TODO: Add authorization check (verify employer owns this job)

      // Get job from service (using cache)
      const job = await this.screeningService.getScreeningJob(screeningJobId);

      res.status(200).json({
        success: true,
        data: this.formatScreeningResponse(job),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete screening job
   * DELETE /api/screening/:screeningJobId
   */
  async deleteScreening(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const employerId = req.user?.id;
      const { screeningJobId } = req.params;

      if (!employerId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      logger.info('Deleting screening job', {
        employerId,
        screeningJobId,
      });

      // TODO: Add authorization check

      await this.screeningService.deleteScreeningJob(screeningJobId);

      res.status(200).json({
        success: true,
        message: 'Screening job deleted',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export shortlist
   * GET /api/screening/:screeningJobId/export
   */
  async exportShortlist(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { screeningJobId } = req.params;
      const { format } = req.query; // csv or json

      logger.info('Exporting shortlist', { screeningJobId, format });

      // Get results
      const { results } = await this.screeningService.getScreeningResults(
        screeningJobId,
        {
          minMatchPercentage: 50,
          limit: 1000,
          offset: 0,
        }
      );

      if (format === 'csv') {
        // Export as CSV
        const csv = this.convertToCSV(results);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="screening-${screeningJobId}.csv"`
        );
        res.send(csv);
      } else {
        // Export as JSON
        res.status(200).json({
          success: true,
          data: results.map(this.formatResultDTO),
          exportedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Format screening response DTO
   */
  private formatScreeningResponse(job: ScreeningJob): ScreeningResponseDTO {
    return {
      screeningJobId: job.id,
      status: job.status,
      totalResumes: job.total_resumes,
      processedCount: job.processed_count,
      createdAt: job.created_at.toISOString(),
    };
  }

  /**
   * Format result DTO
   */
  private formatResultDTO(result: ScreeningResult): ScreeningResultDTO {
    return {
      id: result.id,
      matchPercentage: result.match_percentage,
      skillsMatched: result.skills_matched,
      skillsMissing: result.skills_missing,
      strengths: result.strengths,
      improvementAreas: result.improvement_areas,
      recommendations: result.recommendations,
    };
  }

  /**
   * Format analytics DTO
   */
  private formatAnalyticsDTO(metrics: ScreeningMetrics): AnalyticsResponseDTO {
    return {
      totalScreened: metrics.totalScreened,
      averageMatch: Math.round(metrics.averageMatch),
      strongMatches: metrics.strongMatches,
      moderateMatches: metrics.moderateMatches,
      weakMatches: metrics.weakMatches,
      distribution: {
        strong: Math.round(
          (metrics.strongMatches / metrics.totalScreened) * 100
        ),
        moderate: Math.round(
          (metrics.moderateMatches / metrics.totalScreened) * 100
        ),
        weak: Math.round((metrics.weakMatches / metrics.totalScreened) * 100),
      },
    };
  }

  /**
   * Convert results to CSV
   */
  private convertToCSV(results: ScreeningResult[]): string {
    const headers = [
      'Candidate ID',
      'Match %',
      'Skills Matched',
      'Skills Missing',
      'Strengths',
      'Areas for Improvement',
    ];

    const rows = results.map((r) => [
      r.candidate_id,
      r.match_percentage.toString(),
      r.skills_matched.join('; '),
      r.skills_missing.join('; '),
      r.strengths.join('; '),
      r.improvement_areas.join('; '),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    return csv;
  }
}
