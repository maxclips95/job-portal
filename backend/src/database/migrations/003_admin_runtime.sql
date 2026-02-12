-- Admin persistence tables for dashboard/settings/templates/audit/company verification

CREATE TABLE IF NOT EXISTS admin_system_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  site_name VARCHAR(255) NOT NULL DEFAULT 'Job Portal',
  site_description TEXT NOT NULL DEFAULT 'Find and post jobs online',
  max_jobs_per_day INTEGER NOT NULL DEFAULT 10,
  max_applications_per_day INTEGER NOT NULL DEFAULT 50,
  auto_expire_jobs_days INTEGER NOT NULL DEFAULT 30,
  notification_email VARCHAR(255) NOT NULL DEFAULT 'admin@jobportal.com',
  maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
  email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO admin_system_settings (
  id, site_name, site_description, max_jobs_per_day, max_applications_per_day,
  auto_expire_jobs_days, notification_email, maintenance_mode, email_notifications_enabled
)
VALUES (1, 'Job Portal', 'Find and post jobs online', 10, 50, 30, 'admin@jobportal.com', FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS admin_email_templates (
  id VARCHAR(120) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(120) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO admin_email_templates (id, name, type, subject, content) VALUES
('welcome', 'Welcome Email', 'welcome', 'Welcome to Job Portal', 'Hello {{name}}, welcome to Job Portal.'),
('password-reset', 'Password Reset', 'password-reset', 'Reset your password', 'Hello {{name}}, use this link to reset your password: {{resetLink}}'),
('job-alert', 'Job Alert', 'job-alert', 'New jobs matching your profile', 'Hello {{name}}, new jobs are available for your profile.'),
('application', 'Application Confirmation', 'application', 'Application received', 'Hello {{name}}, your application for {{jobTitle}} has been received.'),
('interview', 'Interview Scheduled', 'interview', 'Interview scheduled', 'Hello {{name}}, your interview is scheduled on {{interviewDate}}.'),
('offer', 'Job Offer', 'offer', 'You received an offer', 'Hello {{name}}, congratulations! You have received an offer for {{jobTitle}}.')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  target_id VARCHAR(120),
  target_type VARCHAR(80),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_company_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  industry VARCHAR(120) NOT NULL DEFAULT 'General',
  employees INTEGER NOT NULL DEFAULT 0,
  location VARCHAR(255) NOT NULL DEFAULT '',
  website VARCHAR(500),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  rejection_reason TEXT,
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES users(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
