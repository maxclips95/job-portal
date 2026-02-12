/**
 * Job Lifecycle Integration Tests
 * Tests complete job journey: Post → Approve → Apply → Complete
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import { Pool } from 'pg';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api';
let adminToken: string;
let employerToken: string;
let candidateToken: string;
let jobId: string;
let pool: Pool;

describe('Job Lifecycle - Post to Completion', () => {
  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Verify database connectivity
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    expect(result.rows.length).toBeGreaterThan(0);
    client.release();

    // Get admin token
    const adminResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: process.env.ADMIN_EMAIL || 'admin@jobportal.com',
      password: process.env.ADMIN_PASSWORD || 'AdminPass123!',
    });
    adminToken = adminResponse.data.token;
  });

  afterAll(async () => {
    const client = await pool.connect();
    if (jobId) await client.query('DELETE FROM jobs WHERE id = $1', [jobId]);
    client.release();
    await pool.end();
  });

  test('Step 1: Employer registers', async () => {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, {
      firstName: 'Job',
      lastName: 'Poster',
      email: `jobposter-${Date.now()}@test.com`,
      password: 'SecurePass123!',
      role: 'employer',
      companyName: 'Job Posting Company',
    });

    expect(response.status).toBe(201);
    expect(response.data.token).toBeDefined();
    employerToken = response.data.token;
  });

  test('Step 2: Candidate registers', async () => {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, {
      firstName: 'Job',
      lastName: 'Seeker',
      email: `jobseeker-${Date.now()}@test.com`,
      password: 'SecurePass123!',
      role: 'candidate',
    });

    expect(response.status).toBe(201);
    candidateToken = response.data.token;
  });

  test('Step 3: Employer posts a job', async () => {
    const response = await axios.post(
      `${API_BASE_URL}/jobs`,
      {
        title: 'Full Stack Developer',
        description: 'We are looking for an experienced full stack developer',
        location: 'San Francisco, CA',
        salary: { min: 100000, max: 150000 },
        category: 'IT',
        jobType: 'Full-time',
        experienceLevel: 'Senior',
        skills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL'],
        benefits: 'Health insurance, 401k, Remote work available',
      },
      { headers: { Authorization: `Bearer ${employerToken}` } }
    );

    expect(response.status).toBe(201);
    expect(response.data.job.id).toBeDefined();
    expect(response.data.job.status).toBe('pending');
    jobId = response.data.job.id;
  });

  test('Step 4: Job appears in admin pending queue', async () => {
    const response = await axios.get(
      `${API_BASE_URL}/admin/jobs/pending`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    expect(response.status).toBe(200);
    const job = response.data.jobs.find((j: any) => j.id === jobId);
    expect(job).toBeDefined();
    expect(job.status).toBe('pending');
  });

  test('Step 5: Candidate cannot see unapproved job', async () => {
    const response = await axios.get(
      `${API_BASE_URL}/jobs?search=Full+Stack`,
      { headers: { Authorization: `Bearer ${candidateToken}` } }
    );

    expect(response.status).toBe(200);
    const job = response.data.jobs.find((j: any) => j.id === jobId);
    expect(job).toBeUndefined(); // Should not appear in candidate search
  });

  test('Step 6: Admin approves the job', async () => {
    const response = await axios.put(
      `${API_BASE_URL}/admin/jobs/${jobId}/approve`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    expect(response.status).toBe(200);
    expect(response.data.status).toBe('approved');
    expect(response.data.approvedAt).toBeDefined();
  });

  test('Step 7: Job appears in candidate search after approval', async () => {
    const response = await axios.get(
      `${API_BASE_URL}/jobs?search=Full+Stack`,
      { headers: { Authorization: `Bearer ${candidateToken}` } }
    );

    expect(response.status).toBe(200);
    const job = response.data.jobs.find((j: any) => j.id === jobId);
    expect(job).toBeDefined();
    expect(job.status).toBe('approved');
  });

  test('Step 8: Candidate can view full job details', async () => {
    const response = await axios.get(
      `${API_BASE_URL}/jobs/${jobId}`,
      { headers: { Authorization: `Bearer ${candidateToken}` } }
    );

    expect(response.status).toBe(200);
    expect(response.data.job.title).toBe('Full Stack Developer');
    expect(response.data.job.salary.min).toBe(100000);
    expect(Array.isArray(response.data.job.skills)).toBe(true);
  });

  test('Step 9: Candidate can save the job', async () => {
    const response = await axios.post(
      `${API_BASE_URL}/jobs/${jobId}/save`,
      {},
      { headers: { Authorization: `Bearer ${candidateToken}` } }
    );

    expect(response.status).toBe(200);
    expect(response.data.saved).toBe(true);
  });

  test('Step 10: Job appears in candidate saved jobs', async () => {
    const response = await axios.get(
      `${API_BASE_URL}/jobs/saved`,
      { headers: { Authorization: `Bearer ${candidateToken}` } }
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data.jobs)).toBe(true);
    const job = response.data.jobs.find((j: any) => j.id === jobId);
    expect(job).toBeDefined();
  });

  test('Step 11: Candidate can unsave the job', async () => {
    const response = await axios.delete(
      `${API_BASE_URL}/jobs/${jobId}/save`,
      { headers: { Authorization: `Bearer ${candidateToken}` } }
    );

    expect(response.status).toBe(200);
    expect(response.data.saved).toBe(false);
  });

  test('Step 12: Candidate applies for the job', async () => {
    const response = await axios.post(
      `${API_BASE_URL}/applications`,
      {
        jobId,
        resume: 'resume.pdf',
        coverLetter: 'I am very interested in this role',
      },
      { headers: { Authorization: `Bearer ${candidateToken}` } }
    );

    expect(response.status).toBe(201);
    expect(response.data.application.status).toBe('pending');
  });

  test('Step 13: Job shows application count', async () => {
    const response = await axios.get(
      `${API_BASE_URL}/jobs/${jobId}`,
      { headers: { Authorization: `Bearer ${candidateToken}` } }
    );

    expect(response.status).toBe(200);
    expect(response.data.job.applicantCount).toBeGreaterThan(0);
  });

  test('Step 14: Employer can view job applications', async () => {
    const response = await axios.get(
      `${API_BASE_URL}/jobs/${jobId}/applications`,
      { headers: { Authorization: `Bearer ${employerToken}` } }
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data.applications)).toBe(true);
    expect(response.data.applications.length).toBeGreaterThan(0);
  });

  test('Step 15: Employer can edit job details', async () => {
    const response = await axios.put(
      `${API_BASE_URL}/jobs/${jobId}`,
      {
        salary: { min: 110000, max: 160000 }, // Updated salary
        description: 'Updated job description',
      },
      { headers: { Authorization: `Bearer ${employerToken}` } }
    );

    expect(response.status).toBe(200);
    expect(response.data.job.salary.min).toBe(110000);
  });

  test('Step 16: Job can be marked as closed/filled', async () => {
    const response = await axios.put(
      `${API_BASE_URL}/jobs/${jobId}/close`,
      {},
      { headers: { Authorization: `Bearer ${employerToken}` } }
    );

    expect(response.status).toBe(200);
    expect(response.data.status).toBe('closed');
  });

  test('Step 17: Closed job no longer appears in candidate search', async () => {
    const response = await axios.get(
      `${API_BASE_URL}/jobs?search=Full+Stack`,
      { headers: { Authorization: `Bearer ${candidateToken}` } }
    );

    expect(response.status).toBe(200);
    const job = response.data.jobs.find((j: any) => j.id === jobId);
    expect(job).toBeUndefined(); // Closed job should not appear
  });

  test('Step 18: Employer can reopen closed job', async () => {
    const response = await axios.put(
      `${API_BASE_URL}/jobs/${jobId}/reopen`,
      {},
      { headers: { Authorization: `Bearer ${employerToken}` } }
    );

    expect(response.status).toBe(200);
    expect(response.data.status).toBe('approved');
  });

  test('Step 19: Job appears in search again after reopen', async () => {
    const response = await axios.get(
      `${API_BASE_URL}/jobs?search=Full+Stack`,
      { headers: { Authorization: `Bearer ${candidateToken}` } }
    );

    expect(response.status).toBe(200);
    const job = response.data.jobs.find((j: any) => j.id === jobId);
    expect(job).toBeDefined();
  });

  test('Step 20: Job statistics are correctly calculated', async () => {
    const response = await axios.get(
      `${API_BASE_URL}/jobs/${jobId}/statistics`,
      { headers: { Authorization: `Bearer ${employerToken}` } }
    );

    expect(response.status).toBe(200);
    expect(response.data.totalApplications).toBeDefined();
    expect(response.data.applicationsToday).toBeDefined();
    expect(response.data.views).toBeDefined();
  });

  test('Step 21: Job expiration is handled', async () => {
    // Create a job with immediate expiration for testing
    const jobResponse = await axios.post(
      `${API_BASE_URL}/jobs`,
      {
        title: 'Temporary Position',
        description: 'A job that will expire soon',
        location: 'Remote',
        salary: { min: 50000, max: 70000 },
        category: 'IT',
        jobType: 'Contract',
        experienceLevel: 'Junior',
        expiryDate: new Date(Date.now() + 1000).toISOString(), // 1 second from now
      },
      { headers: { Authorization: `Bearer ${employerToken}` } }
    );

    const tempJobId = jobResponse.data.job.id;

    // Approve it
    await axios.put(
      `${API_BASE_URL}/admin/jobs/${tempJobId}/approve`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    // Wait a bit and verify it expires
    await new Promise(resolve => setTimeout(resolve, 2000));

    const expiredResponse = await axios.get(
      `${API_BASE_URL}/jobs/${tempJobId}`,
      { headers: { Authorization: `Bearer ${candidateToken}` } }
    );

    expect(expiredResponse.status).toBe(200);
    expect(expiredResponse.data.job.status).toBe('expired');
  });

  test('Step 22: Job filter by category works', async () => {
    const response = await axios.get(
      `${API_BASE_URL}/jobs?category=IT`,
      { headers: { Authorization: `Bearer ${candidateToken}` } }
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data.jobs)).toBe(true);
    response.data.jobs.forEach((job: any) => {
      expect(job.category).toBe('IT');
    });
  });

  test('Step 23: Job filter by salary range works', async () => {
    const response = await axios.get(
      `${API_BASE_URL}/jobs?salaryMin=100000&salaryMax=150000`,
      { headers: { Authorization: `Bearer ${candidateToken}` } }
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data.jobs)).toBe(true);
    response.data.jobs.forEach((job: any) => {
      expect(job.salary.min).toBeGreaterThanOrEqual(100000);
      expect(job.salary.max).toBeLessThanOrEqual(150000);
    });
  });

  test('Step 24: Job pagination works correctly', async () => {
    const page1Response = await axios.get(
      `${API_BASE_URL}/jobs?limit=5&offset=0`,
      { headers: { Authorization: `Bearer ${candidateToken}` } }
    );

    expect(page1Response.status).toBe(200);
    expect(page1Response.data.jobs.length).toBeLessThanOrEqual(5);
    expect(page1Response.data.total).toBeDefined();
    expect(page1Response.data.page).toBe(1);
  });
});
