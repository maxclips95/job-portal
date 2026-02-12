/**
 * Admin Workflow Integration Tests
 * Tests admin operations: Approve Jobs → Verify Companies → Manage Users
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import { Pool } from 'pg';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api';
let adminToken: string;
let employerToken: string;
let jobId: string;
let userId: string;
let companyId: string;
let pool: Pool;

describe('Admin Workflow - Complete Management', () => {
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
    
    // Cleanup test data
    if (jobId) await client.query('DELETE FROM jobs WHERE id = $1', [jobId]);
    if (userId) await client.query('DELETE FROM users WHERE id = $1', [userId]);
    if (companyId) await client.query('DELETE FROM companies WHERE id = $1', [companyId]);
    
    client.release();
    await pool.end();
  });

  test('Step 1: Admin can view dashboard statistics', async () => {
    const response = await axios.get(
      `${API_BASE_URL}/admin/dashboard`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    expect(response.status).toBe(200);
    expect(response.data.totalUsers).toBeDefined();
    expect(response.data.totalJobs).toBeDefined();
    expect(response.data.totalApplications).toBeDefined();
    expect(response.data.activeUsers).toBeDefined();
    expect(response.data.pendingApprovals).toBeDefined();
  });

  test('Step 2: Admin retrieves pending jobs for approval', async () => {
    const response = await axios.get(
      `${API_BASE_URL}/admin/jobs/pending`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data.jobs)).toBe(true);
  });

  test('Step 3: Employer posts a job and it appears in pending queue', async () => {
    // Register employer
    const regResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
      firstName: 'Admin',
      lastName: 'Test',
      email: `admin-test-${Date.now()}@test.com`,
      password: 'SecurePass123!',
      role: 'employer',
      companyName: 'Admin Test Company',
    });

    employerToken = regResponse.data.token;

    // Post job
    const jobResponse = await axios.post(
      `${API_BASE_URL}/jobs`,
      {
        title: 'Test Job for Admin Approval',
        description: 'This job needs admin approval',
        location: 'Remote',
        salary: { min: 70000, max: 110000 },
        category: 'IT',
        jobType: 'Full-time',
        experienceLevel: 'Senior',
      },
      { headers: { Authorization: `Bearer ${employerToken}` } }
    );

    expect(jobResponse.status).toBe(201);
    jobId = jobResponse.data.job.id;

    // Verify job is pending
    const pendingResponse = await axios.get(
      `${API_BASE_URL}/admin/jobs/pending`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const jobInQueue = pendingResponse.data.jobs.find((j: any) => j.id === jobId);
    expect(jobInQueue).toBeDefined();
  });

  test('Step 4: Admin approves the pending job', async () => {
    const response = await axios.put(
      `${API_BASE_URL}/admin/jobs/${jobId}/approve`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    expect(response.status).toBe(200);
    expect(response.data.status).toBe('approved');
  });

  test('Step 5: Approved job is no longer in pending queue', async () => {
    const response = await axios.get(
      `${API_BASE_URL}/admin/jobs/pending`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const jobInQueue = response.data.jobs.find((j: any) => j.id === jobId);
    expect(jobInQueue).toBeUndefined();
  });

  test('Step 6: Admin can reject a job with reason', async () => {
    // Create another job to reject
    const jobResponse = await axios.post(
      `${API_BASE_URL}/jobs`,
      {
        title: 'Job to be Rejected',
        description: 'This job will be rejected',
        location: 'New York',
        salary: { min: 50000, max: 80000 },
        category: 'IT',
        jobType: 'Part-time',
        experienceLevel: 'Junior',
      },
      { headers: { Authorization: `Bearer ${employerToken}` } }
    );

    const rejectJobId = jobResponse.data.job.id;

    const response = await axios.put(
      `${API_BASE_URL}/admin/jobs/${rejectJobId}/reject`,
      { reason: 'Job description violates company policy' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    expect(response.status).toBe(200);
    expect(response.data.status).toBe('rejected');
    expect(response.data.rejectionReason).toBe('Job description violates company policy');
  });

  test('Step 7: Admin can list all users with filters', async () => {
    const response = await axios.get(
      `${API_BASE_URL}/admin/users?role=employer&status=active`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data.users)).toBe(true);
    response.data.users.forEach((user: any) => {
      expect(user.role).toBe('employer');
      expect(user.status).toBe('active');
    });
  });

  test('Step 8: Admin can update user status', async () => {
    // Create a test user
    const userResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
      firstName: 'Status',
      lastName: 'Test',
      email: `status-test-${Date.now()}@test.com`,
      password: 'SecurePass123!',
      role: 'candidate',
    });

    userId = userResponse.data.user.id;

    // Suspend user
    const suspendResponse = await axios.put(
      `${API_BASE_URL}/admin/users/${userId}/status`,
      { status: 'suspended' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    expect(suspendResponse.status).toBe(200);
    expect(suspendResponse.data.status).toBe('suspended');

    // Verify suspension
    const getResponse = await axios.get(
      `${API_BASE_URL}/admin/users/${userId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    expect(getResponse.data.user.status).toBe('suspended');
  });

  test('Step 9: Admin can update user role', async () => {
    const response = await axios.put(
      `${API_BASE_URL}/admin/users/${userId}/role`,
      { role: 'employer' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    expect(response.status).toBe(200);
    expect(response.data.role).toBe('employer');
  });

  test('Step 10: Admin can view company verification queue', async () => {
    const response = await axios.get(
      `${API_BASE_URL}/admin/companies/pending`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data.companies)).toBe(true);
  });

  test('Step 11: Admin can verify a company', async () => {
    // Assume there's a pending company (created during employer registration)
    const pendingResponse = await axios.get(
      `${API_BASE_URL}/admin/companies/pending`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (pendingResponse.data.companies.length > 0) {
      const company = pendingResponse.data.companies[0];
      companyId = company.id;

      const response = await axios.put(
        `${API_BASE_URL}/admin/companies/${companyId}/verify`,
        {},
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      expect(response.status).toBe(200);
      expect(response.data.status).toBe('verified');
    }
  });

  test('Step 12: Admin can reject a company with reason', async () => {
    // Get another pending company if available
    const pendingResponse = await axios.get(
      `${API_BASE_URL}/admin/companies/pending`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (pendingResponse.data.companies.length > 0) {
      const company = pendingResponse.data.companies[0];

      const response = await axios.put(
        `${API_BASE_URL}/admin/companies/${company.id}/reject`,
        { reason: 'Invalid business documentation' },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      expect(response.status).toBe(200);
      expect(response.data.status).toBe('rejected');
    }
  });

  test('Step 13: Admin can view job analytics', async () => {
    const response = await axios.get(
      `${API_BASE_URL}/admin/analytics/jobs`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    expect(response.status).toBe(200);
    expect(response.data.total).toBeDefined();
    expect(response.data.approved).toBeDefined();
    expect(response.data.pending).toBeDefined();
    expect(response.data.rejected).toBeDefined();
    expect(response.data.active).toBeDefined();
  });

  test('Step 14: Admin can view user analytics', async () => {
    const response = await axios.get(
      `${API_BASE_URL}/admin/analytics/users`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    expect(response.status).toBe(200);
    expect(response.data.totalCandidates).toBeDefined();
    expect(response.data.totalEmployers).toBeDefined();
    expect(response.data.activeToday).toBeDefined();
    expect(response.data.newThisMonth).toBeDefined();
  });

  test('Step 15: Admin can retrieve system settings', async () => {
    const response = await axios.get(
      `${API_BASE_URL}/admin/settings`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    expect(response.status).toBe(200);
    expect(response.data.siteName).toBeDefined();
    expect(response.data.maxJobsPerDay).toBeDefined();
  });

  test('Step 16: Admin can update system settings', async () => {
    const response = await axios.put(
      `${API_BASE_URL}/admin/settings`,
      {
        siteName: 'Updated Job Portal',
        maxJobsPerDay: 15,
        maintenanceMode: false,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    expect(response.status).toBe(200);
    expect(response.data.siteName).toBe('Updated Job Portal');
  });

  test('Step 17: Admin can view email templates', async () => {
    const response = await axios.get(
      `${API_BASE_URL}/admin/email-templates`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data.templates)).toBe(true);
    expect(response.data.templates.length).toBeGreaterThan(0);
  });

  test('Step 18: Admin can update email templates', async () => {
    const templatesResponse = await axios.get(
      `${API_BASE_URL}/admin/email-templates`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const template = templatesResponse.data.templates[0];

    const response = await axios.put(
      `${API_BASE_URL}/admin/email-templates/${template.id}`,
      {
        subject: 'Updated Subject',
        content: 'Updated email content {{name}}',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    expect(response.status).toBe(200);
    expect(response.data.subject).toBe('Updated Subject');
  });

  test('Step 19: Admin can view activity logs', async () => {
    const response = await axios.get(
      `${API_BASE_URL}/admin/activity-logs?limit=10&offset=0`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data.logs)).toBe(true);
  });

  test('Step 20: Admin cannot delete last admin user', async () => {
    // Get current admin (there should be at least one)
    const usersResponse = await axios.get(
      `${API_BASE_URL}/admin/users?role=admin`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (usersResponse.data.users.length === 1) {
      const adminUserId = usersResponse.data.users[0].id;

      const response = await axios.delete(
        `${API_BASE_URL}/admin/users/${adminUserId}`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      expect(response.status).toBe(400);
      expect(response.data.message).toContain('last admin');
    }
  });
});
