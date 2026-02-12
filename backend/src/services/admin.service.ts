import db from '@/config/database';

type UserStatus = 'active' | 'suspended' | 'banned';
type UserRole = 'admin' | 'employer' | 'candidate';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  lastLogin?: Date;
}

interface AdminStats {
  totalUsers: number;
  totalJobs: number;
  totalApplications: number;
  totalRevenue: number;
  activeUsers: number;
  pendingApprovals: number;
}

interface JobModeration {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: {
    min: number;
    max: number;
    currency: string;
  };
  category: string;
  jobType: string;
  status: 'pending' | 'approved' | 'rejected';
  applicants: number;
  postedAt: string;
  rejectionReason?: string | null;
}

interface SystemSettings {
  siteName: string;
  siteDescription: string;
  maxJobsPerDay: number;
  maxApplicationsPerDay: number;
  autoExpireJobsDays: number;
  notificationEmail: string;
  maintenanceMode: boolean;
  emailNotificationsEnabled: boolean;
}

interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  content: string;
}

interface CompanyVerification {
  id: string;
  name: string;
  email: string;
  industry: string;
  employees: number;
  location: string;
  website?: string;
  status: 'pending' | 'verified' | 'rejected';
  verificationLevel: 'unverified' | 'basic' | 'full';
  reviewStage:
    | 'auto_screened'
    | 'docs_requested'
    | 'under_manual_review'
    | 'approved_basic'
    | 'approved_full'
    | 'rejected';
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  requiresDocuments: boolean;
  documentsSubmitted: boolean;
  reviewNotes?: string | null;
  requiredDocuments: string[];
  submittedAt: string;
  rejectionReason?: string | null;
}

const DEFAULT_SETTINGS: SystemSettings = {
  siteName: 'Job Portal',
  siteDescription: 'Find and post jobs online',
  maxJobsPerDay: 10,
  maxApplicationsPerDay: 50,
  autoExpireJobsDays: 30,
  notificationEmail: 'admin@jobportal.com',
  maintenanceMode: false,
  emailNotificationsEnabled: true,
};

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    type: 'welcome',
    subject: 'Welcome to Job Portal',
    content: 'Hello {{name}}, welcome to Job Portal.',
  },
  {
    id: 'password-reset',
    name: 'Password Reset',
    type: 'password-reset',
    subject: 'Reset your password',
    content: 'Hello {{name}}, use this link to reset your password: {{resetLink}}',
  },
  {
    id: 'job-alert',
    name: 'Job Alert',
    type: 'job-alert',
    subject: 'New jobs matching your profile',
    content: 'Hello {{name}}, new jobs are available for your profile.',
  },
  {
    id: 'application',
    name: 'Application Confirmation',
    type: 'application',
    subject: 'Application received',
    content: 'Hello {{name}}, your application for {{jobTitle}} has been received.',
  },
  {
    id: 'interview',
    name: 'Interview Scheduled',
    type: 'interview',
    subject: 'Interview scheduled',
    content: 'Hello {{name}}, your interview is scheduled on {{interviewDate}}.',
  },
  {
    id: 'offer',
    name: 'Job Offer',
    type: 'offer',
    subject: 'You received an offer',
    content: 'Hello {{name}}, congratulations! You have received an offer for {{jobTitle}}.',
  },
];

const toUserStatus = (status: string | null | undefined): UserStatus => {
  if (status === 'suspended') return 'suspended';
  if (status === 'deleted' || status === 'banned') return 'banned';
  return 'active';
};

const toDbStatus = (status: UserStatus): string => (status === 'banned' ? 'deleted' : status);

const mapUser = (row: any): User => ({
  id: String(row.id),
  email: String(row.email || ''),
  firstName: String(row.first_name || ''),
  lastName: String(row.last_name || ''),
  role: (row.role || 'candidate') as UserRole,
  status: toUserStatus(row.status),
  createdAt: row.created_at ? new Date(row.created_at) : new Date(),
  lastLogin: row.last_login ? new Date(row.last_login) : undefined,
});

const asNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const mapModerationStatus = (status: string | null | undefined): JobModeration['status'] => {
  if (status === 'active') return 'approved';
  if (status === 'closed' || status === 'expired') return 'rejected';
  return 'pending';
};

