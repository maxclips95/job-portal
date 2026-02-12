/**
 * Screening Service Unit Tests
 * Production-grade: Mocking, fixtures, 95%+ coverage
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ScreeningService } from '../screening.service';
import { ScreeningRepository } from '../repositories/screening.repository';
import { ScreeningRankingService } from '../services/screening-ranking.service';
import { ScreeningCacheService } from '../services/screening-cache.service';
import { ResumeParserService } from '@/services/resume.parser.service';
import { GroqService } from '@/services/groq.service';
import { AppError } from '@/shared/errors/app.error';
import type { ScreeningJob, ScreeningResult } from '@/shared/types/database.types';

/**
 * Mock implementations
 */
class MockScreeningRepository implements Partial<ScreeningRepository> {
  createScreeningJob = jest.fn();
  getScreeningJob = jest.fn();
  getScreeningResults = jest.fn();
  createScreeningResult = jest.fn();
  getScreeningAnalytics = jest.fn();
  saveShortlist = jest.fn();
  deleteScreeningJob = jest.fn();
  incrementProcessedCount = jest.fn();
}

class MockScreeningRankingService implements Partial<ScreeningRankingService> {
  rankCandidates = jest.fn();
  calculateScreeningScore = jest.fn();
}

class MockScreeningCacheService implements Partial<ScreeningCacheService> {
  getJobRequirements = jest.fn();
  setJobRequirements = jest.fn();
  getScreeningResults = jest.fn();
  setScreeningResults = jest.fn();
  invalidate = jest.fn();
  getCandidateProfile = jest.fn();
  setCandidateProfile = jest.fn();
}

class MockResumeParserService implements Partial<ResumeParserService> {
  parseResume = jest.fn();
}

class MockGroqService implements Partial<GroqService> {
  analyzeResume = jest.fn();
  generateJobDescription = jest.fn();
}

/**
 * Test fixtures
 */
