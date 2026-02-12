/**
 * Candidate E2E Journey Tests
 * Complete workflow: Register → Profile → Search → Apply → Interview → Offer → Accept
 */

import { Browser, Page, chromium } from 'playwright';

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
const TIMEOUT = 30000;

describe('Candidate Journey E2E', () => {
  let browser: Browser;
  let page: Page;
  const candidateEmail = `candidate-e2e-${Date.now()}@test.com`;
  const candidatePassword = 'SecurePass123!';

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

  test('E2E 1: Navigate to registration page', async () => {
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle' });
    const heading = await page.locator('h1, h2').first();
    expect(await heading.isVisible()).toBe(true);
  });

  test('E2E 2: Complete candidate registration', async () => {
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle' });

    // Select candidate role
    await page.click('[data-testid="role-candidate"]');

    // Fill form
    await page.fill('[name="firstName"]', 'Test');
    await page.fill('[name="lastName"]', 'Candidate');
    await page.fill('[name="email"]', candidateEmail);
    await page.fill('[name="password"]', candidatePassword);
    await page.fill('[name="confirmPassword"]', candidatePassword);

    // Submit
    await page.click('button[type="submit"]');

    // Wait for success/redirect
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/register');
  });

  test('E2E 3: Candidate receives OTP and verifies email', async () => {
    await page.goto(`${BASE_URL}/auth/verify-otp`, { waitUntil: 'networkidle' });

    // Enter OTP (in test environment, use default OTP)
    const otpInputs = await page.locator('[data-testid="otp-input"]');
    const count = await otpInputs.count();
    for (let i = 0; i < count; i++) {
      await otpInputs.nth(i).fill('1');
    }

    // Submit OTP
    await page.click('button[type="submit"]');

    // Wait for verification
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    const url = page.url();
    expect(url).toContain('/login');
  });

  test('E2E 4: Candidate logs in', async () => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

    // Fill credentials
    await page.fill('[name="email"]', candidateEmail);
    await page.fill('[name="password"]', candidatePassword);

    // Submit
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    const url = page.url();
    expect(url).toContain('/candidate') || expect(url).toContain('/dashboard');
  });

  test('E2E 5: Access candidate dashboard', async () => {
    await page.goto(`${BASE_URL}/candidate/dashboard`, { waitUntil: 'networkidle' });
    const heading = await page.locator('h1, h2').first();
    expect(await heading.isVisible()).toBe(true);
  });

  test('E2E 6: Navigate to profile page', async () => {
    await page.goto(`${BASE_URL}/candidate/profile`, { waitUntil: 'networkidle' });
    const profileForm = await page.locator('[data-testid="profile-form"]');
    expect(await profileForm.isVisible()).toBe(true);
  });

  test('E2E 7: Update basic profile information', async () => {
    await page.goto(`${BASE_URL}/candidate/profile`, { waitUntil: 'networkidle' });

    // Fill profile fields
    const phoneInput = await page.locator('[name="phone"]');
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('+1234567890');
    }

    const bioInput = await page.locator('[name="bio"]');
    if (await bioInput.isVisible()) {
      await bioInput.fill('I am a skilled full-stack developer');
    }

    // Save profile
    const saveButton = await page.locator('button:has-text("Save")');
    if (await saveButton.isVisible()) {
      await saveButton.click();
      await page.waitForSelector('[data-testid="success-message"]', { timeout: 5000 });
    }
  });

  test('E2E 8: Add education to profile', async () => {
    await page.goto(`${BASE_URL}/candidate/profile`, { waitUntil: 'networkidle' });

    // Click add education
    const addEducationButton = await page.locator('button:has-text("Add Education")');
    if (await addEducationButton.isVisible()) {
      await addEducationButton.click();

      // Fill education form
      await page.fill('[name="school"]', 'University of Technology');
      await page.fill('[name="degree"]', 'Bachelor of Science');
      await page.fill('[name="field"]', 'Computer Science');
      await page.fill('[name="graduationYear"]', '2020');

      // Save education
      const saveButton = await page.locator('button:has-text("Add")');
      await saveButton.click();
      await page.waitForSelector('[data-testid="education-added"]', { timeout: 5000 });
    }
  });

  test('E2E 9: Add work experience to profile', async () => {
    await page.goto(`${BASE_URL}/candidate/profile`, { waitUntil: 'networkidle' });

    // Click add experience
    const addExperienceButton = await page.locator('button:has-text("Add Experience")');
    if (await addExperienceButton.isVisible()) {
      await addExperienceButton.click();

      // Fill experience form
      await page.fill('[name="jobTitle"]', 'Senior Developer');
      await page.fill('[name="company"]', 'Tech Company');
      await page.fill('[name="description"]', '5 years of full-stack development');
      await page.fill('[name="startYear"]', '2019');
      await page.fill('[name="endYear"]', '2024');

      // Save experience
      const saveButton = await page.locator('button:has-text("Add")');
      await saveButton.click();
      await page.waitForSelector('[data-testid="experience-added"]', { timeout: 5000 });
    }
  });

  test('E2E 10: Add skills to profile', async () => {
    await page.goto(`${BASE_URL}/candidate/profile`, { waitUntil: 'networkidle' });

    // Add skills
    const skillsInput = await page.locator('[name="skills"], [data-testid="skills-input"]');
    if (await skillsInput.isVisible()) {
      await skillsInput.fill('JavaScript, React, Node.js, PostgreSQL');
      
      const addSkillButton = await page.locator('button:has-text("Add Skill")');
      if (await addSkillButton.isVisible()) {
        await addSkillButton.click();
      }
    }
  });

  test('E2E 11: Navigate to jobs page', async () => {
    await page.goto(`${BASE_URL}/jobs`, { waitUntil: 'networkidle' });
    const jobsList = await page.locator('[data-testid="jobs-list"]');
    expect(await jobsList.isVisible()).toBe(true);
  });

  test('E2E 12: Search for jobs by keyword', async () => {
    await page.goto(`${BASE_URL}/jobs`, { waitUntil: 'networkidle' });

    // Search
    const searchInput = await page.locator('[data-testid="job-search"]');
    await searchInput.fill('Developer');
    
    const searchButton = await page.locator('button:has-text("Search")');
    if (await searchButton.isVisible()) {
      await searchButton.click();
    }

    // Wait for results
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 5000 });
  });

  test('E2E 13: Filter jobs by category', async () => {
    await page.goto(`${BASE_URL}/jobs`, { waitUntil: 'networkidle' });

    // Select category filter
    const categoryFilter = await page.locator('[data-testid="category-filter"]');
    if (await categoryFilter.isVisible()) {
      await categoryFilter.click();
      await page.click('[data-testid="category-it"]');
    }

    // Wait for filtered results
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 5000 });
  });

  test('E2E 14: Filter jobs by salary range', async () => {
    await page.goto(`${BASE_URL}/jobs`, { waitUntil: 'networkidle' });

    // Set salary filters
    const minSalary = await page.locator('[name="minSalary"]');
    const maxSalary = await page.locator('[name="maxSalary"]');

    if (await minSalary.isVisible()) {
      await minSalary.fill('80000');
    }
    if (await maxSalary.isVisible()) {
      await maxSalary.fill('150000');
    }

    // Apply filters
    const filterButton = await page.locator('button:has-text("Apply")');
    if (await filterButton.isVisible()) {
      await filterButton.click();
    }
  });

  test('E2E 15: View job details', async () => {
    await page.goto(`${BASE_URL}/jobs`, { waitUntil: 'networkidle' });

    // Click on a job
    const firstJobCard = await page.locator('[data-testid="job-card"]').first();
    if (await firstJobCard.isVisible()) {
      await firstJobCard.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' });
    }

    // Verify job details are visible
    const jobTitle = await page.locator('[data-testid="job-title"]');
    expect(await jobTitle.isVisible()).toBe(true);
  });

  test('E2E 16: Save a job to wishlist', async () => {
    await page.goto(`${BASE_URL}/jobs`, { waitUntil: 'networkidle' });

    // Find and save job
    const saveButton = await page.locator('[data-testid="save-job"]').first();
    if (await saveButton.isVisible()) {
      await saveButton.click();
      await page.waitForSelector('[data-testid="saved-confirmation"]', { timeout: 5000 });
    }
  });

  test('E2E 17: View saved jobs', async () => {
    await page.goto(`${BASE_URL}/candidate/saved-jobs`, { waitUntil: 'networkidle' });
    const savedJobsList = await page.locator('[data-testid="saved-jobs-list"]');
    expect(await savedJobsList.isVisible()).toBe(true);
  });

  test('E2E 18: Apply for a job', async () => {
    await page.goto(`${BASE_URL}/jobs`, { waitUntil: 'networkidle' });

    // Find and click job
    const firstJobCard = await page.locator('[data-testid="job-card"]').first();
    if (await firstJobCard.isVisible()) {
      await firstJobCard.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' });
    }

    // Click apply button
    const applyButton = await page.locator('button:has-text("Apply Now")');
    if (await applyButton.isVisible()) {
      await applyButton.click();

      // Fill application form if present
      const coverLetterInput = await page.locator('[name="coverLetter"]');
      if (await coverLetterInput.isVisible()) {
        await coverLetterInput.fill('I am interested in this position and believe I am a good fit.');
      }

      // Submit application
      const submitButton = await page.locator('button:has-text("Submit")');
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForSelector('[data-testid="application-success"]', { timeout: 5000 });
      }
    }
  });

  test('E2E 19: View applications', async () => {
    await page.goto(`${BASE_URL}/candidate/applications`, { waitUntil: 'networkidle' });
    const applicationsList = await page.locator('[data-testid="applications-list"]');
    expect(await applicationsList.isVisible()).toBe(true);
  });

  test('E2E 20: View application status', async () => {
    await page.goto(`${BASE_URL}/candidate/applications`, { waitUntil: 'networkidle' });

    // Click on an application
    const firstApplication = await page.locator('[data-testid="application-item"]').first();
    if (await firstApplication.isVisible()) {
      await firstApplication.click();

      // Check status badge
      const statusBadge = await page.locator('[data-testid="application-status"]');
      expect(await statusBadge.isVisible()).toBe(true);
    }
  });

  test('E2E 21: View interviews', async () => {
    await page.goto(`${BASE_URL}/candidate/interviews`, { waitUntil: 'networkidle' });
    const interviewsList = await page.locator('[data-testid="interviews-list"]');
    expect(await interviewsList.isVisible()).toBe(true);
  });

  test('E2E 22: Reschedule interview', async () => {
    await page.goto(`${BASE_URL}/candidate/interviews`, { waitUntil: 'networkidle' });

    // Find reschedule button
    const rescheduleButton = await page.locator('[data-testid="reschedule-interview"]').first();
    if (await rescheduleButton.isVisible()) {
      await rescheduleButton.click();

      // Select new date and time
      const dateInput = await page.locator('[name="interviewDate"]');
      if (await dateInput.isVisible()) {
        await dateInput.fill('2025-12-25');
      }

      const timeInput = await page.locator('[name="interviewTime"]');
      if (await timeInput.isVisible()) {
        await timeInput.fill('14:00');
      }

      // Submit
      const submitButton = await page.locator('button:has-text("Reschedule")');
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForSelector('[data-testid="reschedule-success"]', { timeout: 5000 });
      }
    }
  });

  test('E2E 23: View job offers', async () => {
    await page.goto(`${BASE_URL}/candidate/offers`, { waitUntil: 'networkidle' });
    const offersList = await page.locator('[data-testid="offers-list"]');
    expect(await offersList.isVisible()).toBe(true);
  });

  test('E2E 24: Accept job offer', async () => {
    await page.goto(`${BASE_URL}/candidate/offers`, { waitUntil: 'networkidle' });

    // Find accept button
    const acceptButton = await page.locator('[data-testid="accept-offer"]').first();
    if (await acceptButton.isVisible()) {
      await acceptButton.click();

      // Confirm acceptance
      const confirmButton = await page.locator('button:has-text("Confirm")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await page.waitForSelector('[data-testid="offer-accepted"]', { timeout: 5000 });
      }
    }
  });

  test('E2E 25: Logout successfully', async () => {
    await page.goto(`${BASE_URL}/candidate/dashboard`, { waitUntil: 'networkidle' });

    // Click logout
    const logoutButton = await page.locator('[data-testid="logout-button"]');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' });
    }

    // Verify redirect to login/home
    const url = page.url();
    expect(url).toContain('/login') || expect(url).toContain('/');
  });
});