const mapModerationJob = (row: any): JobModeration => {
  const locationParts = [row.location, row.city, row.country]
    .map((item) => String(item || '').trim())
    .filter((item, index, arr) => item.length > 0 && arr.indexOf(item) === index);

  return {
    id: String(row.id || ''),
    title: String(row.title || ''),
    company: String(row.company_name || ''),
    location: locationParts.join(', '),
    salary: {
      min: asNumber(row.salary_min),
      max: asNumber(row.salary_max),
      currency: String(row.salary_currency || 'USD'),
    },
    category: String(row.category_name || 'General'),
    jobType: String(row.job_type || ''),
    status: mapModerationStatus(row.status),
    applicants: asNumber(row.applications_count),
    postedAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : null,
  };
};

const mapCompanyVerification = (row: any): CompanyVerification => ({
  id: String(row.id || ''),
  name: String(row.company_name || ''),
  email: String(row.email || ''),
  industry: String(row.industry || 'General'),
  employees: asNumber(row.employees),
  location: String(row.location || ''),
  website: row.website ? String(row.website) : undefined,
  status: (row.status || 'pending') as CompanyVerification['status'],
  verificationLevel: (row.verification_level || 'unverified') as CompanyVerification['verificationLevel'],
  reviewStage: (row.review_stage || 'auto_screened') as CompanyVerification['reviewStage'],
  riskScore: asNumber(row.risk_score),
  riskLevel: (row.risk_level || 'medium') as CompanyVerification['riskLevel'],
  requiresDocuments: Boolean(row.requires_documents),
  documentsSubmitted: Boolean(row.documents_submitted),
  reviewNotes: row.review_notes ? String(row.review_notes) : null,
  requiredDocuments: Array.isArray(row.required_documents)
    ? row.required_documents.map((item: any) => String(item))
    : [],
  submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : new Date().toISOString(),
  rejectionReason: row.rejection_reason ? String(row.rejection_reason) : null,
});

class AdminService {
  private adminTablesEnsured = false;

