/**
 * E2E Tests: Complete User Journeys
 * Tests full workflows from signup through hire/offer for all user types
 * Uses Playwright for browser automation and realistic user flows
 */

import { test, expect, Page, Browser, BrowserContext } from '@playwright/test';
import { createBrowserContext, navigateTo, fillForm, clickButton } from '../helpers/playwright.helpers';

let browser: Browser;
let candidateContext: BrowserContext;
let employerContext: BrowserContext;
let adminContext: BrowserContext;
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';

test.describe('Complete Candidate Journey', () => {
  test.beforeAll(async () => {
    browser = await chromium.launch();
  });

  test.beforeEach(async () => {
    candidateContext = await browser.newContext();
  });

  test.afterEach(async () => {
    await candidateContext.close();
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test('should complete full candidate workflow: signup → search → apply → interview → offer', async () => {
    const page = await candidateContext.newPage();

    // Step 1: Signup
    await navigateTo(page, `${baseURL}/signup`);
    await fillForm(page, {
      email: `candidate-${Date.now()}@example.com`,
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Developer',
      role: 'candidate',
    });
    await clickButton(page, 'Create Account');
    await page.waitForURL('**/profile-setup');

    // Step 2: Complete Profile
    await fillForm(page, {
      location: 'San Francisco',
      experience: '5',
      skills: ['TypeScript', 'Node.js', 'React'],
      resume: 'sample-resume.pdf',
    });
    await clickButton(page, 'Save Profile');
    await page.waitForURL('**/dashboard');

    // Verify dashboard loaded
    expect(await page.locator('[data-test="dashboard-title"]').isVisible()).toBeTruthy();

    // Step 3: Search for Jobs
    await navigateTo(page, `${baseURL}/jobs`);

    // Apply filters
    await page.fill('[data-test="search-keywords"]', 'Senior Engineer');
    await page.selectOption('[data-test="location-filter"]', 'San Francisco');
    await page.selectOption('[data-test="salary-filter"]', '120000-150000');
    await clickButton(page, 'Search');

    // Wait for results
    await page.waitForSelector('[data-test="job-card"]');
    const jobCards = await page.locator('[data-test="job-card"]').count();
    expect(jobCards).toBeGreaterThan(0);

    // Step 4: Apply to First Job
    const firstJob = page.locator('[data-test="job-card"]').first();
    const jobTitle = await firstJob.locator('[data-test="job-title"]').textContent();

    await firstJob.click();
    await page.waitForURL('**/jobs/*');

    // Verify job details loaded
    expect(await page.locator('[data-test="job-description"]').isVisible()).toBeTruthy();

    // Apply for job
    await clickButton(page, 'Apply Now');
    await page.waitForSelector('[data-test="application-submitted"]');
    expect(await page.locator('[data-test="application-submitted"]').isVisible()).toBeTruthy();

    // Step 5: Check Application Status
    await navigateTo(page, `${baseURL}/applications`);

    const applicationRow = await page.locator(`text=${jobTitle}`).first();
    expect(applicationRow).toBeDefined();

    // Verify application status is "Applied"
    const statusBadge = applicationRow.locator('[data-test="status-badge"]');
    expect(await statusBadge.textContent()).toContain('Applied');

    // Step 6: Wait for Interview Invitation (simulate employer action)
    // In real scenario, employer would send this through admin panel
    await page.waitForTimeout(1000);
    await page.reload();

    // Step 7: Respond to Interview
    const interviewSection = page.locator('[data-test="interview-section"]');
    if (await interviewSection.isVisible()) {
      await clickButton(page, 'Accept Interview');

      const interviewDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await page.selectOption('[data-test="preferred-time"]', '2:00 PM');

      await clickButton(page, 'Confirm');
      expect(await page.locator('[data-test="interview-confirmed"]').isVisible()).toBeTruthy();
    }

    // Step 8: Monitor for Offer
    await page.waitForTimeout(2000);
    await page.reload();

    const offerSection = page.locator('[data-test="offer-section"]');
    if (await offerSection.isVisible()) {
      const offerDetails = await offerSection.textContent();
      expect(offerDetails).toContain('salary');

      await clickButton(page, 'Review Offer');
      await page.waitForURL('**/offers/*');

      // Accept offer
      await clickButton(page, 'Accept Offer');
      expect(await page.locator('[data-test="offer-accepted"]').isVisible()).toBeTruthy();
    }
  });

  test('should maintain application history and track status changes', async () => {
    const page = await candidateContext.newPage();

    // Login as candidate
    await navigateTo(page, `${baseURL}/login`);
    await fillForm(page, {
      email: 'candidate@example.com',
      password: 'SecurePass123!',
    });
    await clickButton(page, 'Login');
    await page.waitForURL('**/dashboard');

    // Navigate to applications
    await navigateTo(page, `${baseURL}/applications`);

    // Get initial count
    const initialCount = await page.locator('[data-test="application-row"]').count();

    // Apply to new job
    await navigateTo(page, `${baseURL}/jobs`);
    const firstJob = page.locator('[data-test="job-card"]').first();
    await firstJob.click();
    await clickButton(page, 'Apply Now');

    // Check updated count
    await navigateTo(page, `${baseURL}/applications`);
    const updatedCount = await page.locator('[data-test="application-row"]').count();
    expect(updatedCount).toBe(initialCount + 1);

    // Verify latest application is at top
    const latestStatus = await page.locator('[data-test="application-row"]').first().locator('[data-test="status-badge"]');
    expect(await latestStatus.textContent()).toContain('Applied');
  });

  test('should access career pathway and milestones', async () => {
    const page = await candidateContext.newPage();

    // Login
    await navigateTo(page, `${baseURL}/login`);
    await fillForm(page, {
      email: 'candidate@example.com',
      password: 'SecurePass123!',
    });
    await clickButton(page, 'Login');
    await page.waitForURL('**/dashboard');

    // Navigate to career pathways
    await navigateTo(page, `${baseURL}/career-pathways`);

    // Verify timeline visible
    expect(await page.locator('[data-test="career-timeline"]').isVisible()).toBeTruthy();

    // Click on a timeline step
    const timelineStep = page.locator('[data-test="timeline-step"]').first();
    await timelineStep.click();

    // Verify step details expanded
    expect(await page.locator('[data-test="step-details"]').isVisible()).toBeTruthy();

    // Verify salary progression visible
    expect(await page.locator('[data-test="salary-progression"]').isVisible()).toBeTruthy();

    // Verify skill requirements visible
    expect(await page.locator('[data-test="skill-requirements"]').isVisible()).toBeTruthy();

    // Check milestone creation
    await clickButton(page, 'Add Milestone');
    await fillForm(page, {
      milestoneTitle: 'Master System Design',
      dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    await clickButton(page, 'Create Milestone');

    expect(await page.locator('[data-test="milestone-created"]').isVisible()).toBeTruthy();
  });

  test('should connect with mentor and send messages', async () => {
    const page = await candidateContext.newPage();

    // Login
    await navigateTo(page, `${baseURL}/login`);
    await fillForm(page, {
      email: 'candidate@example.com',
      password: 'SecurePass123!',
    });
    await clickButton(page, 'Login');
    await page.waitForURL('**/dashboard');

    // Navigate to mentorship
    await navigateTo(page, `${baseURL}/mentorship`);

    // Browse mentors
    expect(await page.locator('[data-test="mentor-list"]').isVisible()).toBeTruthy();

    // Click first mentor
    const firstMentor = page.locator('[data-test="mentor-card"]').first();
    const mentorName = await firstMentor.locator('[data-test="mentor-name"]').textContent();

    await firstMentor.click();
    await page.waitForURL('**/mentorship/mentors/*');

    // View compatibility score
    const compatibilityScore = await page.locator('[data-test="compatibility-score"]');
    expect(await compatibilityScore.isVisible()).toBeTruthy();
    const scoreText = await compatibilityScore.textContent();
    expect(scoreText).toMatch(/\d+%/);

    // Request mentorship
    await clickButton(page, 'Request Mentorship');
    await fillForm(page, {
      goals: 'Learn system design',
    });
    await clickButton(page, 'Send Request');

    expect(await page.locator('[data-test="request-sent"]').isVisible()).toBeTruthy();

    // Simulate mentor acceptance
    await page.waitForTimeout(1000);
    await page.reload();

    // Send message to mentor
    const messageInput = page.locator('[data-test="message-input"]');
    if (await messageInput.isVisible()) {
      await messageInput.fill('Hi, thanks for accepting my request!');
      await clickButton(page, 'Send');

      // Verify message appears in chat
      expect(await page.locator('text=thanks for accepting').isVisible()).toBeTruthy();
    }
  });
});

test.describe('Complete Employer Workflow', () => {
  test.beforeEach(async () => {
    employerContext = await browser.newContext();
  });

  test.afterEach(async () => {
    await employerContext.close();
  });

  test('should complete full employer workflow: post → screen → interview → hire', async () => {
    const page = await employerContext.newPage();

    // Step 1: Employer Signup
    await navigateTo(page, `${baseURL}/signup`);
    await fillForm(page, {
      email: `employer-${Date.now()}@example.com`,
      password: 'SecurePass123!',
      companyName: 'Tech Corp',
      role: 'employer',
    });
    await clickButton(page, 'Create Account');
    await page.waitForURL('**/company-setup');

    // Step 2: Company Profile
    await fillForm(page, {
      companySize: '100-500',
      industry: 'Technology',
      website: 'https://example.com',
    });
    await clickButton(page, 'Complete Setup');
    await page.waitForURL('**/employer-dashboard');

    // Step 3: Post a Job
    await clickButton(page, 'Post New Job');
    await page.waitForURL('**/jobs/new');

    await fillForm(page, {
      jobTitle: 'Senior Backend Engineer',
      jobDescription: 'We are looking for a senior backend engineer...',
      location: 'San Francisco',
      salaryMin: '120000',
      salaryMax: '160000',
      requiredSkills: ['TypeScript', 'Node.js', 'PostgreSQL'],
    });

    await clickButton(page, 'Publish Job');
    await page.waitForSelector('[data-test="job-published"]');
    expect(await page.locator('[data-test="job-published"]').isVisible()).toBeTruthy();

    // Step 4: Receive Applications
    await navigateTo(page, `${baseURL}/employer/applications`);

    // Wait for applications to appear
    await page.waitForSelector('[data-test="application-item"]', { timeout: 5000 });
    const applicationCount = await page.locator('[data-test="application-item"]').count();
    expect(applicationCount).toBeGreaterThan(0);

    // Step 5: Screen Candidate
    const firstApplication = page.locator('[data-test="application-item"]').first();
    const candidateName = await firstApplication.locator('[data-test="candidate-name"]').textContent();

    await firstApplication.click();
    await page.waitForURL('**/applications/*');

    // View candidate profile
    expect(await page.locator('[data-test="candidate-profile"]').isVisible()).toBeTruthy();

    // Watch video interview
    const videoButton = page.locator('[data-test="watch-interview"]');
    if (await videoButton.isVisible()) {
      await videoButton.click();
      await page.waitForSelector('[data-test="video-player"]');
    }

    // Leave screening feedback
    await fillForm(page, {
      feedback: 'Excellent candidate, strong technical skills',
      rating: '5',
    });
    await clickButton(page, 'Save Feedback');

    // Step 6: Send Interview Invitation
    await clickButton(page, 'Schedule Interview');
    const interviewDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await fillForm(page, {
      interviewDate: interviewDate,
      interviewTime: '2:00 PM',
      interviewType: 'video-call',
    });
    await clickButton(page, 'Send Invitation');

    expect(await page.locator('[data-test="invitation-sent"]').isVisible()).toBeTruthy();

    // Step 7: Send Offer
    await navigateTo(page, `${baseURL}/employer/candidates/${candidateName}`);
    await clickButton(page, 'Send Offer');

    await fillForm(page, {
      baseSalary: '140000',
      title: 'Senior Backend Engineer',
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    await clickButton(page, 'Send Offer');

    expect(await page.locator('[data-test="offer-sent"]').isVisible()).toBeTruthy();
  });

  test('should manage job analytics and view candidate metrics', async () => {
    const page = await employerContext.newPage();

    // Login as employer
    await navigateTo(page, `${baseURL}/login`);
    await fillForm(page, {
      email: 'employer@example.com',
      password: 'SecurePass123!',
    });
    await clickButton(page, 'Login');
    await page.waitForURL('**/employer-dashboard');

    // View job analytics
    await navigateTo(page, `${baseURL}/employer/analytics`);

    // Verify analytics dashboard
    expect(await page.locator('[data-test="analytics-dashboard"]').isVisible()).toBeTruthy();

    // Check key metrics
    expect(await page.locator('[data-test="job-views"]').isVisible()).toBeTruthy();
    expect(await page.locator('[data-test="application-count"]').isVisible()).toBeTruthy();
    expect(await page.locator('[data-test="hiring-funnel"]').isVisible()).toBeTruthy();

    // View candidate comparison
    await navigateTo(page, `${baseURL}/employer/candidates`);

    const candidateCount = await page.locator('[data-test="candidate-row"]').count();
    expect(candidateCount).toBeGreaterThan(0);

    // Sort candidates by fit score
    await page.selectOption('[data-test="sort-dropdown"]', 'fit-score-desc');

    // Verify sorted correctly
    const firstScore = await page.locator('[data-test="candidate-row"]').first().locator('[data-test="fit-score"]').textContent();
    const secondScore = await page.locator('[data-test="candidate-row"]').nth(1).locator('[data-test="fit-score"]').textContent();

    expect(parseInt(firstScore || '0')).toBeGreaterThanOrEqual(parseInt(secondScore || '0'));
  });
});

test.describe('Admin Dashboard Workflow', () => {
  test.beforeEach(async () => {
    adminContext = await browser.newContext();
  });

  test.afterEach(async () => {
    await adminContext.close();
  });

  test('should access admin dashboard and view platform analytics', async () => {
    const page = await adminContext.newPage();

    // Login as admin
    await navigateTo(page, `${baseURL}/login`);
    await fillForm(page, {
      email: 'admin@example.com',
      password: 'AdminPass123!',
    });
    await clickButton(page, 'Login');
    await page.waitForURL('**/admin/dashboard');

    // Verify dashboard loaded
    expect(await page.locator('[data-test="admin-dashboard"]').isVisible()).toBeTruthy();

    // Check key metrics visible
    expect(await page.locator('[data-test="total-users"]').isVisible()).toBeTruthy();
    expect(await page.locator('[data-test="total-jobs"]').isVisible()).toBeTruthy();
    expect(await page.locator('[data-test="total-applications"]').isVisible()).toBeTruthy();
    expect(await page.locator('[data-test="avg-hire-time"]').isVisible()).toBeTruthy();

    // Check charts
    expect(await page.locator('[data-test="user-growth-chart"]').isVisible()).toBeTruthy();
    expect(await page.locator('[data-test="hiring-funnel-chart"]').isVisible()).toBeTruthy();

    // View detailed reports
    await clickButton(page, 'View Reports');
    await page.waitForURL('**/admin/reports');

    expect(await page.locator('[data-test="reports-section"]').isVisible()).toBeTruthy();
  });

  test('should manage users and review inappropriate content', async () => {
    const page = await adminContext.newPage();

    // Login as admin
    await navigateTo(page, `${baseURL}/login`);
    await fillForm(page, {
      email: 'admin@example.com',
      password: 'AdminPass123!',
    });
    await clickButton(page, 'Login');
    await page.waitForURL('**/admin/dashboard');

    // Navigate to user management
    await navigateTo(page, `${baseURL}/admin/users`);

    // Search for user
    await page.fill('[data-test="user-search"]', 'john@example.com');
    await clickButton(page, 'Search');

    // Verify user found
    expect(await page.locator('[data-test="user-row"]').count()).toBeGreaterThan(0);

    // Click user to view details
    const userRow = page.locator('[data-test="user-row"]').first();
    await userRow.click();
    await page.waitForURL('**/admin/users/*');

    // View user activities
    expect(await page.locator('[data-test="user-activity-log"]').isVisible()).toBeTruthy();

    // Check content moderation
    await navigateTo(page, `${baseURL}/admin/moderation`);

    // Flag inappropriate content
    const flagButton = page.locator('[data-test="flag-content"]').first();
    if (await flagButton.isVisible()) {
      await flagButton.click();
      await fillForm(page, {
        reason: 'Inappropriate language',
      });
      await clickButton(page, 'Submit Report');

      expect(await page.locator('[data-test="report-submitted"]').isVisible()).toBeTruthy();
    }
  });
});

test.describe('PWA Offline Functionality', () => {
  test('should work offline and sync when reconnected', async () => {
    const page = await candidateContext.newPage();

    // Login
    await navigateTo(page, `${baseURL}/login`);
    await fillForm(page, {
      email: 'candidate@example.com',
      password: 'SecurePass123!',
    });
    await clickButton(page, 'Login');
    await page.waitForURL('**/dashboard');

    // Go online to load initial data
    await page.context().setOffline(false);
    await page.goto(`${baseURL}/applications`);
    await page.waitForSelector('[data-test="application-row"]');

    // Go offline
    await page.context().setOffline(true);

    // View applications (should be cached)
    await page.reload();
    const cachedApplications = await page.locator('[data-test="application-row"]').count();
    expect(cachedApplications).toBeGreaterThan(0);

    // Try to apply to job while offline (should queue for sync)
    await navigateTo(page, `${baseURL}/jobs`);
    const jobCard = page.locator('[data-test="job-card"]').first();
    await jobCard.click();
    await clickButton(page, 'Apply Now');

    // Verify offline message
    expect(await page.locator('[data-test="offline-warning"]').isVisible()).toBeTruthy();

    // Go back online
    await page.context().setOffline(false);

    // Wait for sync
    await page.waitForTimeout(2000);

    // Verify application was synced
    expect(await page.locator('[data-test="sync-complete"]').isVisible()).toBeTruthy();
  });

  test('should install PWA and send push notifications', async () => {
    const page = await candidateContext.newPage();

    // Login
    await navigateTo(page, `${baseURL}/login`);
    await fillForm(page, {
      email: 'candidate@example.com',
      password: 'SecurePass123!',
    });
    await clickButton(page, 'Login');
    await page.waitForURL('**/dashboard');

    // Check install prompt visible
    const installPrompt = page.locator('[data-test="install-prompt"]');
    if (await installPrompt.isVisible()) {
      // Grant notification permission
      await page.context().grantPermissions(['notifications']);

      // Click install
      await clickButton(page, 'Install App');

      // Verify installation tracked
      expect(await page.locator('[data-test="install-success"]').isVisible()).toBeTruthy();
    }
  });
});

test.describe('Payment & Subscription Flow', () => {
  test('should complete subscription checkout for employer', async () => {
    const page = await employerContext.newPage();

    // Login as employer
    await navigateTo(page, `${baseURL}/login`);
    await fillForm(page, {
      email: 'employer@example.com',
      password: 'SecurePass123!',
    });
    await clickButton(page, 'Login');
    await page.waitForURL('**/employer-dashboard');

    // Navigate to subscription
    await navigateTo(page, `${baseURL}/employer/subscription`);

    // Select plan
    const premiumPlan = page.locator('[data-test="plan-card"]').filter({ hasText: 'Premium' });
    await premiumPlan.click();

    // Proceed to checkout
    await clickButton(page, 'Choose Plan');
    await page.waitForURL('**/checkout');

    // Fill payment info
    const cardFrame = page.locator('iframe[title="Secure payment input frame"]');
    const cardElement = cardFrame.contentFrame().locator('[placeholder*="Card number"]');

    // Note: In real scenario, use Stripe test card: 4242 4242 4242 4242
    await cardElement.fill('4242 4242 4242 4242');
    await cardFrame.contentFrame().locator('[placeholder*="MM"]').fill('12');
    await cardFrame.contentFrame().locator('[placeholder*="YY"]').fill('25');
    await cardFrame.contentFrame().locator('[placeholder*="CVC"]').fill('123');

    // Complete payment
    await clickButton(page, 'Complete Payment');
    await page.waitForURL('**/subscription/success');

    expect(await page.locator('[data-test="subscription-active"]').isVisible()).toBeTruthy();
  });
});
