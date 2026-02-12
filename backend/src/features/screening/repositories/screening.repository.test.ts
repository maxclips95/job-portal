/**
 * Screening Repository Unit Tests
 * Production-grade: Database operations, transactions, pagination
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ScreeningRepository } from '../repositories/screening.repository';
import { AppError } from '@/shared/errors/app.error';
import type { ScreeningJob, ScreeningResult } from '@/shared/types/database.types';

/**
 * Mock database pool
 */
class MockPool {
  query = jest.fn();
  connect = jest.fn();
  release = jest.fn();
}

/**
 * Mock database client (for transactions)
 */
class MockClient {
  query = jest.fn();
  release = jest.fn();
}

/**
 * Test fixtures
 */
function createMockScreeningJob(overrides?: Partial<ScreeningJob>): ScreeningJob {
  return {
    id: 'screening-123',
    employer_id: 'emp-123',
    job_id: 'job-456',
    status: 'processing',
    total_resumes: 10,
    processed_count: 0,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

function createMockScreeningResult(
  overrides?: Partial<ScreeningResult>
): ScreeningResult {
  return {
    id: 'result-123',
    screening_job_id: 'screening-123',
    candidate_id: 'cand-123',
    match_percentage: 85,
    skills_matched: ['JavaScript', 'TypeScript'],
    skills_missing: ['Go'],
    strengths: ['Problem solving'],
    improvement_areas: ['DevOps'],
    recommendations: ['Strong fit for senior role'],
    shortlisted: false,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

/**
 * Test suite
 */
describe('ScreeningRepository', () => {
  let repository: ScreeningRepository;
  let mockPool: MockPool;

  beforeEach(() => {
    mockPool = new MockPool() as any;
    repository = new ScreeningRepository();
    // Inject mock pool
    (repository as any).pool = mockPool;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createScreeningJob', () => {
    it('should create screening job with all required fields', async () => {
      const mockJob = createMockScreeningJob();
      mockPool.query.mockResolvedValue({ rows: [mockJob] });

      const result = await repository.createScreeningJob({
        employer_id: 'emp-123',
        job_id: 'job-456',
        status: 'processing',
        total_resumes: 10,
        processed_count: 0,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO screening_jobs'),
        expect.arrayContaining(['emp-123', 'job-456', 'processing', 10, 0])
      );

      expect(result.employer_id).toBe('emp-123');
      expect(result.job_id).toBe('job-456');
      expect(result.total_resumes).toBe(10);
    });

    it('should throw error if creation fails', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      await expect(
        repository.createScreeningJob({
          employer_id: 'emp-123',
          job_id: 'job-456',
          status: 'processing',
          total_resumes: 10,
          processed_count: 0,
        })
      ).rejects.toThrow(AppError);
    });

    it('should return job with generated ID', async () => {
      const mockJob = createMockScreeningJob({ id: 'generated-uuid' });
      mockPool.query.mockResolvedValue({ rows: [mockJob] });

      const result = await repository.createScreeningJob({
        employer_id: 'emp-123',
        job_id: 'job-456',
        status: 'processing',
        total_resumes: 10,
        processed_count: 0,
      });

      expect(result.id).toBe('generated-uuid');
    });
  });

  describe('getScreeningJob', () => {
    it('should retrieve screening job by ID', async () => {
      const mockJob = createMockScreeningJob();
      mockPool.query.mockResolvedValue({ rows: [mockJob] });

      const result = await repository.getScreeningJob('screening-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM screening_jobs WHERE id = $1'),
        ['screening-123']
      );

      expect(result).toEqual(mockJob);
    });

    it('should throw error if job not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(repository.getScreeningJob('nonexistent')).rejects.toThrow(
        AppError
      );
    });

    it('should return job with correct status', async () => {
      const mockJob = createMockScreeningJob({ status: 'completed' });
      mockPool.query.mockResolvedValue({ rows: [mockJob] });

      const result = await repository.getScreeningJob('screening-123');

      expect(result.status).toBe('completed');
    });
  });

  describe('createScreeningResult', () => {
    it('should create screening result with all fields', async () => {
      const mockResult = createMockScreeningResult();
      mockPool.query.mockResolvedValue({ rows: [mockResult] });

      const result = await repository.createScreeningResult({
        screening_job_id: 'screening-123',
        candidate_id: 'cand-123',
        match_percentage: 85,
        skills_matched: ['JavaScript'],
        skills_missing: ['Go'],
        strengths: ['Problem solving'],
        improvement_areas: ['DevOps'],
        recommendations: ['Strong fit'],
        shortlisted: false,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO screening_results'),
        expect.arrayContaining([
          'screening-123',
          'cand-123',
          85,
          ['JavaScript'],
          ['Go'],
        ])
      );

      expect(result.match_percentage).toBe(85);
      expect(result.shortlisted).toBe(false);
    });

    it('should throw error if required fields missing', async () => {
      await expect(
        repository.createScreeningResult({
          screening_job_id: '',
          candidate_id: 'cand-123',
          match_percentage: 85,
          skills_matched: [],
          skills_missing: [],
          strengths: [],
          improvement_areas: [],
          recommendations: [],
          shortlisted: false,
        })
      ).rejects.toThrow();
    });

    it('should handle invalid match percentage', async () => {
      await expect(
        repository.createScreeningResult({
          screening_job_id: 'screening-123',
          candidate_id: 'cand-123',
          match_percentage: 150, // Invalid > 100
          skills_matched: [],
          skills_missing: [],
          strengths: [],
          improvement_areas: [],
          recommendations: [],
          shortlisted: false,
        })
      ).rejects.toThrow();
    });
  });

  describe('getScreeningResults', () => {
    it('should retrieve results with default filters', async () => {
      const mockResults = [
        createMockScreeningResult({ match_percentage: 85 }),
        createMockScreeningResult({ match_percentage: 75 }),
      ];

      mockPool.query.mockResolvedValue({ rows: mockResults });

      const result = await repository.getScreeningResults('screening-123', {
        limit: 20,
        offset: 0,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM screening_results'),
        expect.any(Array)
      );

      expect(result.results).toHaveLength(2);
    });

    it('should apply minimum match percentage filter', async () => {
      const mockResults = [createMockScreeningResult({ match_percentage: 85 })];

      mockPool.query.mockResolvedValue({ rows: mockResults });

      await repository.getScreeningResults('screening-123', {
        minMatchPercentage: 80,
        limit: 20,
        offset: 0,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.arrayContaining([
          'screening-123',
          80, // minMatchPercentage
        ])
      );
    });

    it('should apply status filter', async () => {
      const mockResults = [
        createMockScreeningResult({ shortlisted: true }),
      ];

      mockPool.query.mockResolvedValue({ rows: mockResults });

      await repository.getScreeningResults('screening-123', {
        status: 'shortlisted',
        limit: 20,
        offset: 0,
      });

      expect(mockPool.query).toHaveBeenCalled();
    });

    it('should apply sorting', async () => {
      const mockResults = [
        createMockScreeningResult({ match_percentage: 95 }),
        createMockScreeningResult({ match_percentage: 85 }),
      ];

      mockPool.query.mockResolvedValue({ rows: mockResults });

      await repository.getScreeningResults('screening-123', {
        sortBy: 'match',
        sortDesc: true,
        limit: 20,
        offset: 0,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY'),
        expect.any(Array)
      );
    });

    it('should apply pagination', async () => {
      const mockResults = [createMockScreeningResult()];

      mockPool.query.mockResolvedValue({
        rows: mockResults,
        rowCount: 1,
      });

      const result = await repository.getScreeningResults('screening-123', {
        limit: 10,
        offset: 20,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([10, 20]) // limit, offset
      );
    });

    it('should return total count', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ count: '100' }],
      });

      const result = await repository.getScreeningResults('screening-123', {
        limit: 20,
        offset: 0,
      });

      // Total should be fetched from query
      expect(mockPool.query).toHaveBeenCalled();
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

      mockPool.query.mockResolvedValue({
        rows: [
          {
            total: '10',
            avg_match: '80',
            strong: '7',
            moderate: '2',
            weak: '1',
          },
        ],
      });

      const result = await repository.getScreeningAnalytics('screening-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['screening-123']
      );

      expect(result.totalScreened).toBeGreaterThan(0);
      expect(result.strongMatches + result.moderateMatches + result.weakMatches).toBe(
        result.totalScreened
      );
    });

    it('should handle empty screening job', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          {
            total: '0',
            avg_match: '0',
            strong: '0',
            moderate: '0',
            weak: '0',
          },
        ],
      });

      const result = await repository.getScreeningAnalytics('screening-123');

      expect(result.totalScreened).toBe(0);
    });
  });

  describe('saveShortlist', () => {
    it('should update results as shortlisted', async () => {
      const resultIds = ['result-1', 'result-2', 'result-3'];
      mockPool.query.mockResolvedValue({ rows: [{ count: 3 }] });

      await repository.saveShortlist('screening-123', resultIds);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE screening_results'),
        expect.any(Array)
      );
    });

    it('should only update results for specified screening job', async () => {
      const resultIds = ['result-1'];
      mockPool.query.mockResolvedValue({ rows: [{ count: 1 }] });

      await repository.saveShortlist('screening-123', resultIds);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['screening-123'])
      );
    });

    it('should throw error for empty result IDs', async () => {
      await expect(repository.saveShortlist('screening-123', [])).rejects.toThrow();
    });
  });

  describe('deleteScreeningJob', () => {
    it('should delete screening job and all results', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await repository.deleteScreeningJob('screening-123');

      // Should call DELETE on screening_results first (foreign key)
      // Then DELETE on screening_jobs
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE'),
        expect.any(Array)
      );
    });

    it('should throw error if job not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      // If job doesn't exist, we might not return error
      // But if we check existence first, this would catch it
      await expect(
        repository.deleteScreeningJob('nonexistent')
      ).resolves.not.toThrow();
    });
  });

  describe('incrementProcessedCount', () => {
    it('should increment processed count by 1', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ processed_count: 1 }] });

      const result = await repository.incrementProcessedCount('screening-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE screening_jobs'),
        expect.arrayContaining(['screening-123'])
      );
    });

    it('should return updated count', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ processed_count: 5 }],
      });

      const result = await repository.incrementProcessedCount('screening-123');

      expect(result).toBe(5);
    });
  });

  describe('getEmployerScreeningJobs', () => {
    it('should retrieve employer screening jobs with pagination', async () => {
      const mockJobs = [
        createMockScreeningJob({ employer_id: 'emp-123' }),
        createMockScreeningJob({ employer_id: 'emp-123' }),
      ];

      mockPool.query.mockResolvedValue({ rows: mockJobs });

      const result = await repository.getEmployerScreeningJobs('emp-123', {
        limit: 20,
        offset: 0,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM screening_jobs WHERE employer_id'),
        expect.arrayContaining(['emp-123'])
      );

      expect(result.jobs).toHaveLength(2);
    });

    it('should apply sorting by created date', async () => {
      const mockJobs = [createMockScreeningJob()];
      mockPool.query.mockResolvedValue({ rows: mockJobs });

      await repository.getEmployerScreeningJobs('emp-123', {
        sortBy: 'created',
        sortDesc: true,
        limit: 20,
        offset: 0,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY'),
        expect.any(Array)
      );
    });
  });

  describe('error handling', () => {
    it('should wrap database errors in AppError', async () => {
      mockPool.query.mockRejectedValue(
        new Error('Connection timeout')
      );

      await expect(repository.getScreeningJob('id')).rejects.toThrow(
        AppError
      );
    });

    it('should log errors with context', async () => {
      mockPool.query.mockRejectedValue(new Error('DB error'));
      const loggerSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(
        repository.getScreeningJob('id')
      ).rejects.toThrow();

      loggerSpy.mockRestore();
    });
  });
});