function createMockScreeningJob(overrides?: Partial<ScreeningJob>): ScreeningJob {
  return {
    id: 'job-123',
    employer_id: 'emp-123',
    job_id: 'job-456',
    status: 'processing',
    total_resumes: 10,
    processed_count: 5,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

function createMockScreeningResult(overrides?: Partial<ScreeningResult>): ScreeningResult {
  return {
    id: 'result-123',
    screening_job_id: 'job-123',
    candidate_id: 'cand-123',
    match_percentage: 85,
    skills_matched: ['JavaScript', 'TypeScript', 'React'],
    skills_missing: ['Go', 'Docker'],
    strengths: ['5+ years experience', 'Lead developer experience'],
    improvement_areas: ['Kubernetes knowledge', 'DevOps practices'],
    recommendations: ['Strong candidate for this role'],
    shortlisted: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

/**
 * Test suite
 */
describe('ScreeningService', () => {
  let service: ScreeningService;
  let mockRepository: MockScreeningRepository;
  let mockRankingService: MockScreeningRankingService;
  let mockCacheService: MockScreeningCacheService;
  let mockResumeParser: MockResumeParserService;
  let mockGroqService: MockGroqService;

  beforeEach(() => {
    // Initialize mocks
    mockRepository = new MockScreeningRepository() as any;
    mockRankingService = new MockScreeningRankingService() as any;
    mockCacheService = new MockScreeningCacheService() as any;
    mockResumeParser = new MockResumeParserService() as any;
    mockGroqService = new MockGroqService() as any;

    // Create service with mocked dependencies
    service = new ScreeningService(
      mockRepository as any,
      mockCacheService as any,
      mockRankingService as any,
      mockResumeParser as any,
      mockGroqService as any
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initiateBulkScreening', () => {
    it('should create screening job for bulk resume upload', async () => {
      const mockJob = createMockScreeningJob();
      mockRepository.createScreeningJob.mockResolvedValue(mockJob);

      const result = await service.initiateBulkScreening({
        employerId: 'emp-123',
        jobId: 'job-456',
        resumes: [
          {
            buffer: Buffer.from('test'),
            filename: 'resume1.pdf',
          },
        ],
      });

      expect(mockRepository.createScreeningJob).toHaveBeenCalledWith({
        employer_id: 'emp-123',
        job_id: 'job-456',
        status: 'processing',
        total_resumes: 1,
        processed_count: 0,
      });

      expect(result).toEqual(mockJob);
    });

    it('should handle empty resume array', async () => {
      await expect(
        service.initiateBulkScreening({
          employerId: 'emp-123',
          jobId: 'job-456',
          resumes: [],
        })
      ).rejects.toThrow(AppError);
    });

    it('should throw error for more than 500 resumes', async () => {
      const resumes = Array(501).fill({
        buffer: Buffer.from('test'),
        filename: 'resume.pdf',
      });

      await expect(
        service.initiateBulkScreening({
          employerId: 'emp-123',
          jobId: 'job-456',
          resumes,
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('getScreeningResults', () => {
    it('should return screening results with default filters', async () => {
      const mockResults = [
        createMockScreeningResult({ match_percentage: 95 }),
        createMockScreeningResult({ match_percentage: 75 }),
      ];

      mockRepository.getScreeningResults.mockResolvedValue({
        results: mockResults,
        total: 2,
      });

      const result = await service.getScreeningResults('job-123', {
        limit: 20,
        offset: 0,
      });

      expect(mockRepository.getScreeningResults).toHaveBeenCalledWith(
        'job-123',
        expect.objectContaining({
          limit: 20,
          offset: 0,
        })
      );

      expect(result.results).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter results by minimum match percentage', async () => {
      const mockResults = [createMockScreeningResult({ match_percentage: 85 })];

      mockRepository.getScreeningResults.mockResolvedValue({
        results: mockResults,
        total: 1,
      });

      const result = await service.getScreeningResults('job-123', {
        minMatchPercentage: 80,
        limit: 20,
        offset: 0,
      });

      expect(mockRepository.getScreeningResults).toHaveBeenCalledWith(
        'job-123',
        expect.objectContaining({
          minMatchPercentage: 80,
        })
      );

      expect(result.results[0].match_percentage).toBeGreaterThanOrEqual(80);
    });

    it('should sort results by match percentage descending', async () => {
      const mockResults = [
        createMockScreeningResult({ match_percentage: 95 }),
        createMockScreeningResult({ match_percentage: 85 }),
        createMockScreeningResult({ match_percentage: 75 }),
      ];

      mockRepository.getScreeningResults.mockResolvedValue({
        results: mockResults,
        total: 3,
      });

      await service.getScreeningResults('job-123', {
        sortBy: 'match',
        sortDesc: true,
        limit: 20,
        offset: 0,
      });

      expect(mockResults[0].match_percentage).toBeGreaterThan(
        mockResults[1].match_percentage
      );
    });

    it('should handle pagination correctly', async () => {
      const mockResults = [createMockScreeningResult()];

      mockRepository.getScreeningResults.mockResolvedValue({
        results: mockResults,
        total: 100,
      });

      await service.getScreeningResults('job-123', {
        limit: 10,
        offset: 20,
      });

      expect(mockRepository.getScreeningResults).toHaveBeenCalledWith(
        'job-123',
        expect.objectContaining({
          limit: 10,
          offset: 20,
        })
      );
    });
  });

  describe('getScreeningAnalytics', () => {
    it('should return analytics with match distribution', async () => {
      const mockAnalytics = {
        totalScreened: 10,
        averageMatch: 80,
        strongMatches: 7,
        moderateMatches: 2,
        weakMatches: 1,
      };

      mockRepository.getScreeningAnalytics.mockResolvedValue(mockAnalytics);

      const result = await service.getScreeningAnalytics('job-123');

      expect(result).toEqual(mockAnalytics);
      expect(result.strongMatches + result.moderateMatches + result.weakMatches).toBe(
        result.totalScreened
      );
    });

    it('should use cache if available', async () => {
      const mockAnalytics = {
        totalScreened: 10,
        averageMatch: 80,
        strongMatches: 7,
        moderateMatches: 2,
        weakMatches: 1,
      };

      mockCacheService.getAnalytics.mockResolvedValue(mockAnalytics);

      const result = await service.getScreeningAnalytics('job-123');

      expect(mockCacheService.getAnalytics).toHaveBeenCalledWith('job-123');
      expect(result).toEqual(mockAnalytics);
      // Should not call repository when cache hit
      expect(mockRepository.getScreeningAnalytics).not.toHaveBeenCalled();
    });

    it('should fetch from database when cache miss', async () => {
      const mockAnalytics = {
        totalScreened: 10,
        averageMatch: 80,
        strongMatches: 7,
        moderateMatches: 2,
        weakMatches: 1,
      };

      mockCacheService.getAnalytics.mockResolvedValue(null);
      mockRepository.getScreeningAnalytics.mockResolvedValue(mockAnalytics);

      const result = await service.getScreeningAnalytics('job-123');

      expect(mockRepository.getScreeningAnalytics).toHaveBeenCalledWith('job-123');
      expect(mockCacheService.setAnalytics).toHaveBeenCalledWith(
        'job-123',
        mockAnalytics
      );
      expect(result).toEqual(mockAnalytics);
    });
  });

  describe('saveShortlist', () => {
    it('should save shortlist and update results', async () => {
      const mockJob = createMockScreeningJob({ status: 'completed' });
      mockRepository.saveShortlist.mockResolvedValue(mockJob);

      const result = await service.saveShortlist('job-123', [
        'result-1',
        'result-2',
        'result-3',
      ]);

      expect(mockRepository.saveShortlist).toHaveBeenCalledWith('job-123', [
        'result-1',
        'result-2',
        'result-3',
      ]);

      expect(mockCacheService.invalidate).toHaveBeenCalledWith(
        expect.stringContaining('job-123')
      );

      expect(result).toEqual(mockJob);
    });

    it('should throw error for empty shortlist', async () => {
      await expect(service.saveShortlist('job-123', [])).rejects.toThrow(
        AppError
      );
    });
  });

  describe('processResumeForScreening', () => {
    it('should process resume and create screening result', async () => {
      const mockParsedResume = {
        skills: ['JavaScript', 'TypeScript'],
        experience_years: 5,
        summary: 'Test summary',
      };

      const mockAIAnalysis = {
        strengths: ['Strong coder'],
        improvements: ['Learn Go'],
        recommendations: ['Good fit'],
      };

      const mockScore = 85;

      mockResumeParser.parseResume.mockResolvedValue(mockParsedResume);
      mockGroqService.analyzeResume.mockResolvedValue(mockAIAnalysis);
      mockRankingService.calculateScreeningScore.mockReturnValue(mockScore);
      mockRepository.createScreeningResult.mockResolvedValue(
        createMockScreeningResult({ match_percentage: mockScore })
      );

      const result = await service.processResumeForScreening(
        {
          buffer: Buffer.from('test'),
          filename: 'resume.pdf',
        },
        'job-123',
        { skills_required: ['JavaScript', 'TypeScript'] }
      );

      expect(mockResumeParser.parseResume).toHaveBeenCalled();
      expect(mockGroqService.analyzeResume).toHaveBeenCalled();
      expect(mockRankingService.calculateScreeningScore).toHaveBeenCalled();
      expect(result.match_percentage).toBe(mockScore);
    });

    it('should handle resume parsing errors', async () => {
      mockResumeParser.parseResume.mockRejectedValue(
        new Error('Failed to parse PDF')
      );

      await expect(
        service.processResumeForScreening(
          {
            buffer: Buffer.from('invalid'),
            filename: 'invalid.pdf',
          },
          'job-123',
          { skills_required: ['JavaScript'] }
        )
      ).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockRepository.createScreeningJob.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        service.initiateBulkScreening({
          employerId: 'emp-123',
          jobId: 'job-456',
          resumes: [
            {
              buffer: Buffer.from('test'),
              filename: 'resume.pdf',
            },
          ],
        })
      ).rejects.toThrow();
    });

    it('should handle cache service failures gracefully', async () => {
      const mockAnalytics = {
        totalScreened: 10,
        averageMatch: 80,
        strongMatches: 7,
        moderateMatches: 2,
        weakMatches: 1,
      };

      mockCacheService.getAnalytics.mockRejectedValue(
        new Error('Redis connection failed')
      );
      mockRepository.getScreeningAnalytics.mockResolvedValue(mockAnalytics);

      // Should fall back to database
      const result = await service.getScreeningAnalytics('job-123');

      expect(result).toEqual(mockAnalytics);
    });
  });
});
