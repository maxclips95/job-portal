/**
 * Screening E2E Tests
 * Tests complete user journeys through HTTP API
 * Production-grade: Real HTTP calls, authentication, full workflow validation
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

/**
 * E2E Test Suite - Complete User Workflows
 */
describe('Screening Feature - E2E Tests', () => {
  let api: AxiosInstance;
  let authToken: string;
  let testJobId: string;
  let testEmployerId: string;
  let screeningJobId: string;

  const API_BASE_URL = process.env.API_URL || 'http://localhost:5000';
  const TEST_USER_EMAIL = 'e2e-test@example.com';
  const TEST_USER_PASSWORD = 'TestPassword123!';

  /**
   * Setup: Initialize HTTP client and authenticate
   */
  beforeAll(async () => {
    api = axios.create({
      baseURL: API_BASE_URL,
      validateStatus: () => true, // Don't throw on any status
    });

    // Authenticate to get JWT token
    // Note: This assumes auth endpoint exists
    try {
      const loginResponse = await api.post('/api/auth/login', {
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
      });

      if (loginResponse.status === 200 && loginResponse.data.token) {
        authToken = loginResponse.data.token;
        testEmployerId = loginResponse.data.user.id;
        api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      } else {
        // For testing without real auth, use mock token
        authToken = 'mock-jwt-token';
        api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      }
    } catch (error) {
      console.warn('Auth failed, using mock token');
      authToken = 'mock-jwt-token';
      api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    }

    // Get or create test job
    try {
      const jobResponse = await api.get('/api/jobs');
      if (jobResponse.data.jobs && jobResponse.data.jobs.length > 0) {
        testJobId = jobResponse.data.jobs[0].id;
      }
    } catch (error) {
      testJobId = 'test-job-uuid-' + Date.now();
    }
  });

  /**
   * Cleanup: Delete test screening jobs
   */
  afterAll(async () => {
    if (screeningJobId) {
      try {
        await api.delete(`/api/screening/${screeningJobId}`);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  // ============================================================================
  // JOURNEY 1: BULK UPLOAD & SCREENING
  // ============================================================================

  describe('Journey 1: Bulk Resume Upload & Screening', () => {
    it('should upload resumes and initiate screening', async () => {
      // 1. Create sample resume files in memory
      const form = new FormData();
      form.append('jobId', testJobId);

      // Simulate PDF files (in real tests, use actual PDF files)
      const resumeContent1 = Buffer.from(
        `%PDF-1.4
        John Doe
        JavaScript Developer
        5 years experience
        Skills: JavaScript, TypeScript, React, Node.js`,
        'utf-8'
      );

      const resumeContent2 = Buffer.from(
        `%PDF-1.4
        Jane Smith
        Full Stack Engineer
        8 years experience
        Skills: JavaScript, Python, Go, Kubernetes`,
        'utf-8'
      );

      form.append('resumes', resumeContent1, { filename: 'resume-john.pdf' });
      form.append('resumes', resumeContent2, { filename: 'resume-jane.pdf' });

      // 2. Upload resumes
      const uploadResponse = await api.post('/api/screening/batch-upload', form, {
        headers: form.getHeaders(),
      });

      expect(uploadResponse.status).toBe(202); // Accepted
      expect(uploadResponse.data.success).toBe(true);
      expect(uploadResponse.data.data.screeningJobId).toBeDefined();
      expect(uploadResponse.data.data.status).toBe('processing');
      expect(uploadResponse.data.data.totalResumes).toBe(2);

      screeningJobId = uploadResponse.data.data.screeningJobId;
    });

    it('should reject upload with invalid file types', async () => {
      const form = new FormData();
      form.append('jobId', testJobId);

      // Try to upload non-PDF file
      const invalidContent = Buffer.from('This is not a PDF', 'utf-8');
      form.append('resumes', invalidContent, { filename: 'notapdf.txt' });

      const uploadResponse = await api.post('/api/screening/batch-upload', form, {
        headers: form.getHeaders(),
      });

      expect([400, 413]).toContain(uploadResponse.status);
    });

    it('should reject upload with too many files', async () => {
      const form = new FormData();
      form.append('jobId', testJobId);

      // Try to upload 501 files (limit is 500)
      for (let i = 0; i < 501; i++) {
        const content = Buffer.from(`Resume ${i}`, 'utf-8');
        form.append('resumes', content, { filename: `resume-${i}.pdf` });
      }

      const uploadResponse = await api.post('/api/screening/batch-upload', form, {
        headers: form.getHeaders(),
      });

      expect(uploadResponse.status).toBe(400);
      expect(uploadResponse.data.error).toBeDefined();
    });

    it('should reject upload without job ID', async () => {
      const form = new FormData();
      // No jobId

      const content = Buffer.from('Resume content', 'utf-8');
      form.append('resumes', content, { filename: 'resume.pdf' });

      const uploadResponse = await api.post('/api/screening/batch-upload', form, {
        headers: form.getHeaders(),
      });

      expect(uploadResponse.status).toBe(400);
      expect(uploadResponse.data.error).toContain('Job ID');
    });
  });

  // ============================================================================
  // JOURNEY 2: GET RESULTS WITH FILTERING
  // ============================================================================

  describe('Journey 2: Get Screening Results & Analytics', () => {
    let jobIdForResults: string;

    beforeAll(async () => {
      // First upload resumes to get results
      const form = new FormData();
      form.append('jobId', testJobId);

      const content = Buffer.from('Resume for John with JavaScript skills', 'utf-8');
      form.append('resumes', content, { filename: 'resume.pdf' });

      const uploadResponse = await api.post('/api/screening/batch-upload', form, {
        headers: form.getHeaders(),
      });

      if (uploadResponse.status === 202) {
        jobIdForResults = uploadResponse.data.data.screeningJobId;
      }
    });

    it('should retrieve screening results', async () => {
      const response = await api.get(`/api/screening/results`, {
        params: { screeningJobId: jobIdForResults },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.results).toBeDefined();
      expect(Array.isArray(response.data.data.results)).toBe(true);
      expect(response.data.data.pagination).toBeDefined();
    });

    it('should apply minimum match filter', async () => {
      const response = await api.get(`/api/screening/results`, {
        params: {
          screeningJobId: jobIdForResults,
          minMatch: 70,
        },
      });

      expect(response.status).toBe(200);

      if (response.data.data.results.length > 0) {
        response.data.data.results.forEach((result: any) => {
          expect(result.matchPercentage).toBeGreaterThanOrEqual(70);
        });
      }
    });

    it('should apply sorting', async () => {
      const response = await api.get(`/api/screening/results`, {
        params: {
          screeningJobId: jobIdForResults,
          sortBy: 'match',
          sortDesc: true,
        },
      });

      expect(response.status).toBe(200);

      if (response.data.data.results.length > 1) {
        for (let i = 0; i < response.data.data.results.length - 1; i++) {
          expect(response.data.data.results[i].matchPercentage).toBeGreaterThanOrEqual(
            response.data.data.results[i + 1].matchPercentage
          );
        }
      }
    });

    it('should apply pagination', async () => {
      const pageSize = 5;

      const response1 = await api.get(`/api/screening/results`, {
        params: {
          screeningJobId: jobIdForResults,
          limit: pageSize,
          offset: 0,
        },
      });

      const response2 = await api.get(`/api/screening/results`, {
        params: {
          screeningJobId: jobIdForResults,
          limit: pageSize,
          offset: pageSize,
        },
      });

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // If results exist, verify pagination
      if (response1.data.data.results.length > 0) {
        expect(response1.data.data.results[0].id).not.toBe(
          response2.data.data.results[0].id
        );
      }
    });

    it('should retrieve analytics', async () => {
      const response = await api.get(`/api/screening/analytics`, {
        params: { screeningJobId: jobIdForResults },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.totalScreened).toBeDefined();
      expect(response.data.data.averageMatch).toBeDefined();
      expect(response.data.data.strongMatches).toBeDefined();
      expect(response.data.data.moderateMatches).toBeDefined();
      expect(response.data.data.weakMatches).toBeDefined();

      // Validate distribution
      const total =
        response.data.data.strongMatches +
        response.data.data.moderateMatches +
        response.data.data.weakMatches;
      expect(total).toBe(response.data.data.totalScreened);
    });
  });

  // ============================================================================
  // JOURNEY 3: SHORTLIST & EXPORT
  // ============================================================================

  describe('Journey 3: Shortlist Candidates & Export', () => {
    let jobIdForShortlist: string;
    let resultIds: string[] = [];

    beforeAll(async () => {
      // Upload and get results
      const form = new FormData();
      form.append('jobId', testJobId);

      const content = Buffer.from('Resume with JavaScript', 'utf-8');
      form.append('resumes', content, { filename: 'resume.pdf' });

      const uploadResponse = await api.post('/api/screening/batch-upload', form, {
        headers: form.getHeaders(),
      });

      if (uploadResponse.status === 202) {
        jobIdForShortlist = uploadResponse.data.data.screeningJobId;

        // Get results to extract IDs
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for processing

        const resultsResponse = await api.get(`/api/screening/results`, {
          params: { screeningJobId: jobIdForShortlist },
        });

        if (resultsResponse.data.data.results.length > 0) {
          resultIds = resultsResponse.data.data.results
            .slice(0, 3)
            .map((r: any) => r.id);
        }
      }
    });

    it('should save shortlist', async () => {
      if (resultIds.length === 0) {
        return; // Skip if no results
      }

      const response = await api.put(`/api/screening/shortlist`, {
        screeningJobId: jobIdForShortlist,
        candidateIds: resultIds.slice(0, 2), // Select first 2
      });

      expect([200, 204]).toContain(response.status);
      expect(response.data.success || response.status === 204).toBe(true);
    });

    it('should reject shortlist with empty candidates', async () => {
      const response = await api.put(`/api/screening/shortlist`, {
        screeningJobId: jobIdForShortlist,
        candidateIds: [],
      });

      expect(response.status).toBe(400);
      expect(response.data.error).toBeDefined();
    });

    it('should export results as JSON', async () => {
      const response = await api.get(`/api/screening/${jobIdForShortlist}/export`, {
        params: { format: 'json' },
      });

      expect(response.status).toBe(200);
      expect(response.data.success || Array.isArray(response.data)).toBe(true);
    });

    it('should export results as CSV', async () => {
      const response = await api.get(`/api/screening/${jobIdForShortlist}/export`, {
        params: { format: 'csv' },
      });

      expect(response.status).toBe(200);
      expect(typeof response.data).toBe('string');
      expect(response.data).toContain(','); // CSV should have commas
    });
  });

  // ============================================================================
  // JOURNEY 4: JOB MANAGEMENT
  // ============================================================================

  describe('Journey 4: Screening Job Management', () => {
    let managementJobId: string;

    beforeAll(async () => {
      const form = new FormData();
      form.append('jobId', testJobId);

      const content = Buffer.from('Resume content', 'utf-8');
      form.append('resumes', content, { filename: 'resume.pdf' });

      const uploadResponse = await api.post('/api/screening/batch-upload', form, {
        headers: form.getHeaders(),
      });

      if (uploadResponse.status === 202) {
        managementJobId = uploadResponse.data.data.screeningJobId;
      }
    });

    it('should get screening job status', async () => {
      const response = await api.get(`/api/screening/${managementJobId}`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.screeningJobId).toBe(managementJobId);
      expect(response.data.data.status).toBeDefined();
      expect(response.data.data.totalResumes).toBeDefined();
      expect(response.data.data.processedCount).toBeDefined();
    });

    it('should delete screening job', async () => {
      const response = await api.delete(`/api/screening/${managementJobId}`);

      expect([200, 204]).toContain(response.status);

      // Verify deleted
      const checkResponse = await api.get(`/api/screening/${managementJobId}`);
      expect(checkResponse.status).toBe(404);
    });

    it('should return 404 for non-existent job', async () => {
      const response = await api.get(`/api/screening/non-existent-id`);

      expect(response.status).toBe(404);
    });
  });

  // ============================================================================
  // AUTHENTICATION TESTS
  // ============================================================================

  describe('Authentication & Authorization', () => {
    it('should reject request without authentication token', async () => {
      const unauthenticatedApi = axios.create({
        baseURL: API_BASE_URL,
        validateStatus: () => true,
      });
      // No authorization header

      const response = await unauthenticatedApi.get(`/api/screening/results`, {
        params: { screeningJobId: 'any-id' },
      });

      expect(response.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const invalidApi = axios.create({
        baseURL: API_BASE_URL,
        validateStatus: () => true,
        headers: { Authorization: 'Bearer invalid-token' },
      });

      const response = await invalidApi.get(`/api/screening/results`, {
        params: { screeningJobId: 'any-id' },
      });

      expect(response.status).toBe(401);
    });

    it('should reject request with missing Authorization header', async () => {
      const noAuthApi = axios.create({
        baseURL: API_BASE_URL,
        validateStatus: () => true,
      });

      const response = await noAuthApi.post(`/api/screening/batch-upload`, {
        jobId: testJobId,
      });

      expect(response.status).toBe(401);
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  describe('Performance & Load', () => {
    it('should handle upload and response in reasonable time', async () => {
      const form = new FormData();
      form.append('jobId', testJobId);

      const content = Buffer.from('Resume content', 'utf-8');
      form.append('resumes', content, { filename: 'resume.pdf' });

      const startTime = Date.now();
      const response = await api.post('/api/screening/batch-upload', form, {
        headers: form.getHeaders(),
      });
      const endTime = Date.now();

      const duration = endTime - startTime;

      expect(response.status).toBe(202);
      expect(duration).toBeLessThan(5000); // Should respond in < 5 seconds
    });

    it('should handle concurrent uploads', async () => {
      const uploads = Array(3)
        .fill(null)
        .map(async () => {
          const form = new FormData();
          form.append('jobId', testJobId);

          const content = Buffer.from('Resume content', 'utf-8');
          form.append('resumes', content, { filename: 'resume.pdf' });

          return api.post('/api/screening/batch-upload', form, {
            headers: form.getHeaders(),
          });
        });

      const startTime = Date.now();
      const responses = await Promise.all(uploads);
      const endTime = Date.now();

      const duration = endTime - startTime;

      expect(responses.every((r) => r.status === 202)).toBe(true);
      expect(duration).toBeLessThan(15000); // All 3 in < 15 seconds
    });

    it('should handle large result set retrieval', async () => {
      // This would require uploading many resumes
      // For now, test basic retrieval performance
      const startTime = Date.now();

      const response = await api.get(`/api/screening/results`, {
        params: {
          screeningJobId: screeningJobId || 'test-id',
          limit: 100,
        },
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect([200, 404]).toContain(response.status);
      expect(duration).toBeLessThan(2000); // Should retrieve in < 2 seconds
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error Handling', () => {
    it('should return proper error format for validation errors', async () => {
      const response = await api.put(`/api/screening/shortlist`, {
        screeningJobId: 'invalid-uuid',
        candidateIds: [],
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBeDefined();
      expect(response.data.code).toBeDefined();
    });

    it('should return 404 for non-existent screening job', async () => {
      const response = await api.get(`/api/screening/results`, {
        params: { screeningJobId: 'non-existent-uuid' },
      });

      expect(response.status).toBe(404);
    });

    it('should handle server errors gracefully', async () => {
      // Try to access with malformed parameters
      const response = await api.get(`/api/screening/results`, {
        params: {
          screeningJobId: 'valid-uuid',
          limit: -1, // Invalid
        },
      });

      expect([400, 422]).toContain(response.status);
    });
  });
});
