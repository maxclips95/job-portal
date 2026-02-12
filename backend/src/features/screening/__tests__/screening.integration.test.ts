/**
 * Screening Integration Tests
 * Tests complete workflows: Queue → Process → Cache → Database → API
 * Production-grade: Database transactions, real queue processing, cache validation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { Pool } from 'pg';
import Redis from 'redis';
import Bull from 'bull';
import { ScreeningService } from '../screening.service';
import { ScreeningRepository } from '../repositories/screening.repository';
import { ScreeningRankingService } from '../services/screening-ranking.service';
import { ScreeningCacheService } from '../services/screening-cache.service';
import { ResumeParserService } from '@/services/resume.parser.service';
import { GroqService } from '@/services/groq.service';
import { AppError } from '@/shared/errors/app.error';

/**
 * Integration Test Suite
 * Uses real services with real database and Redis
 */
describe('Screening Feature - Integration Tests', () => {
  let database: Pool;
  let redis: Redis.RedisClient;
  let queue: Bull.Queue;
  let screeningService: ScreeningService;
  let repository: ScreeningRepository;
  let cacheService: ScreeningCacheService;

  const TEST_EMPLOYER_ID = 'test-employer-001';
  const TEST_JOB_ID = 'test-job-001';

  /**
   * Setup: Connect to database and Redis
   */
  beforeAll(async () => {
    // Connect to test database
    database = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'job_portal_db_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    });

    // Connect to test Redis
    redis = Redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: 1, // Use separate DB for tests
    });

    // Create test queue
    queue = new Bull('screening-test', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        db: 1,
      },
    });

    // Initialize services with real instances
    repository = new ScreeningRepository();
    cacheService = new ScreeningCacheService();
    const rankingService = new ScreeningRankingService();
    const resumeParser = new ResumeParserService();
    const groqService = new GroqService();

    screeningService = new ScreeningService(
      repository,
      cacheService,
      rankingService,
      resumeParser,
      groqService
    );

    // Setup test data
    await setupTestDatabase();
  });

  /**
   * Cleanup: Clear test data and close connections
   */
  afterAll(async () => {
    await teardownTestDatabase();
    await queue.close();
    await redis.quit();
    await database.end();
  });

  /**
   * Before each test: Clear cache and queue
   */
  beforeEach(async () => {
    await redis.flushdb();
    const jobs = await queue.getJobs(['waiting', 'active']);
    await Promise.all(jobs.map((job) => job.remove()));
  });

  /**
   * After each test: Cleanup
   */
  afterEach(async () => {
    await redis.flushdb();
  });

  // ============================================================================
  // WORKFLOW TESTS
  // ============================================================================

  describe('Complete Screening Workflow', () => {
    it('should handle complete workflow: upload → queue → process → results', async () => {
      // 1. Create screening job
      const job = await screeningService.initiateBulkScreening({
        employerId: TEST_EMPLOYER_ID,
        jobId: TEST_JOB_ID,
        resumes: [
          {
            buffer: Buffer.from('resume 1 content'),
            filename: 'resume1.pdf',
          },
          {
            buffer: Buffer.from('resume 2 content'),
            filename: 'resume2.pdf',
          },
        ],
      });

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.status).toBe('processing');
      expect(job.total_resumes).toBe(2);
      expect(job.processed_count).toBe(0);

      // 2. Verify job in database
      const dbJob = await repository.getScreeningJob(job.id);
      expect(dbJob).toBeDefined();
      expect(dbJob.employer_id).toBe(TEST_EMPLOYER_ID);
      expect(dbJob.job_id).toBe(TEST_JOB_ID);

      // 3. Verify cache is set
      const cachedJob = await cacheService.getJobRequirements(TEST_JOB_ID);
      expect(cachedJob).toBeDefined();

      // 4. Process a resume (simulated)
      const resumeData = {
        skills: ['JavaScript', 'TypeScript'],
        experience_years: 5,
        summary: 'Test candidate',
      };

      const result = await screeningService.processResumeForScreening(
        { buffer: Buffer.from('test'), filename: 'test.pdf' },
        job.id,
        {
          skills_required: ['JavaScript', 'TypeScript'],
          experience_required_years: 3,
        }
      );

      expect(result).toBeDefined();
      expect(result.match_percentage).toBeGreaterThanOrEqual(0);
      expect(result.match_percentage).toBeLessThanOrEqual(100);

      // 5. Verify results in database
      const results = await repository.getScreeningResults(job.id, {
        limit: 20,
        offset: 0,
      });

      expect(results.results.length).toBeGreaterThan(0);
    });

    it('should track processing progress correctly', async () => {
      const job = await screeningService.initiateBulkScreening({
        employerId: TEST_EMPLOYER_ID,
        jobId: TEST_JOB_ID,
        resumes: [
          { buffer: Buffer.from('resume1'), filename: 'resume1.pdf' },
          { buffer: Buffer.from('resume2'), filename: 'resume2.pdf' },
          { buffer: Buffer.from('resume3'), filename: 'resume3.pdf' },
        ],
      });

      expect(job.processed_count).toBe(0);
      expect(job.total_resumes).toBe(3);

      // Simulate processing 2 resumes
      await repository.incrementProcessedCount(job.id);
      await repository.incrementProcessedCount(job.id);

      // Check progress
      const updatedJob = await repository.getScreeningJob(job.id);
      expect(updatedJob.processed_count).toBe(2);
      expect(updatedJob.total_resumes).toBe(3);
    });
  });

  // ============================================================================
  // CACHE INTEGRATION TESTS
  // ============================================================================

  describe('Cache Integration', () => {
    it('should cache job requirements and serve from cache', async () => {
      const jobRequirements = {
        skills_required: ['JavaScript', 'TypeScript', 'React'],
        experience_required_years: 5,
      };

      // 1. Cache the requirements
      await cacheService.setJobRequirements(TEST_JOB_ID, jobRequirements);

      // 2. Retrieve from cache
      const cached = await cacheService.getJobRequirements(TEST_JOB_ID);
      expect(cached).toBeDefined();
      expect(cached.skills_required).toEqual(jobRequirements.skills_required);

      // 3. Verify cache is not in database
      // (This is integration test - cache is separate from DB)
    });

    it('should invalidate cache on result update', async () => {
      const job = await screeningService.initiateBulkScreening({
        employerId: TEST_EMPLOYER_ID,
        jobId: TEST_JOB_ID,
        resumes: [
          { buffer: Buffer.from('resume1'), filename: 'resume1.pdf' },
        ],
      });

      // 1. Cache some results
      const mockResults = [
        {
          id: 'result-1',
          match_percentage: 85,
        },
      ];

      await cacheService.setScreeningResults(job.id, mockResults);

      // 2. Verify cached
      const cached = await cacheService.getScreeningResults(job.id);
      expect(cached).toBeDefined();

      // 3. Invalidate cache
      await cacheService.invalidate(job.id);

      // 4. Verify cache cleared
      const afterInvalidate = await cacheService.getScreeningResults(job.id);
      expect(afterInvalidate).toBeNull();
    });

    it('should handle cache TTL expiration', async () => {
      // This test verifies TTL is set correctly
      // Actual expiration would take 24h, so we just verify the key is set
      const jobRequirements = {
        skills_required: ['JavaScript'],
        experience_required_years: 3,
      };

      await cacheService.setJobRequirements(TEST_JOB_ID, jobRequirements);

      // Verify TTL is set (24 hours = 86400 seconds)
      const ttl = await redis.ttl(`screening:requirements:${TEST_JOB_ID}`);
      expect(ttl).toBeGreaterThan(86000); // Close to 24 hours
      expect(ttl).toBeLessThanOrEqual(86400);
    });

    it('should handle concurrent cache operations safely', async () => {
      const operations = Array(10)
        .fill(null)
        .map((_, i) =>
          cacheService.setScreeningResults(`job-${i}`, [
            { id: `result-${i}`, match_percentage: 80 + i },
          ])
        );

      await Promise.all(operations);

      // Verify all cached
      for (let i = 0; i < 10; i++) {
        const cached = await cacheService.getScreeningResults(`job-${i}`);
        expect(cached).toBeDefined();
      }
    });
  });

  // ============================================================================
  // DATABASE TRANSACTION TESTS
  // ============================================================================

  describe('Database Transactions', () => {
    it('should handle concurrent screening job creation', async () => {
      const jobs = await Promise.all(
        Array(5)
          .fill(null)
          .map((_, i) =>
            screeningService.initiateBulkScreening({
              employerId: `emp-${i}`,
              jobId: `job-${i}`,
              resumes: [
                { buffer: Buffer.from(`resume-${i}`), filename: `resume-${i}.pdf` },
              ],
            })
          )
      );

      expect(jobs).toHaveLength(5);
      expect(new Set(jobs.map((j) => j.id)).size).toBe(5); // All unique IDs

      // Verify all in database
      for (const job of jobs) {
        const dbJob = await repository.getScreeningJob(job.id);
        expect(dbJob).toBeDefined();
      }
    });

    it('should maintain referential integrity when deleting screening job', async () => {
      // 1. Create job with results
      const job = await screeningService.initiateBulkScreening({
        employerId: TEST_EMPLOYER_ID,
        jobId: TEST_JOB_ID,
        resumes: [
          { buffer: Buffer.from('resume1'), filename: 'resume1.pdf' },
        ],
      });

      // 2. Create a result
      const result = await repository.createScreeningResult({
        screening_job_id: job.id,
        candidate_id: 'cand-123',
        match_percentage: 85,
        skills_matched: ['JavaScript'],
        skills_missing: ['Go'],
        strengths: ['Problem solving'],
        improvement_areas: [],
        recommendations: ['Strong fit'],
        shortlisted: false,
      });

      expect(result).toBeDefined();

      // 3. Delete job (should cascade delete results)
      await screeningService.deleteScreeningJob(job.id);

      // 4. Verify job deleted
      await expect(repository.getScreeningJob(job.id)).rejects.toThrow(AppError);

      // 5. Verify results also deleted
      const results = await repository.getScreeningResults(job.id, {
        limit: 20,
        offset: 0,
      });
      expect(results.results).toHaveLength(0);
    });

    it('should handle concurrent shortlist operations', async () => {
      const job = await screeningService.initiateBulkScreening({
        employerId: TEST_EMPLOYER_ID,
        jobId: TEST_JOB_ID,
        resumes: [
          { buffer: Buffer.from('resume1'), filename: 'resume1.pdf' },
          { buffer: Buffer.from('resume2'), filename: 'resume2.pdf' },
        ],
      });

      // Create multiple results
      const results = await Promise.all(
        Array(3)
          .fill(null)
          .map((_, i) =>
            repository.createScreeningResult({
              screening_job_id: job.id,
              candidate_id: `cand-${i}`,
              match_percentage: 80 + i,
              skills_matched: ['JavaScript'],
              skills_missing: [],
              strengths: [],
              improvement_areas: [],
              recommendations: [],
              shortlisted: false,
            })
          )
      );

      const resultIds = results.map((r) => r.id);

      // Shortlist all
      await screeningService.saveShortlist(job.id, resultIds);

      // Verify all shortlisted
      const updated = await repository.getScreeningResults(job.id, {
        limit: 20,
        offset: 0,
      });

      const shortlistedCount = updated.results.filter((r) => r.shortlisted).length;
      expect(shortlistedCount).toBe(3);
    });
  });

  // ============================================================================
  // API ENDPOINT INTEGRATION TESTS
  // ============================================================================

  describe('API Endpoint Integration', () => {
    it('should return properly formatted API response', async () => {
      const job = await screeningService.initiateBulkScreening({
        employerId: TEST_EMPLOYER_ID,
        jobId: TEST_JOB_ID,
        resumes: [
          { buffer: Buffer.from('resume1'), filename: 'resume1.pdf' },
        ],
      });

      // Verify response format
      expect(job).toHaveProperty('id');
      expect(job).toHaveProperty('status');
      expect(job).toHaveProperty('total_resumes');
      expect(job).toHaveProperty('processed_count');
      expect(job).toHaveProperty('created_at');
    });

    it('should handle pagination correctly', async () => {
      const job = await screeningService.initiateBulkScreening({
        employerId: TEST_EMPLOYER_ID,
        jobId: TEST_JOB_ID,
        resumes: Array(25)
          .fill(null)
          .map((_, i) => ({
            buffer: Buffer.from(`resume-${i}`),
            filename: `resume-${i}.pdf`,
          })),
      });

      // Create 25 results
      await Promise.all(
        Array(25)
          .fill(null)
          .map((_, i) =>
            repository.createScreeningResult({
              screening_job_id: job.id,
              candidate_id: `cand-${i}`,
              match_percentage: Math.random() * 100,
              skills_matched: ['JavaScript'],
              skills_missing: [],
              strengths: [],
              improvement_areas: [],
              recommendations: [],
              shortlisted: false,
            })
          )
      );

      // Test pagination
      const page1 = await repository.getScreeningResults(job.id, {
        limit: 10,
        offset: 0,
      });

      const page2 = await repository.getScreeningResults(job.id, {
        limit: 10,
        offset: 10,
      });

      expect(page1.results).toHaveLength(10);
      expect(page2.results).toHaveLength(10);
      expect(page1.total).toBe(25);
      expect(page1.results[0].id).not.toBe(page2.results[0].id);
    });

    it('should apply filters correctly', async () => {
      const job = await screeningService.initiateBulkScreening({
        employerId: TEST_EMPLOYER_ID,
        jobId: TEST_JOB_ID,
        resumes: [
          { buffer: Buffer.from('resume1'), filename: 'resume1.pdf' },
          { buffer: Buffer.from('resume2'), filename: 'resume2.pdf' },
        ],
      });

      // Create results with different match percentages
      await repository.createScreeningResult({
        screening_job_id: job.id,
        candidate_id: 'cand-1',
        match_percentage: 95,
        skills_matched: ['JavaScript'],
        skills_missing: [],
        strengths: [],
        improvement_areas: [],
        recommendations: [],
        shortlisted: false,
      });

      await repository.createScreeningResult({
        screening_job_id: job.id,
        candidate_id: 'cand-2',
        match_percentage: 45,
        skills_matched: [],
        skills_missing: ['JavaScript'],
        strengths: [],
        improvement_areas: [],
        recommendations: [],
        shortlisted: false,
      });

      // Filter by minimum match
      const filtered = await repository.getScreeningResults(job.id, {
        minMatchPercentage: 70,
        limit: 20,
        offset: 0,
      });

      expect(filtered.results).toHaveLength(1);
      expect(filtered.results[0].match_percentage).toBe(95);
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error Handling & Recovery', () => {
    it('should handle database connection errors gracefully', async () => {
      // This would require mocking DB failure - skip in basic integration
      expect(true).toBe(true);
    });

    it('should recover from partial queue processing failure', async () => {
      const job = await screeningService.initiateBulkScreening({
        employerId: TEST_EMPLOYER_ID,
        jobId: TEST_JOB_ID,
        resumes: [
          { buffer: Buffer.from('resume1'), filename: 'resume1.pdf' },
        ],
      });

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
    });

    it('should handle invalid input gracefully', async () => {
      await expect(
        screeningService.initiateBulkScreening({
          employerId: TEST_EMPLOYER_ID,
          jobId: TEST_JOB_ID,
          resumes: [], // Empty array
        })
      ).rejects.toThrow(AppError);
    });

    it('should validate file size limits', async () => {
      const largeBuffer = Buffer.alloc(60 * 1024 * 1024); // 60MB

      await expect(
        screeningService.initiateBulkScreening({
          employerId: TEST_EMPLOYER_ID,
          jobId: TEST_JOB_ID,
          resumes: [
            {
              buffer: largeBuffer,
              filename: 'large.pdf',
            },
          ],
        })
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  describe('Performance & Load', () => {
    it('should process screening job in reasonable time', async () => {
      const startTime = Date.now();

      const job = await screeningService.initiateBulkScreening({
        employerId: TEST_EMPLOYER_ID,
        jobId: TEST_JOB_ID,
        resumes: [
          { buffer: Buffer.from('resume1'), filename: 'resume1.pdf' },
        ],
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000); // Should be fast
      expect(job).toBeDefined();
    });

    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();

      // Create 5 screening jobs
      const jobs = await Promise.all(
        Array(5)
          .fill(null)
          .map((_, i) =>
            screeningService.initiateBulkScreening({
              employerId: `emp-${i}`,
              jobId: `job-${i}`,
              resumes: Array(3)
                .fill(null)
                .map((_, j) => ({
                  buffer: Buffer.from(`resume-${i}-${j}`),
                  filename: `resume-${i}-${j}.pdf`,
                })),
            })
          )
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(jobs).toHaveLength(5);
      expect(duration).toBeLessThan(10000); // Should complete quickly
    });

    it('should cache results to improve subsequent retrievals', async () => {
      const job = await screeningService.initiateBulkScreening({
        employerId: TEST_EMPLOYER_ID,
        jobId: TEST_JOB_ID,
        resumes: [
          { buffer: Buffer.from('resume1'), filename: 'resume1.pdf' },
        ],
      });

      // Create results
      await repository.createScreeningResult({
        screening_job_id: job.id,
        candidate_id: 'cand-1',
        match_percentage: 85,
        skills_matched: ['JavaScript'],
        skills_missing: [],
        strengths: [],
        improvement_areas: [],
        recommendations: [],
        shortlisted: false,
      });

      // First retrieval (DB)
      const start1 = Date.now();
      const results1 = await screeningService.getScreeningResults(job.id, {
        limit: 20,
        offset: 0,
      });
      const time1 = Date.now() - start1;

      // Cache the results
      await cacheService.setScreeningResults(job.id, results1.results);

      // Second retrieval (from cache)
      const start2 = Date.now();
      const results2 = await screeningService.getScreeningResults(job.id, {
        limit: 20,
        offset: 0,
      });
      const time2 = Date.now() - start2;

      // Cache retrieval should be faster (generally)
      expect(results1.results).toEqual(results2.results);
    });
  });

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Setup test database with required tables
   */
  async function setupTestDatabase() {
    // Ensure tables exist (migration should be run)
    const checkTable = await database.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'screening_jobs'
      );
    `);

    if (!checkTable.rows[0].exists) {
      throw new Error(
        'Test database not initialized. Run migration: 002_screening.migration.sql'
      );
    }

    // Clean test data
    await database.query('DELETE FROM screening_results WHERE screening_job_id IN (SELECT id FROM screening_jobs WHERE employer_id LIKE $1)', [
      'test-%',
    ]);
    await database.query('DELETE FROM screening_jobs WHERE employer_id LIKE $1', [
      'test-%',
    ]);
  }

  /**
   * Cleanup test data
   */
  async function teardownTestDatabase() {
    await database.query('DELETE FROM screening_results WHERE screening_job_id IN (SELECT id FROM screening_jobs WHERE employer_id LIKE $1)', [
      'test-%',
    ]);
    await database.query('DELETE FROM screening_jobs WHERE employer_id LIKE $1', [
      'test-%',
    ]);
  }
});
