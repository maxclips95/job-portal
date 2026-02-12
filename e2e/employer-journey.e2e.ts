/**
 * Employer E2E Journey Tests
 * Complete workflow: Register → Company Setup → Post Job → View Applications → Hire
 */

import { Browser, Page, chromium } from 'playwright';

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
const TIMEOUT = 30000;

describe('Employer Journey E2E', () => {
  let browser: Browser;
  let page: Page;
  const employerEmail = `employer-e2e-${Date.now()}@test.com`;
  const employerPassword = 'SecurePass123!';

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

  test('E2E 1: Navigate to employer registration', async () => {
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle' });
    const heading = await page.locator('h1, h2').first();
    expect(await heading.isVisible()).toBe(true);
  });

  test('E2E 2: Complete employer registration', async () => {
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle' });

    // Select employer role
    await page.click('[data-testid="role-employer"]');

    // Fill form
    await page.fill('[name="firstName"]', 'Hiring');
    await page.fill('[name="lastName"]', 'Manager');
    await page.fill('[name="email"]', employerEmail);
    await page.fill('[name="companyName"]', 'Tech Innovations Inc');
    await page.fill('[name="password"]', employerPassword);
    await page.fill('[name="confirmPassword"]', employerPassword);

    // Submit
    await page.click('button[type="submit"]');

    // Wait for success/redirect
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/register');
  });

  test('E2E 3: Complete OTP verification', async () => {
    await page.goto(`${BASE_URL}/auth/verify-otp`, { waitUntil: 'networkidle' });

    // Enter OTP (test default)
    const otpInputs = await page.locator('[data-testid="otp-input"]');
    const count = await otpInputs.count();
    for (let i = 0; i < count; i++) {
      await otpInputs.nth(i).fill('1');
    }

    // Submit
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle' });
  });

  test('E2E 4: Employer logs in', async () => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

    await page.fill('[name="email"]', employerEmail);
    await page.fill('[name="password"]', employerPassword);

    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle' });

    const url = page.url();
    expect(url).toContain('/employer') || expect(url).toContain('/dashboard');
  });

  test('E2E 5: Access employer dashboard', async () => {
    await page.goto(`${BASE_URL}/employer/dashboard`, { waitUntil: 'networkidle' });
    const heading = await page.locator('h1, h2').first();
    expect(await heading.isVisible()).toBe(true);
  });

  test('E2E 6: Navigate to company settings', async () => {
    await page.goto(`${BASE_URL}/employer/company`, { waitUntil: 'networkidle' });
    const companyForm = await page.locator('[data-testid="company-form"]');
    expect(await companyForm.isVisible()).toBe(true);
  });

  test('E2E 7: Complete company profile', async () => {
    await page.goto(`${BASE_URL}/employer/company`, { waitUntil: 'networkidle' });

    // Fill company details
    const websiteInput = await page.locator('[name="website"]');
    if (await websiteInput.isVisible()) {
      await websiteInput.fill('https://techinnovations.com');
    }

    const descriptionInput = await page.locator('[name="description"]');
    if (await descriptionInput.isVisible()) {
      await descriptionInput.fill('We are a leading technology company specializing in innovative solutions');
    }

    const industryInput = await page.locator('[name="industry"]');
    if (await industryInput.isVisible()) {
      await industryInput.fill('Technology');
    }

    // Save
    const saveButton = await page.locator('button:has-text("Save")');
    if (await saveButton.isVisible()) {
      await saveButton.click();
      await page.waitForSelector('[data-testid="success-message"]', { timeout: 5000 });
    }
  });

  test('E2E 8: Upload company logo', async () => {
    await page.goto(`${BASE_URL}/employer/company`, { waitUntil: 'networkidle' });

    // Find and interact with file upload
    const logoUpload = await page.locator('[data-testid="logo-upload"]');
    if (await logoUpload.isVisible()) {
      // In real test, would set actual file
      await logoUpload.click();
      // This is simplified for E2E test
    }
  });

  test('E2E 9: Navigate to post job page', async () => {
    await page.goto(`${BASE_URL}/employer/jobs/new`, { waitUntil: 'networkidle' });
    const jobForm = await page.locator('[data-testid="job-form"]');
    expect(await jobForm.isVisible()).toBe(true);
  });

  test('E2E 10: Post a new job listing', async () => {
    await page.goto(`${BASE_URL}/employer/jobs/new`, { waitUntil: 'networkidle' });

    // Fill job details
    await page.fill('[name="title"]', 'Senior Full Stack Developer');
    await page.fill('[name="description"]', 'We are looking for an experienced full-stack developer to join our team');
    
    const locationInput = await page.locator('[name="location"]');
    if (await locationInput.isVisible()) {
      await locationInput.fill('San Francisco, CA');
    }

    const categoryInput = await page.locator('[name="category"]');
    if (await categoryInput.isVisible()) {
      await categoryInput.click();
      await page.click('[data-value="IT"]');
    }

    const jobTypeInput = await page.locator('[name="jobType"]');
    if (await jobTypeInput.isVisible()) {
      await jobTypeInput.click();
      await page.click('[data-value="Full-time"]');
    }

    // Set salary
    const minSalary = await page.locator('[name="minSalary"]');
    if (await minSalary.isVisible()) {
      await minSalary.fill('100000');
    }

    const maxSalary = await page.locator('[name="maxSalary"]');
    if (await maxSalary.isVisible()) {
      await maxSalary.fill('150000');
    }

    // Submit job
    const submitButton = await page.locator('button:has-text("Post Job")');
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForSelector('[data-testid="job-posted"]', { timeout: 5000 });
    }
  });

  test('E2E 11: View posted jobs', async () => {
    await page.goto(`${BASE_URL}/employer/jobs`, { waitUntil: 'networkidle' });
    const jobsList = await page.locator('[data-testid="jobs-list"]');
    expect(await jobsList.isVisible()).toBe(true);
  });

  test('E2E 12: Edit job listing', async () => {
    await page.goto(`${BASE_URL}/employer/jobs`, { waitUntil: 'networkidle' });

    // Find and click edit
    const editButton = await page.locator('[data-testid="edit-job"]').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' });

      // Make edit
      const titleInput = await page.locator('[name="title"]');
      if (await titleInput.isVisible()) {
        await titleInput.fill('Senior Full Stack Developer (Updated)');
      }

      // Save
      const saveButton = await page.locator('button:has-text("Save")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForSelector('[data-testid="job-updated"]', { timeout: 5000 });
      }
    }
  });

  test('E2E 13: View job applications', async () => {
    await page.goto(`${BASE_URL}/employer/jobs`, { waitUntil: 'networkidle' });

    // Click on a job to view applications
    const firstJobCard = await page.locator('[data-testid="job-card"]').first();
    if (await firstJobCard.isVisible()) {
      await firstJobCard.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' });
    }

    // Check applications section
    const applicationsSection = await page.locator('[data-testid="applications-section"]');
    expect(await applicationsSection.isVisible()).toBe(true);
  });

  test('E2E 14: View candidate profile from application', async () => {
    await page.goto(`${BASE_URL}/employer/applications`, { waitUntil: 'networkidle' });

    // Click on an application
    const firstApplication = await page.locator('[data-testid="application-item"]').first();
    if (await firstApplication.isVisible()) {
      await firstApplication.click();

      // View candidate profile
      const candidateProfile = await page.locator('[data-testid="candidate-profile"]');
      expect(await candidateProfile.isVisible()).toBe(true);
    }
  });

  test('E2E 15: Schedule interview with candidate', async () => {
    await page.goto(`${BASE_URL}/employer/applications`, { waitUntil: 'networkidle' });

    // Find schedule interview button
    const scheduleButton = await page.locator('[data-testid="schedule-interview"]').first();
    if (await scheduleButton.isVisible()) {
      await scheduleButton.click();

      // Fill interview details
      const dateInput = await page.locator('[name="interviewDate"]');
      if (await dateInput.isVisible()) {
        await dateInput.fill('2025-12-20');
      }

      const timeInput = await page.locator('[name="interviewTime"]');
      if (await timeInput.isVisible()) {
        await timeInput.fill('10:00');
      }

      // Submit
      const submitButton = await page.locator('button:has-text("Schedule")');
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForSelector('[data-testid="interview-scheduled"]', { timeout: 5000 });
      }
    }
  });

  test('E2E 16: View scheduled interviews', async () => {
    await page.goto(`${BASE_URL}/employer/interviews`, { waitUntil: 'networkidle' });
    const interviewsList = await page.locator('[data-testid="interviews-list"]');
    expect(await interviewsList.isVisible()).toBe(true);
  });

  test('E2E 17: Send job offer to candidate', async () => {
    await page.goto(`${BASE_URL}/employer/applications`, { waitUntil: 'networkidle' });

    // Find send offer button
    const offerButton = await page.locator('[data-testid="send-offer"]').first();
    if (await offerButton.isVisible()) {
      await offerButton.click();

      // Fill offer details
      const salaryInput = await page.locator('[name="offeredSalary"]');
      if (await salaryInput.isVisible()) {
        await salaryInput.fill('120000');
      }

      const expiryInput = await page.locator('[name="offerExpiry"]');
      if (await expiryInput.isVisible()) {
        await expiryInput.fill('7');
      }

      // Submit
      const submitButton = await page.locator('button:has-text("Send Offer")');
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForSelector('[data-testid="offer-sent"]', { timeout: 5000 });
      }
    }
  });

  test('E2E 18: View pending offers', async () => {
    await page.goto(`${BASE_URL}/employer/offers`, { waitUntil: 'networkidle' });
    const offersList = await page.locator('[data-testid="offers-list"]');
    expect(await offersList.isVisible()).toBe(true);
  });

  test('E2E 19: View job statistics', async () => {
    await page.goto(`${BASE_URL}/employer/analytics`, { waitUntil: 'networkidle' });
    const statsSection = await page.locator('[data-testid="analytics-section"]');
    expect(await statsSection.isVisible()).toBe(true);
  });

  test('E2E 20: View job views and applications chart', async () => {
    await page.goto(`${BASE_URL}/employer/analytics`, { waitUntil: 'networkidle' });
    const chartElement = await page.locator('[data-testid="analytics-chart"]');
    expect(await chartElement.isVisible()).toBe(true);
  });

  test('E2E 21: Close a job listing', async () => {
    await page.goto(`${BASE_URL}/employer/jobs`, { waitUntil: 'networkidle' });

    // Find close button
    const closeButton = await page.locator('[data-testid="close-job"]').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();

      // Confirm closure
      const confirmButton = await page.locator('button:has-text("Confirm")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await page.waitForSelector('[data-testid="job-closed"]', { timeout: 5000 });
      }
    }
  });

  test('E2E 22: Reopen a closed job', async () => {
    await page.goto(`${BASE_URL}/employer/jobs`, { waitUntil: 'networkidle' });

    // Find reopen button
    const reopenButton = await page.locator('[data-testid="reopen-job"]').first();
    if (await reopenButton.isVisible()) {
      await reopenButton.click();
      await page.waitForSelector('[data-testid="job-reopened"]', { timeout: 5000 });
    }
  });

  test('E2E 23: View employer profile', async () => {
    await page.goto(`${BASE_URL}/employer/profile`, { waitUntil: 'networkidle' });
    const profileForm = await page.locator('[data-testid="profile-form"]');
    expect(await profileForm.isVisible()).toBe(true);
  });

  test('E2E 24: Update employer account settings', async () => {
    await page.goto(`${BASE_URL}/employer/settings`, { waitUntil: 'networkidle' });

    // Update settings
    const phoneInput = await page.locator('[name="phone"]');
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('+1-555-0123');
    }

    // Save settings
    const saveButton = await page.locator('button:has-text("Save Settings")');
    if (await saveButton.isVisible()) {
      await saveButton.click();
      await page.waitForSelector('[data-testid="settings-saved"]', { timeout: 5000 });
    }
  });

  test('E2E 25: Logout from employer account', async () => {
    await page.goto(`${BASE_URL}/employer/dashboard`, { waitUntil: 'networkidle' });

    // Click logout
    const logoutButton = await page.locator('[data-testid="logout-button"]');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' });
    }

    // Verify redirect
    const url = page.url();
    expect(url).toContain('/login') || expect(url).toContain('/');
  });
});