  private async ensureAdminTables(): Promise<void> {
    if (this.adminTablesEnsured) return;

    await db.query(`
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
    `);

    await db.query(
      `
        INSERT INTO admin_system_settings (
          id, site_name, site_description, max_jobs_per_day, max_applications_per_day,
          auto_expire_jobs_days, notification_email, maintenance_mode, email_notifications_enabled
        )
        VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING;
      `,
      [
        DEFAULT_SETTINGS.siteName,
        DEFAULT_SETTINGS.siteDescription,
        DEFAULT_SETTINGS.maxJobsPerDay,
        DEFAULT_SETTINGS.maxApplicationsPerDay,
        DEFAULT_SETTINGS.autoExpireJobsDays,
        DEFAULT_SETTINGS.notificationEmail,
        DEFAULT_SETTINGS.maintenanceMode,
        DEFAULT_SETTINGS.emailNotificationsEnabled,
      ]
    );

    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_email_templates (
        id VARCHAR(120) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(120) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    for (const template of DEFAULT_TEMPLATES) {
      await db.query(
        `
          INSERT INTO admin_email_templates (id, name, type, subject, content)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO NOTHING;
        `,
        [template.id, template.name, template.type, template.subject, template.content]
      );
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(120) NOT NULL,
        description TEXT NOT NULL,
        target_id VARCHAR(120),
        target_type VARCHAR(80),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
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
        verification_level VARCHAR(30) NOT NULL DEFAULT 'unverified',
        review_stage VARCHAR(40) NOT NULL DEFAULT 'auto_screened',
        risk_score INTEGER NOT NULL DEFAULT 0,
        risk_level VARCHAR(20) NOT NULL DEFAULT 'medium',
        requires_documents BOOLEAN NOT NULL DEFAULT FALSE,
        documents_submitted BOOLEAN NOT NULL DEFAULT FALSE,
        required_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
        review_notes TEXT,
        rejection_reason TEXT,
        submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        verified_at TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(
      'ALTER TABLE admin_company_verifications ADD COLUMN IF NOT EXISTS verification_level VARCHAR(30) NOT NULL DEFAULT \'unverified\''
    );
    await db.query(
      'ALTER TABLE admin_company_verifications ADD COLUMN IF NOT EXISTS review_stage VARCHAR(40) NOT NULL DEFAULT \'auto_screened\''
    );
    await db.query(
      'ALTER TABLE admin_company_verifications ADD COLUMN IF NOT EXISTS risk_score INTEGER NOT NULL DEFAULT 0'
    );
    await db.query(
      'ALTER TABLE admin_company_verifications ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) NOT NULL DEFAULT \'medium\''
    );
    await db.query(
      'ALTER TABLE admin_company_verifications ADD COLUMN IF NOT EXISTS requires_documents BOOLEAN NOT NULL DEFAULT FALSE'
    );
    await db.query(
      'ALTER TABLE admin_company_verifications ADD COLUMN IF NOT EXISTS documents_submitted BOOLEAN NOT NULL DEFAULT FALSE'
    );
    await db.query(
      'ALTER TABLE admin_company_verifications ADD COLUMN IF NOT EXISTS required_documents JSONB NOT NULL DEFAULT \'[]\'::jsonb'
    );
    await db.query(
      'ALTER TABLE admin_company_verifications ADD COLUMN IF NOT EXISTS review_notes TEXT'
    );

    await db.query('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES users(id)');
    await db.query('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP');
    await db.query('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS rejection_reason TEXT');

    this.adminTablesEnsured = true;
  }

  private async syncCompanyVerificationQueue(): Promise<void> {
    await this.ensureAdminTables();
    await db.query(`
      INSERT INTO admin_company_verifications (
        employer_id, company_name, email, industry, employees, location, website, status
      )
      SELECT
        u.id,
        COALESCE(NULLIF(MAX(j.company_name), ''), CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))),
        u.email,
        'General',
        0,
        COALESCE(NULLIF(MAX(j.location), ''), ''),
        NULL,
        'pending'
      FROM users u
      LEFT JOIN jobs j ON j.employer_id = u.id
      WHERE u.role = 'employer' AND u.status <> 'deleted'
      GROUP BY u.id, u.email, u.first_name, u.last_name
      ON CONFLICT (employer_id) DO NOTHING;
    `);
  }

  private getDomainFromEmail(email: string): string {
    const normalized = String(email || '').trim().toLowerCase();
    const at = normalized.lastIndexOf('@');
    if (at === -1) return '';
    return normalized.slice(at + 1);
  }

  private getDomainFromWebsite(website?: string): string {
    if (!website) return '';
    try {
      const raw = String(website).trim();
      const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      const hostname = new URL(withProtocol).hostname.toLowerCase();
      return hostname.startsWith('www.') ? hostname.slice(4) : hostname;
    } catch {
      return '';
    }
  }

  private evaluateCompanyRisk(row: any): {
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    requiresDocuments: boolean;
    requiredDocuments: string[];
    reviewStage: CompanyVerification['reviewStage'];
  } {
    const publicEmailDomains = new Set([
      'gmail.com',
      'yahoo.com',
      'outlook.com',
      'hotmail.com',
      'icloud.com',
      'protonmail.com',
    ]);

    let score = 0;
    const requiredDocuments: string[] = [];

    const emailDomain = this.getDomainFromEmail(row.email);
    const websiteDomain = this.getDomainFromWebsite(row.website);
    const employees = asNumber(row.employees);
    const location = String(row.location || '').trim();
    const hasWebsite = String(row.website || '').trim().length > 0;
    const jobsCount = asNumber(row.jobs_count);

    if (!emailDomain || publicEmailDomains.has(emailDomain)) {
      score += 35;
      requiredDocuments.push('Business registration proof');
    }

    if (!hasWebsite) {
      score += 20;
      requiredDocuments.push('Official company website or profile link');
    }

    if (websiteDomain && emailDomain && websiteDomain !== emailDomain) {
      score += 20;
      requiredDocuments.push('Domain ownership or authorization proof');
    }

    if (!location) {
      score += 10;
      requiredDocuments.push('Registered office address proof');
    }

    if (employees <= 0) {
      score += 15;
    }

    if (jobsCount === 0) {
      score += 10;
    }

    const riskLevel: 'low' | 'medium' | 'high' = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';
    const requiresDocuments = score >= 45;
    const uniqueDocs = Array.from(new Set(requiredDocuments));

    return {
      riskScore: score,
      riskLevel,
      requiresDocuments,
      requiredDocuments: uniqueDocs,
      reviewStage: requiresDocuments ? 'docs_requested' : 'under_manual_review',
    };
  }

  private async refreshCompanyRiskSignals(): Promise<void> {
    await this.ensureAdminTables();
    const result = await db.query(`
      SELECT
        acv.id,
        acv.email,
        acv.website,
        acv.location,
        acv.employees,
        acv.status,
        acv.review_stage,
        acv.documents_submitted,
        COUNT(j.id) as jobs_count
      FROM admin_company_verifications acv
      LEFT JOIN jobs j ON j.employer_id = acv.employer_id
      GROUP BY acv.id, acv.email, acv.website, acv.location, acv.employees, acv.status, acv.review_stage, acv.documents_submitted
    `);

    for (const row of result.rows) {
      if (String(row.status) !== 'pending') continue;

      const evaluated = this.evaluateCompanyRisk(row);
      const nextStage =
        row.review_stage === 'docs_requested' && !row.documents_submitted
          ? 'docs_requested'
          : evaluated.reviewStage;

      await db.query(
        `
          UPDATE admin_company_verifications
          SET
            risk_score = $2,
            risk_level = $3,
            requires_documents = $4,
            required_documents = $5::jsonb,
            review_stage = $6,
            updated_at = NOW()
          WHERE id = $1
        `,
        [
          row.id,
          evaluated.riskScore,
          evaluated.riskLevel,
          evaluated.requiresDocuments,
          JSON.stringify(evaluated.requiredDocuments),
          nextStage,
        ]
      );
    }
  }

  private async safeCount(query: string, params: any[] = []): Promise<number> {
    try {
      const result = await db.query(query, params);
      return parseInt(result.rows[0]?.count || '0', 10);
    } catch {
      return 0;
    }
  }

  async getDashboardStats(): Promise<AdminStats> {
    await this.ensureAdminTables();
    const [totalUsers, totalJobs, totalApplications, activeUsers, pendingJobs, pendingCompanies] =
      await Promise.all([
        this.safeCount('SELECT COUNT(*) as count FROM users'),
        this.safeCount('SELECT COUNT(*) as count FROM jobs'),
        this.safeCount('SELECT COUNT(*) as count FROM job_applications'),
        this.safeCount('SELECT COUNT(*) as count FROM users WHERE status = $1', ['active']),
        this.safeCount("SELECT COUNT(*) as count FROM jobs WHERE status = 'draft'"),
        this.safeCount("SELECT COUNT(*) as count FROM admin_company_verifications WHERE status = 'pending'"),
      ]);

    return {
      totalUsers,
      totalJobs,
      totalApplications,
      activeUsers,
      pendingApprovals: pendingJobs + pendingCompanies,
      totalRevenue: 0,
    };
  }

  async getUsers(filters: {
    role?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ users: User[]; total: number }> {
    const params: any[] = [];
    const whereClauses: string[] = [];

    if (filters.role) {
      params.push(filters.role);
      whereClauses.push(`role = $${params.length}`);
    }

    if (filters.status) {
      params.push(toDbStatus(filters.status as UserStatus));
      whereClauses.push(`status = $${params.length}`);
    }

    if (filters.search) {
      params.push(`%${filters.search}%`);
      whereClauses.push(
        `(email ILIKE $${params.length} OR first_name ILIKE $${params.length} OR last_name ILIKE $${params.length})`
      );
    }

    const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    const usersQuery = `
      SELECT id, email, first_name, last_name, role, status, created_at
      FROM users
      ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countQuery = `SELECT COUNT(*) as count FROM users ${where}`;

    const [usersResult, countResult] = await Promise.all([
      db.query(usersQuery, [...params, limit, offset]),
      db.query(countQuery, params),
    ]);

    return {
      users: usersResult.rows.map(mapUser),
      total: parseInt(countResult.rows[0]?.count || '0', 10),
    };
  }

  async getUserById(userId: string): Promise<User | null> {
    const result = await db.query(
      'SELECT id, email, first_name, last_name, role, status, created_at FROM users WHERE id = $1',
      [userId]
    );
    return result.rows.length > 0 ? mapUser(result.rows[0]) : null;
  }

  async updateUserStatus(userId: string, status: UserStatus): Promise<User> {
    const result = await db.query(
      `
        UPDATE users
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, email, first_name, last_name, role, status, created_at
      `,
      [toDbStatus(status), userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return mapUser(result.rows[0]);
  }

  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    const result = await db.query(
      `
        UPDATE users
        SET role = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, email, first_name, last_name, role, status, created_at
      `,
      [role, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return mapUser(result.rows[0]);
  }

  async deleteUser(userId: string): Promise<boolean> {
    const existing = await db.query('SELECT id, role, status FROM users WHERE id = $1', [userId]);
    if (existing.rows.length === 0) {
      return false;
    }

    const row = existing.rows[0];
    if (row.role === 'admin' && row.status !== 'deleted') {
      const adminCountResult = await db.query(
        "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND status <> 'deleted' AND id <> $1",
        [userId]
      );
      const remainingAdmins = parseInt(adminCountResult.rows[0]?.count || '0', 10);
      if (remainingAdmins === 0) {
        throw new Error('Cannot delete the last admin user');
      }
    }

    const result = await db.query(
      "UPDATE users SET status = 'deleted', updated_at = NOW() WHERE id = $1",
      [userId]
    );
    return (result.rowCount || 0) > 0;
  }

  async getPendingJobs(limit = 20, offset = 0): Promise<{ jobs: JobModeration[]; total: number }> {
    const [jobsResult, countResult] = await Promise.all([
      db.query(
        `
          SELECT
            j.id,
            j.title,
            j.company_name,
            j.location,
            j.city,
            j.country,
            j.salary_min,
            j.salary_max,
            j.salary_currency,
            j.job_type,
            j.status,
            j.applications_count,
            j.created_at,
            j.rejection_reason,
            COALESCE(c.name, 'General') as category_name
          FROM jobs j
          LEFT JOIN job_categories c ON c.id = j.category_id
          WHERE j.status = 'draft'
          ORDER BY j.created_at DESC
          LIMIT $1 OFFSET $2
        `,
        [limit, offset]
      ),
      db.query("SELECT COUNT(*) as count FROM jobs WHERE status = 'draft'"),
    ]);

    return {
      jobs: jobsResult.rows.map((row: any) => mapModerationJob(row)),
      total: parseInt(countResult.rows[0]?.count || '0', 10),
    };
  }

  async approveJob(jobId: string, adminId?: string): Promise<JobModeration> {
    const result = await db.query(
      `
        UPDATE jobs
        SET
          status = 'active',
          moderated_by = $2,
          moderated_at = NOW(),
          rejection_reason = NULL,
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          title,
          company_name,
          location,
          city,
          country,
          salary_min,
          salary_max,
          salary_currency,
          job_type,
          status,
          applications_count,
          created_at,
          rejection_reason,
          (SELECT name FROM job_categories WHERE id = jobs.category_id) as category_name
      `,
      [jobId, adminId || null]
    );

    if (result.rows.length === 0) {
      throw new Error('Job not found');
    }

    return mapModerationJob(result.rows[0]);
  }

  async rejectJob(jobId: string, reason: string, adminId?: string): Promise<JobModeration> {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      throw new Error('Rejection reason is required');
    }

    const result = await db.query(
      `
        UPDATE jobs
        SET
          status = 'closed',
          rejection_reason = $2,
          moderated_by = $3,
          moderated_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          title,
          company_name,
          location,
          city,
          country,
          salary_min,
          salary_max,
          salary_currency,
          job_type,
          status,
          applications_count,
          created_at,
          rejection_reason,
          (SELECT name FROM job_categories WHERE id = jobs.category_id) as category_name
      `,
      [jobId, trimmedReason, adminId || null]
    );

    if (result.rows.length === 0) {
      throw new Error('Job not found');
    }

    return mapModerationJob(result.rows[0]);
  }

  async getJobs(filters: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: any[]; total: number }> {
    const params: any[] = [];
    const whereClauses: string[] = [];

    if (filters.status && filters.status !== 'all') {
      if (filters.status === 'approved') {
        whereClauses.push(`j.status = 'active'`);
      } else if (filters.status === 'rejected') {
        whereClauses.push(`j.status IN ('closed', 'expired')`);
      } else if (filters.status === 'pending') {
        whereClauses.push(`j.status = 'draft'`);
      }
    }

    if (filters.search) {
      params.push(`%${filters.search}%`);
      whereClauses.push(
        `(j.title ILIKE $${params.length} OR j.company_name ILIKE $${params.length} OR j.location ILIKE $${params.length} OR j.city ILIKE $${params.length} OR j.country ILIKE $${params.length})`
      );
    }

    const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    const jobsQuery = `
      SELECT
        j.id,
        j.title,
        j.company_name,
        j.location,
        j.city,
        j.country,
        j.salary_min,
        j.salary_max,
        j.salary_currency,
        j.job_type,
        j.status,
        j.applications_count,
        j.created_at,
        j.rejection_reason,
        COALESCE(c.name, 'General') as category_name
      FROM jobs j
      LEFT JOIN job_categories c ON c.id = j.category_id
      ${where}
      ORDER BY j.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countQuery = `
      SELECT COUNT(*) as count
      FROM jobs j
      ${where}
    `;

    const [jobsResult, countResult] = await Promise.all([
      db.query(jobsQuery, [...params, limit, offset]),
      db.query(countQuery, params),
    ]);

    return {
      jobs: jobsResult.rows.map((row: any) => mapModerationJob(row)),
      total: parseInt(countResult.rows[0]?.count || '0', 10),
    };
  }

  async getJobAnalytics(): Promise<{
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    active: number;
    expired: number;
  }> {
    const [total, approved, pending, rejected, active, expired] = await Promise.all([
      this.safeCount('SELECT COUNT(*) as count FROM jobs'),
      this.safeCount("SELECT COUNT(*) as count FROM jobs WHERE status = 'active'"),
      this.safeCount("SELECT COUNT(*) as count FROM jobs WHERE status = 'draft'"),
      this.safeCount("SELECT COUNT(*) as count FROM jobs WHERE status IN ('closed', 'expired')"),
      this.safeCount("SELECT COUNT(*) as count FROM jobs WHERE status = 'active'"),
      this.safeCount("SELECT COUNT(*) as count FROM jobs WHERE status = 'expired'"),
    ]);

    return { total, approved, pending, rejected, active, expired };
  }

  async getUserAnalytics(): Promise<{
    totalCandidates: number;
    totalEmployers: number;
    activeToday: number;
    newThisMonth: number;
    suspendedCount: number;
  }> {
    const [totalCandidates, totalEmployers, activeToday, newThisMonth, suspendedCount] = await Promise.all([
      this.safeCount("SELECT COUNT(*) as count FROM users WHERE role = 'candidate'"),
      this.safeCount("SELECT COUNT(*) as count FROM users WHERE role = 'employer'"),
      this.safeCount("SELECT COUNT(*) as count FROM users WHERE status = 'active'"),
      this.safeCount("SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_TRUNC('month', NOW())"),
      this.safeCount("SELECT COUNT(*) as count FROM users WHERE status = 'suspended'"),
    ]);

    return {
      totalCandidates,
      totalEmployers,
      activeToday,
      newThisMonth,
      suspendedCount,
    };
  }

  async getSystemSettings(): Promise<SystemSettings> {
    await this.ensureAdminTables();
    const result = await db.query('SELECT * FROM admin_system_settings WHERE id = 1 LIMIT 1');
    const row = result.rows[0] || {};

    return {
      siteName: String(row.site_name || DEFAULT_SETTINGS.siteName),
      siteDescription: String(row.site_description || DEFAULT_SETTINGS.siteDescription),
      maxJobsPerDay: asNumber(row.max_jobs_per_day || DEFAULT_SETTINGS.maxJobsPerDay),
      maxApplicationsPerDay: asNumber(
        row.max_applications_per_day || DEFAULT_SETTINGS.maxApplicationsPerDay
      ),
      autoExpireJobsDays: asNumber(row.auto_expire_jobs_days || DEFAULT_SETTINGS.autoExpireJobsDays),
      notificationEmail: String(row.notification_email || DEFAULT_SETTINGS.notificationEmail),
      maintenanceMode: Boolean(row.maintenance_mode),
      emailNotificationsEnabled: Boolean(row.email_notifications_enabled),
    };
  }

  async updateSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    await this.ensureAdminTables();

    const merged = {
      ...(await this.getSystemSettings()),
      ...settings,
    };

    if (
      merged.maxJobsPerDay < 0 ||
      merged.maxApplicationsPerDay < 0 ||
      merged.autoExpireJobsDays < 0
    ) {
      throw new Error('Invalid settings values');
    }

    await db.query(
      `
        UPDATE admin_system_settings
        SET
          site_name = $1,
          site_description = $2,
          max_jobs_per_day = $3,
          max_applications_per_day = $4,
          auto_expire_jobs_days = $5,
          notification_email = $6,
          maintenance_mode = $7,
          email_notifications_enabled = $8,
          updated_at = NOW()
        WHERE id = 1
      `,
      [
        merged.siteName,
        merged.siteDescription,
        merged.maxJobsPerDay,
        merged.maxApplicationsPerDay,
        merged.autoExpireJobsDays,
        merged.notificationEmail,
        merged.maintenanceMode,
        merged.emailNotificationsEnabled,
      ]
    );

    return this.getSystemSettings();
  }

  async getEmailTemplates(): Promise<EmailTemplate[]> {
    await this.ensureAdminTables();
    const result = await db.query(
      'SELECT id, name, type, subject, content FROM admin_email_templates ORDER BY name ASC'
    );
    return result.rows.map((row: any) => ({
      id: String(row.id || ''),
      name: String(row.name || ''),
      type: String(row.type || ''),
      subject: String(row.subject || ''),
      content: String(row.content || ''),
    }));
  }

  async updateEmailTemplate(templateId: string, subject: string, content: string): Promise<EmailTemplate> {
    await this.ensureAdminTables();

    const normalizedId = String(templateId || '').trim();
    if (!normalizedId) {
      throw new Error('Invalid template ID');
    }
    if (!String(subject || '').trim()) {
      throw new Error('Subject is required');
    }
    if (!String(content || '').trim()) {
      throw new Error('Content is required');
    }

    const result = await db.query(
      `
        INSERT INTO admin_email_templates (id, name, type, subject, content, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (id)
        DO UPDATE SET
          subject = EXCLUDED.subject,
          content = EXCLUDED.content,
          updated_at = NOW()
        RETURNING id, name, type, subject, content
      `,
      [normalizedId, `Template ${normalizedId}`, normalizedId, subject, content]
    );

    const row = result.rows[0];
    return {
      id: String(row.id || ''),
      name: String(row.name || ''),
      type: String(row.type || ''),
      subject: String(row.subject || ''),
      content: String(row.content || ''),
    };
  }

  async getActivityLogs(
    limit = 100,
    offset = 0
  ): Promise<{ logs: any[]; total: number }> {
    await this.ensureAdminTables();
    const [logsResult, countResult] = await Promise.all([
      db.query(
        `
          SELECT
            l.id,
            l.admin_id,
            l.action,
            l.description,
            l.target_id,
            l.target_type,
            l.created_at,
            u.email as admin_email,
            TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) as admin_name
          FROM admin_activity_logs l
          LEFT JOIN users u ON u.id = l.admin_id
          ORDER BY l.created_at DESC
          LIMIT $1 OFFSET $2
        `,
        [limit, offset]
      ),
      db.query('SELECT COUNT(*) as count FROM admin_activity_logs'),
    ]);

    return {
      logs: logsResult.rows.map((row: any) => ({
        id: String(row.id || ''),
        adminId: row.admin_id ? String(row.admin_id) : null,
        adminName: String(row.admin_name || row.admin_email || 'System'),
        adminEmail: row.admin_email ? String(row.admin_email) : null,
        action: String(row.action || ''),
        description: String(row.description || ''),
        targetId: row.target_id ? String(row.target_id) : null,
        targetType: row.target_type ? String(row.target_type) : null,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      })),
      total: parseInt(countResult.rows[0]?.count || '0', 10),
    };
  }

  async logAdminAction(
    adminId: string | undefined,
    action: string,
    description: string,
    targetId?: string,
    targetType?: string
  ): Promise<void> {
    await this.ensureAdminTables();
    await db.query(
      `
        INSERT INTO admin_activity_logs (admin_id, action, description, target_id, target_type)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [adminId || null, action, description, targetId || null, targetType || null]
    );
  }

  async getCompanies(filters: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ companies: CompanyVerification[]; total: number }> {
    await this.syncCompanyVerificationQueue();
    await this.refreshCompanyRiskSignals();

    const params: any[] = [];
    const whereClauses: string[] = [];

    if (filters.status && filters.status !== 'all') {
      params.push(filters.status);
      whereClauses.push(`status = $${params.length}`);
    }

    if (filters.search) {
      params.push(`%${filters.search}%`);
      whereClauses.push(
        `(company_name ILIKE $${params.length} OR email ILIKE $${params.length} OR location ILIKE $${params.length})`
      );
    }

    const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    const [companiesResult, countResult] = await Promise.all([
      db.query(
        `
          SELECT *
          FROM admin_company_verifications
          ${where}
          ORDER BY submitted_at DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `,
        [...params, limit, offset]
      ),
      db.query(`SELECT COUNT(*) as count FROM admin_company_verifications ${where}`, params),
    ]);

    return {
      companies: companiesResult.rows.map((row: any) => mapCompanyVerification(row)),
      total: parseInt(countResult.rows[0]?.count || '0', 10),
    };
  }

  async getCompaniesForVerification(
    limit = 20,
    offset = 0
  ): Promise<{ companies: CompanyVerification[]; total: number }> {
    return this.getCompanies({
      status: 'pending',
      limit,
      offset,
    });
  }

  async verifyCompany(
    companyId: string,
    options?: {
      level?: 'basic' | 'full';
      reviewNotes?: string;
      overrideDocuments?: boolean;
    }
  ): Promise<CompanyVerification> {
    await this.syncCompanyVerificationQueue();
    const level = options?.level === 'full' ? 'full' : 'basic';
    const overrideDocuments = Boolean(options?.overrideDocuments);

    const existing = await db.query(
      `
        SELECT id, requires_documents, documents_submitted
        FROM admin_company_verifications
        WHERE id = $1
        LIMIT 1
      `,
      [companyId]
    );
    if (existing.rows.length === 0) {
      throw new Error('Company not found');
    }

    const row = existing.rows[0];
    const requiresDocuments = Boolean(row.requires_documents);
    const documentsSubmitted = Boolean(row.documents_submitted);

    if (level === 'full' && requiresDocuments && !documentsSubmitted && !overrideDocuments) {
      throw new Error('Documents are required before full verification');
    }

    const result = await db.query(
      `
        UPDATE admin_company_verifications
        SET
          status = 'verified',
          verification_level = $2,
          review_stage = $3,
          rejection_reason = NULL,
          review_notes = COALESCE($4, review_notes),
          verified_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [companyId, level, level === 'full' ? 'approved_full' : 'approved_basic', options?.reviewNotes || null]
    );

    if (result.rows.length === 0) {
      throw new Error('Company not found');
    }

    return mapCompanyVerification(result.rows[0]);
  }

  async rejectCompanyVerification(companyId: string, reason: string): Promise<CompanyVerification> {
    await this.syncCompanyVerificationQueue();
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      throw new Error('Rejection reason is required');
    }

    const result = await db.query(
      `
        UPDATE admin_company_verifications
        SET
          status = 'rejected',
          review_stage = 'rejected',
          rejection_reason = $2,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [companyId, trimmedReason]
    );

    if (result.rows.length === 0) {
      throw new Error('Company not found');
    }

    return mapCompanyVerification(result.rows[0]);
  }

  async requestCompanyDocuments(
    companyId: string,
    reason: string,
    requiredDocuments: string[]
  ): Promise<CompanyVerification> {
    await this.syncCompanyVerificationQueue();
    const cleanReason = String(reason || '').trim();
    if (!cleanReason) {
      throw new Error('Reason is required');
    }

    const cleanDocs = Array.from(
      new Set(
        (requiredDocuments || [])
          .map((item) => String(item || '').trim())
          .filter(Boolean)
      )
    );

    const result = await db.query(
      `
        UPDATE admin_company_verifications
        SET
          status = 'pending',
          review_stage = 'docs_requested',
          requires_documents = TRUE,
          required_documents = $3::jsonb,
          documents_submitted = FALSE,
          review_notes = $2,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [companyId, cleanReason, JSON.stringify(cleanDocs)]
    );

    if (result.rows.length === 0) {
      throw new Error('Company not found');
    }

    return mapCompanyVerification(result.rows[0]);
  }

  async markCompanyDocumentsReceived(
    companyId: string,
    reviewNotes?: string
  ): Promise<CompanyVerification> {
    await this.syncCompanyVerificationQueue();
    const result = await db.query(
      `
        UPDATE admin_company_verifications
        SET
          documents_submitted = TRUE,
          review_stage = 'under_manual_review',
          review_notes = COALESCE($2, review_notes),
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [companyId, reviewNotes || null]
    );

    if (result.rows.length === 0) {
      throw new Error('Company not found');
    }

    return mapCompanyVerification(result.rows[0]);
  }
}

export default new AdminService();
