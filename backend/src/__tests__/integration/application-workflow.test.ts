/**
 * Application Workflow Integration Tests
 * Tests the complete journey: Apply → Interview → Offer → Accept
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import axios from 'axios';
import { Pool } from 'pg';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api';
let candidateToken: string;
let employerToken: string;
let jobId: string;
let applicationId: string;
let interviewId: string;
let offerId: string;
let pool: Pool;

describe('Application Workflow - Complete Journey', () => {
  beforeAll(async () => {
    // Setup: Create database connection pool
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Verify database connectivity
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    expect(result.rows.length).toBeGreaterThan(0);
    client.release();
  });

  afterAll(async () => {
    // Cleanup database and close connections
    const client = await pool.connect();
    
    // Delete test data in reverse order of creation
    if (offerId) await client.query('DELETE FROM offers WHERE id = $1', [offerId]);
    if (interviewId) await client.query('DELETE FROM interviews WHERE id = $1', [interviewId]);
    if (applicationId) await client.query('DELETE FROM applications WHERE id = $1', [applicationId]);
    if (jobId) await client.query('DELETE FROM jobs WHERE id = $1', [jobId]);
    
    client.release();
    await pool.end();
  });

  test('Step 1: Candidate registers and authenticates', async () => {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, {
      firstName: 'Test',
      lastName: 'Candidate',
      email: `candidate-${Date.now()}@test.com`,
      password: 'SecurePass123!',
      role: 'candidate',
    });

    expect(response.status).toBe(201);
    expect(response.data.token).toBeDefined();
    candidateToken = response.data.token;
  });

  test('Step 2: Employer registers and creates a job', async () => {
    // Employer registration
    const regResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
      firstName: 'Test',
      lastName: 'Employer',
      email: `employer-${Date.now()}@test.com`,
      password: 'SecurePass123!',
      role: 'employer',
      companyName: 'Test Company',
    });

    expect(regResponse.status).toBe(201);
    employerToken = regResponse.data.token;

    // Create job posting
    const jobResponse = await axios.post(
      `${API_BASE_URL}/jobs`,
      {
        title: 'Senior Developer',
        description: 'Test job for integration tests',
        location: 'Remote',
        salary: { min: 80000, max: 120000 },
        category: 'IT',
        jobType: 'Full-time',
        experienceLevel: 'Senior',
      },
      { headers: { Authorization: `Bearer ${employerToken}` } }
    );

    expect(jobResponse.status).toBe(201);
    expect(jobResponse.data.job.id).toBeDefined();
    jobId = jobResponse.data.job.id;
  });

  test('Step 3: Admin approves the job', async () => {
    // Get admin token (in real scenario, this would be a separate admin user)
    const adminResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: process.env.ADMIN_EMAIL || 'admin@jobportal.com',
      password: process.env.ADMIN_PASSWORD || 'AdminPass123!',
    });

    const adminToken = adminResponse.data.token;

    // Approve job
    const approveResponse = await axios.put(
      `${API_BASE_URL}/admin/jobs/${jobId}/approve`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    expect(approveResponse.status).toBe(200);
    expect(approveResponse.data.status).toBe('approved');
  });

  test('Step 4: Candidate applies for the job', async () => {
    const response = await axios.post(
      `${API_BASE_URL}/applications`,
      {
        jobId,
        resume: 'resume.pdf',
        coverLetter: 'I am interested in this position',
      },
      { headers: { Authorization: `Bearer ${candidateToken}` } }
    );

    expect(response.status).toBe(201);
    expect(response.data.application.id).toBeDefined();
    expect(response.data.application.status).toBe('pending');
    applicationId = response.data.application.id;
  });

  test('Step 5: Candidate can view their application', async () => {
    const response = await axios.get(
      `${API_BASE_URL}/applications/${applicationId}`,
      { headers: { Authorization: `Bearer ${candidateToken}` } }
    );

    expect(response.status).toBe(200);
    expect(response.data.application.id).toBe(applicationId);
    expect(response.data.application.jobId).toBe(jobId);
  });

  test('Step 6: Employer reviews and schedules interview', async () => {
    const scheduleDate = new Date();
    scheduleDate.setDate(scheduleDate.getDate() + 7); // Schedule for next week

    const response = await axios.post(
      `${API_BASE_URL}/applications/${applicationId}/schedule-interview`,
      {
        scheduledAt: scheduleDate.toISOString(),
        meetingLink: 'https://meet.google.com/xyz',
        interviewerName: 'John Manager',
      },
      { headers: { Authorization: `Bearer ${employerToken}` } }
    );

    expect(response.status).toBe(200);
    expect(response.data.interview.id).toBeDefined();
    interviewId = response.data.interview.id;
  });

  test('Step 7: Candidate views scheduled interview', async () => {
    const response = await axios.get(
      `${API_BASE_URL}/interviews/${interviewId}`,
      { headers: { Authorization: `Bearer ${candidateToken}` } }
    );

    expect(response.status).toBe(200);
    expect(response.data.interview.meetingLink).toBeDefined();
    expect(response.data.interview.status).toBe('scheduled');
  });

  test('Step 8: Candidate can reschedule interview', async () => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + 8);

    const response = await axios.put(
      `${API_BASE_URL}/interviews/${interviewId}/reschedule`,
      { newScheduledAt: newDate.toISOString() },
      { headers: { Authorization: `Bearer ${candidateToken}` } }
    );

    expect(response.status).toBe(200);
    expect(new Date(response.data.interview.scheduledAt).toDateString()).toBe(newDate.toDateString());
  });

  test('Step 9: Employer sends job offer', async () => {
    const response = await axios.post(
      `${API_BASE_URL}/applications/${applicationId}/send-offer`,
      {
        annualSalary: 100000,
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        benefits: 'Health insurance, 401k, Remote work',
      },
      { headers: { Authorization: `Bearer ${employerToken}` } }
    );

    expect(response.status).toBe(201);
    expect(response.data.offer.id).toBeDefined();
    expect(response.data.offer.status).toBe('pending');
    offerId = response.data.offer.id;
  });

  test('Step 10: Candidate views and accepts offer', async () => {
    // View offer
    const viewResponse = await axios.get(
      `${API_BASE_URL}/offers/${offerId}`,
      { headers: { Authorization: `Bearer ${candidateToken}` } }
    );

    expect(viewResponse.status).toBe(200);
    expect(viewResponse.data.offer.status).toBe('pending');

    // Accept offer
    const acceptResponse = await axios.put(
      `${API_BASE_URL}/offers/${offerId}/accept`,
      {},
      { headers: { Authorization: `Bearer ${candidateToken}` } }
    );

    expect(acceptResponse.status).toBe(200);
    expect(acceptResponse.data.offer.status).toBe('accepted');
    expect(acceptResponse.data.offer.acceptedAt).toBeDefined();
  });

  test('Step 11: Candidate can view all their applications with correct statistics', async () => {
    const response = await axios.get(
      `${API_BASE_URL}/applications/my-applications`,
      { headers: { Authorization: `Bearer ${candidateToken}` } }
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data.applications)).toBe(true);
    expect(response.data.statistics).toBeDefined();
    expect(response.data.statistics.accepted).toBeGreaterThan(0);
  });

  test('Step 12: Candidate cannot apply for same job twice', async () => {
    const response = await axios.post(
      `${API_BASE_URL}/applications`,
      {
        jobId,
        resume: 'resume.pdf',
        coverLetter: 'Second application',
      },
      { headers: { Authorization: `Bearer ${candidateToken}` } }
    );

    expect(response.status).toBe(409);
    expect(response.data.message).toContain('already applied');
  });

  test('Step 13: Candidate can withdraw application before interview', async () => {
    // Create a new application to withdraw
    const newJobResponse = await axios.post(
      `${API_BASE_URL}/jobs`,
      {
        title: 'Junior Developer',
        description: 'Another test job',
        location: 'New York',
        salary: { min: 50000, max: 80000 },
        category: 'IT',
        jobType: 'Full-time',
        experienceLevel: 'Junior',
      },
      { headers: { Authorization: `Bearer ${employerToken}` } }
    );

    const newJobId = newJobResponse.data.job.id;

    // Approve new job
    const adminResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: process.env.ADMIN_EMAIL || 'admin@jobportal.com',
      password: process.env.ADMIN_PASSWORD || 'AdminPass123!',
    });

    await axios.put(
      `${API_BASE_URL}/admin/jobs/${newJobId}/approve`,
      {},
      { headers: { Authorization: `Bearer ${adminResponse.data.token}` } }
    );

    // Apply for new job
    const applyResponse = await axios.post(
      `${API_BASE_URL}/applications`,
      {
        jobId: newJobId,
        resume: 'resume.pdf',
        coverLetter: 'Test',
      },
      { headers: { Authorization: `Bearer ${candidateToken}` } }
    );

    const newApplicationId = applyResponse.data.application.id;

    // Withdraw application
    const withdrawResponse = await axios.put(
      `${API_BASE_URL}/applications/${newApplicationId}/withdraw`,
      {},
      { headers: { Authorization: `Bearer ${candidateToken}` } }
    );

    expect(withdrawResponse.status).toBe(200);
    expect(withdrawResponse.data.application.status).toBe('withdrawn');
  });

  test('Candidate can reject an offer', async () => {
    // Create another job and offer
    const jobResponse = await axios.post(
      `${API_BASE_URL}/jobs`,
      {
        title: 'Mid-level Developer',
        description: 'Test job',
        location: 'San Francisco',
        salary: { min: 60000, max: 100000 },
        category: 'IT',
        jobType: 'Full-time',
        experienceLevel: 'Mid',
      },
      { headers: { Authorization: `Bearer ${employerToken}` } }
    );

    const testJobId = jobResponse.data.job.id;

    // Approve job
    const adminResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: process.env.ADMIN_EMAIL || 'admin@jobportal.com',
      password: process.env.ADMIN_PASSWORD || 'AdminPass123!',
    });

    await axios.put(
      `${API_BASE_URL}/admin/jobs/${testJobId}/approve`,
      {},
      { headers: { Authorization: `Bearer ${adminResponse.data.token}` } }
    );

    // Apply
    const applyResponse = await axios.post(
      `${API_BASE_URL}/applications`,
      {
        jobId: testJobId,
        resume: 'resume.pdf',
        coverLetter: 'Test',
      },
      { headers: { Authorization: `Bearer ${candidateToken}` } }
    );

    const testAppId = applyResponse.data.application.id;

    // Send offer
    const offerResponse = await axios.post(
      `${API_BASE_URL}/applications/${testAppId}/send-offer`,
      {
        annualSalary: 90000,
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { headers: { Authorization: `Bearer ${employerToken}` } }
    );

    const testOfferId = offerResponse.data.offer.id;

    // Reject offer
    const rejectResponse = await axios.put(
      `${API_BASE_URL}/offers/${testOfferId}/reject`,
      { reason: 'Found better opportunity' },
      { headers: { Authorization: `Bearer ${candidateToken}` } }
    );

    expect(rejectResponse.status).toBe(200);
    expect(rejectResponse.data.offer.status).toBe('rejected');
  });
});
