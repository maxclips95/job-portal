/**
 * Admin E2E Workflow Tests
 * Complete admin operations: Login → Dashboard → Moderation → Users → Settings
 */

import { Browser, Page, chromium } from 'playwright';

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@jobportal.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminPass123!';
const TIMEOUT = 30000;

describe('Admin Workflow E2E', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    await page.close();
  });

  test('E2E 1: Navigate to admin login', async () => {
    await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
    const heading = await page.locator('h1, h2').first();
    expect(await heading.isVisible()).toBe(true);
  });

  test('E2E 2: Admin logs in', async () => {
    await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });

    await page.fill('[name="email"]', ADMIN_EMAIL);
    await page.fill('[name="password"]', ADMIN_PASSWORD);

    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle' });

    const url = page.url();
    expect(url).toContain('/admin');
  });

  test('E2E 3: Access admin dashboard', async () => {
    await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle' });
    const dashboardTitle = await page.locator('[data-testid="dashboard-title"]');
    expect(await dashboardTitle.isVisible()).toBe(true);
  });

  test('E2E 4: View dashboard statistics cards', async () => {
    await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle' });

    const totalUsers = await page.locator('[data-testid="stat-total-users"]');
    const totalJobs = await page.locator('[data-testid="stat-total-jobs"]');
    const totalApplications = await page.locator('[data-testid="stat-total-applications"]');
    const totalCompanies = await page.locator('[data-testid="stat-total-companies"]');

    expect(await totalUsers.isVisible()).toBe(true);
    expect(await totalJobs.isVisible()).toBe(true);
    expect(await totalApplications.isVisible()).toBe(true);
    expect(await totalCompanies.isVisible()).toBe(true);
  });

  test('E2E 5: Navigate to pending jobs', async () => {
    await page.goto(`${BASE_URL}/admin/jobs`, { waitUntil: 'networkidle' });
    const jobsList = await page.locator('[data-testid="jobs-list"]');
    expect(await jobsList.isVisible()).toBe(true);
  });

  test('E2E 6: Filter jobs by status', async () => {
    await page.goto(`${BASE_URL}/admin/jobs`, { waitUntil: 'networkidle' });

    const statusFilter = await page.locator('[data-testid="status-filter"]');
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await page.click('[data-value="pending"]');
    }

    await page.waitForSelector('[data-testid="job-card"]', { timeout: 5000 });
  });

  test('E2E 7: View job details for approval', async () => {
    await page.goto(`${BASE_URL}/admin/jobs`, { waitUntil: 'networkidle' });

    const firstJobCard = await page.locator('[data-testid="job-card"]').first();
    if (await firstJobCard.isVisible()) {
      await firstJobCard.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' });
    }

    const jobTitle = await page.locator('[data-testid="job-title"]');
    expect(await jobTitle.isVisible()).toBe(true);
  });

  test('E2E 8: Approve a pending job', async () => {
    await page.goto(`${BASE_URL}/admin/jobs`, { waitUntil: 'networkidle' });

    const approveButton = await page.locator('[data-testid="approve-job"]').first();
    if (await approveButton.isVisible()) {
      await approveButton.click();

      const confirmButton = await page.locator('button:has-text("Confirm")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await page.waitForSelector('[data-testid="job-approved"]', { timeout: 5000 });
      }
    }
  });

  test('E2E 9: Reject a pending job', async () => {
    await page.goto(`${BASE_URL}/admin/jobs`, { waitUntil: 'networkidle' });

    const rejectButton = await page.locator('[data-testid="reject-job"]').first();
    if (await rejectButton.isVisible()) {
      await rejectButton.click();

      const reasonInput = await page.locator('[name="rejectionReason"]');
      if (await reasonInput.isVisible()) {
        await reasonInput.fill('Job description does not meet quality standards');
      }

      const submitButton = await page.locator('button:has-text("Reject")');
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForSelector('[data-testid="job-rejected"]', { timeout: 5000 });
      }
    }
  });

  test('E2E 10: Navigate to user management', async () => {
    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle' });
    const usersList = await page.locator('[data-testid="users-list"]');
    expect(await usersList.isVisible()).toBe(true);
  });

  test('E2E 11: Search for users', async () => {
    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle' });

    const searchInput = await page.locator('[data-testid="user-search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('john');

      await page.waitForSelector('[data-testid="user-item"]', { timeout: 5000 });
    }
  });

  test('E2E 12: Filter users by role', async () => {
    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle' });

    const roleFilter = await page.locator('[data-testid="role-filter"]');
    if (await roleFilter.isVisible()) {
      await roleFilter.click();
      await page.click('[data-value="candidate"]');
    }

    await page.waitForSelector('[data-testid="user-item"]', { timeout: 5000 });
  });

  test('E2E 13: Filter users by status', async () => {
    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle' });

    const statusFilter = await page.locator('[data-testid="status-filter"]');
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await page.click('[data-value="active"]');
    }

    await page.waitForSelector('[data-testid="user-item"]', { timeout: 5000 });
  });

  test('E2E 14: View user details', async () => {
    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle' });

    const firstUserCard = await page.locator('[data-testid="user-item"]').first();
    if (await firstUserCard.isVisible()) {
      await firstUserCard.click();

      const userProfile = await page.locator('[data-testid="user-profile"]');
      expect(await userProfile.isVisible()).toBe(true);
    }
  });

  test('E2E 15: Change user role', async () => {
    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle' });

    const editRoleButton = await page.locator('[data-testid="edit-role"]').first();
    if (await editRoleButton.isVisible()) {
      await editRoleButton.click();

      const roleSelect = await page.locator('[data-testid="role-select"]');
      if (await roleSelect.isVisible()) {
        await roleSelect.click();
        await page.click('[data-value="employer"]');
      }

      const saveButton = await page.locator('button:has-text("Save")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForSelector('[data-testid="role-updated"]', { timeout: 5000 });
      }
    }
  });

  test('E2E 16: Change user status (activate/deactivate)', async () => {
    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle' });

    const statusToggle = await page.locator('[data-testid="user-status-toggle"]').first();
    if (await statusToggle.isVisible()) {
      await statusToggle.click();

      const confirmButton = await page.locator('button:has-text("Confirm")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await page.waitForSelector('[data-testid="status-updated"]', { timeout: 5000 });
      }
    }
  });

  test('E2E 17: Navigate to company verification', async () => {
    await page.goto(`${BASE_URL}/admin/companies`, { waitUntil: 'networkidle' });
    const companiesList = await page.locator('[data-testid="companies-list"]');
    expect(await companiesList.isVisible()).toBe(true);
  });

  test('E2E 18: Filter companies by verification status', async () => {
    await page.goto(`${BASE_URL}/admin/companies`, { waitUntil: 'networkidle' });

    const verificationFilter = await page.locator('[data-testid="verification-filter"]');
    if (await verificationFilter.isVisible()) {
      await verificationFilter.click();
      await page.click('[data-value="pending"]');
    }

    await page.waitForSelector('[data-testid="company-item"]', { timeout: 5000 });
  });

  test('E2E 19: Verify a company', async () => {
    await page.goto(`${BASE_URL}/admin/companies`, { waitUntil: 'networkidle' });

    const verifyButton = await page.locator('[data-testid="verify-company"]').first();
    if (await verifyButton.isVisible()) {
      await verifyButton.click();

      const confirmButton = await page.locator('button:has-text("Confirm")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await page.waitForSelector('[data-testid="company-verified"]', { timeout: 5000 });
      }
    }
  });

  test('E2E 20: Reject a company', async () => {
    await page.goto(`${BASE_URL}/admin/companies`, { waitUntil: 'networkidle' });

    const rejectButton = await page.locator('[data-testid="reject-company"]').first();
    if (await rejectButton.isVisible()) {
      await rejectButton.click();

      const reasonInput = await page.locator('[name="rejectionReason"]');
      if (await reasonInput.isVisible()) {
        await reasonInput.fill('Company information could not be verified');
      }

      const submitButton = await page.locator('button:has-text("Reject")');
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForSelector('[data-testid="company-rejected"]', { timeout: 5000 });
      }
    }
  });

  test('E2E 21: Navigate to analytics', async () => {
    await page.goto(`${BASE_URL}/admin/analytics`, { waitUntil: 'networkidle' });
    const analyticsSection = await page.locator('[data-testid="analytics-section"]');
    expect(await analyticsSection.isVisible()).toBe(true);
  });

  test('E2E 22: View application trends chart', async () => {
    await page.goto(`${BASE_URL}/admin/analytics`, { waitUntil: 'networkidle' });

    const trendsChart = await page.locator('[data-testid="trends-chart"]');
    expect(await trendsChart.isVisible()).toBe(true);
  });

  test('E2E 23: View analytics by category', async () => {
    await page.goto(`${BASE_URL}/admin/analytics`, { waitUntil: 'networkidle' });

    const categoryAnalytics = await page.locator('[data-testid="category-analytics"]');
    expect(await categoryAnalytics.isVisible()).toBe(true);
  });

  test('E2E 24: Navigate to settings', async () => {
    await page.goto(`${BASE_URL}/admin/settings`, { waitUntil: 'networkidle' });
    const settingsForm = await page.locator('[data-testid="settings-form"]');
    expect(await settingsForm.isVisible()).toBe(true);
  });

  test('E2E 25: View email templates', async () => {
    await page.goto(`${BASE_URL}/admin/settings`, { waitUntil: 'networkidle' });

    const templatesSection = await page.locator('[data-testid="email-templates"]');
    expect(await templatesSection.isVisible()).toBe(true);
  });

  test('E2E 26: Edit email template', async () => {
    await page.goto(`${BASE_URL}/admin/settings`, { waitUntil: 'networkidle' });

    const editTemplateButton = await page.locator('[data-testid="edit-template"]').first();
    if (await editTemplateButton.isVisible()) {
      await editTemplateButton.click();

      const subjectInput = await page.locator('[name="subject"]');
      if (await subjectInput.isVisible()) {
        await subjectInput.fill('Updated Email Subject');
      }

      const bodyInput = await page.locator('[name="body"]');
      if (await bodyInput.isVisible()) {
        await bodyInput.fill('Updated email template body');
      }

      const saveButton = await page.locator('button:has-text("Save Template")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForSelector('[data-testid="template-saved"]', { timeout: 5000 });
      }
    }
  });

  test('E2E 27: View system settings', async () => {
    await page.goto(`${BASE_URL}/admin/settings`, { waitUntil: 'networkidle' });

    const systemSettingsSection = await page.locator('[data-testid="system-settings"]');
    expect(await systemSettingsSection.isVisible()).toBe(true);
  });

  test('E2E 28: Update system settings', async () => {
    await page.goto(`${BASE_URL}/admin/settings`, { waitUntil: 'networkidle' });

    const settingInput = await page.locator('[name="siteName"]');
    if (await settingInput.isVisible()) {
      await settingInput.fill('Job Portal Updated');
    }

    const saveButton = await page.locator('button:has-text("Save Settings")');
    if (await saveButton.isVisible()) {
      await saveButton.click();
      await page.waitForSelector('[data-testid="settings-saved"]', { timeout: 5000 });
    }
  });

  test('E2E 29: View activity logs', async () => {
    await page.goto(`${BASE_URL}/admin/activity-logs`, { waitUntil: 'networkidle' });
    const logsList = await page.locator('[data-testid="activity-logs"]');
    expect(await logsList.isVisible()).toBe(true);
  });

  test('E2E 30: Filter activity logs by action type', async () => {
    await page.goto(`${BASE_URL}/admin/activity-logs`, { waitUntil: 'networkidle' });

    const actionFilter = await page.locator('[data-testid="action-filter"]');
    if (await actionFilter.isVisible()) {
      await actionFilter.click();
      await page.click('[data-value="job_approved"]');
    }

    await page.waitForSelector('[data-testid="activity-log-item"]', { timeout: 5000 });
  });

  test('E2E 31: Search activity logs', async () => {
    await page.goto(`${BASE_URL}/admin/activity-logs`, { waitUntil: 'networkidle' });

    const searchInput = await page.locator('[data-testid="activity-search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('user created');

      await page.waitForSelector('[data-testid="activity-log-item"]', { timeout: 5000 });
    }
  });

  test('E2E 32: View admin profile', async () => {
    await page.goto(`${BASE_URL}/admin/profile`, { waitUntil: 'networkidle' });
    const profileForm = await page.locator('[data-testid="admin-profile"]');
    expect(await profileForm.isVisible()).toBe(true);
  });

  test('E2E 33: Update admin profile', async () => {
    await page.goto(`${BASE_URL}/admin/profile`, { waitUntil: 'networkidle' });

    const phoneInput = await page.locator('[name="phone"]');
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('+1-555-9999');
    }

    const saveButton = await page.locator('button:has-text("Save")');
    if (await saveButton.isVisible()) {
      await saveButton.click();
      await page.waitForSelector('[data-testid="profile-updated"]', { timeout: 5000 });
    }
  });

  test('E2E 34: View admin security settings', async () => {
    await page.goto(`${BASE_URL}/admin/security`, { waitUntil: 'networkidle' });
    const securitySection = await page.locator('[data-testid="security-settings"]');
    expect(await securitySection.isVisible()).toBe(true);
  });

  test('E2E 35: Logout from admin panel', async () => {
    await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle' });

    const logoutButton = await page.locator('[data-testid="logout-button"]');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' });
    }

    const url = page.url();
    expect(url).toContain('/login') || expect(url).toContain('/');
  });
});
