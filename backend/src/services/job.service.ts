import { v4 as uuidv4 } from 'uuid';
import { db } from '@/utils/database';
import { logger } from '@/utils/logger';
import { Job, JobStatus, JobType, JobCategory, JobSearchFilters } from '@/types/job';

/**
 * Job Service
 * Handles all job-related business logic
 * Maps from legacy: add-job.php, jobs.php, search.php, etc.
 */
class JobService {
  /**
   * Create a new job posting
   */
  async createJob(
    employerId: string,
    data: {
      title: string;
      description: string;
      requirements: string[];
      salaryMin?: number;
      salaryMax?: number;
      salaryCurrency?: string;
      jobType?: JobType;
      experienceLevel: string;
      location: string;
      country: string;
      city: string;
      categoryId?: string;
      subcategoryId?: string;
      companyName?: string;
      companyLogoUrl?: string;
      isRemote?: boolean;
      isUrgent?: boolean;
      deadline: Date;
    }
  ): Promise<Job> {
    try {
      const jobId = uuidv4();
      const resolvedCategory = await this.resolveCategoryAndSubcategory(
        data.categoryId,
        data.subcategoryId
      );
      const resolvedCompanyName = await this.resolveCompanyName(
        employerId,
        data.companyName
      );
      const requirements =
        Array.isArray(data.requirements) && data.requirements.length > 0
          ? data.requirements
          : [];

      const query = `
        INSERT INTO jobs (
          id, employer_id, title, description, requirements, salary_min, salary_max,
          salary_currency, job_type, experience_level, location, country, city,
          category_id, subcategory_id, company_name, company_logo_url,
          is_remote, is_urgent, deadline, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW())
        RETURNING *;
      `;

      const result = await db.query(query, [
        jobId,
        employerId,
        data.title,
        data.description,
        JSON.stringify(requirements),
        data.salaryMin || 0,
        data.salaryMax || 0,
        data.salaryCurrency || 'USD',
        data.jobType || JobType.FULL_TIME,
        data.experienceLevel,
        data.location,
        data.country,
        data.city,
        resolvedCategory.categoryId,
        resolvedCategory.subcategoryId,
        resolvedCompanyName,
        data.companyLogoUrl || null,
        data.isRemote || false,
        data.isUrgent || false,
        data.deadline,
        JobStatus.DRAFT,
      ]);

      logger.info(`Job created: ${jobId} by employer ${employerId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating job', error);
      throw error;
    }
  }

  /**
   * Get job by ID
   */
  async getJobById(jobId: string): Promise<Job | null> {
    try {
      const query = 'SELECT * FROM jobs WHERE id = $1;';
      const result = await db.query(query, [jobId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting job', error);
      throw error;
    }
  }

  /**
   * Update job details
   */
  async updateJob(jobId: string, employerId: string, data: Partial<Job>): Promise<Job> {
    try {
      const job = await this.getJobById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      if (job.employer_id !== employerId) {
        throw new Error('Unauthorized: You can only edit your own jobs');
      }

      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && !['id', 'employer_id', 'created_at'].includes(key)) {
          updates.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (updates.length === 0) {
        return job;
      }

      values.push(jobId);
      const query = `UPDATE jobs SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *;`;

      const result = await db.query(query, values);
      logger.info(`Job updated: ${jobId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating job', error);
      throw error;
    }
  }

  /**
   * Publish job (change status from draft to active)
   */
  async publishJob(jobId: string, employerId: string): Promise<Job> {
    try {
      const job = await this.getJobById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      if (job.employer_id !== employerId) {
        throw new Error('Unauthorized');
      }

      if (job.status !== JobStatus.DRAFT) {
        throw new Error('Only draft jobs can be published');
      }

      const query = `UPDATE jobs SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *;`;
      const result = await db.query(query, [JobStatus.ACTIVE, jobId]);

      logger.info(`Job published: ${jobId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error publishing job', error);
      throw error;
    }
  }

  /**
   * Close job posting
   */
  async closeJob(jobId: string, employerId: string): Promise<Job> {
    try {
      const job = await this.getJobById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      if (job.employer_id !== employerId) {
        throw new Error('Unauthorized');
      }

      const query = `UPDATE jobs SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *;`;
      const result = await db.query(query, [JobStatus.CLOSED, jobId]);

      logger.info(`Job closed: ${jobId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error closing job', error);
      throw error;
    }
  }

  /**
   * Delete job
   */
  async deleteJob(jobId: string, employerId: string): Promise<void> {
    try {
      const job = await this.getJobById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      if (job.employer_id !== employerId) {
        throw new Error('Unauthorized');
      }

      await db.query('DELETE FROM jobs WHERE id = $1;', [jobId]);
      logger.info(`Job deleted: ${jobId}`);
    } catch (error) {
      logger.error('Error deleting job', error);
      throw error;
    }
  }

  /**
   * Search jobs with filters
   * Maps from legacy: search.php
   */
  async searchJobs(filters: JobSearchFilters): Promise<{ jobs: Job[]; total: number }> {
    try {
      let query = 'SELECT * FROM jobs WHERE status = $1';
      const params: any[] = [JobStatus.ACTIVE];
      let paramIndex = 2;

      // Keyword search (title and description)
      if (filters.keyword) {
        query += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        params.push(`%${filters.keyword}%`);
        paramIndex++;
      }

      // Category filter
      if (filters.category_id) {
        query += ` AND category_id = $${paramIndex}`;
        params.push(filters.category_id);
        paramIndex++;
      }

      // Location filter
      if (filters.location) {
        query += ` AND location ILIKE $${paramIndex}`;
        params.push(`%${filters.location}%`);
        paramIndex++;
      }

      if (filters.country) {
        query += ` AND country = $${paramIndex}`;
        params.push(filters.country);
        paramIndex++;
      }

      if (filters.city) {
        query += ` AND city = $${paramIndex}`;
        params.push(filters.city);
        paramIndex++;
      }

      // Job type filter
      if (filters.job_type) {
        query += ` AND job_type = $${paramIndex}`;
        params.push(filters.job_type);
        paramIndex++;
      }

      // Experience level filter
      if (filters.experience_level) {
        query += ` AND experience_level = $${paramIndex}`;
        params.push(filters.experience_level);
        paramIndex++;
      }

      // Salary range filter
      if (filters.salary_min !== undefined) {
        query += ` AND salary_max >= $${paramIndex}`;
        params.push(filters.salary_min);
        paramIndex++;
      }

      if (filters.salary_max !== undefined) {
        query += ` AND salary_min <= $${paramIndex}`;
        params.push(filters.salary_max);
        paramIndex++;
      }

      // Remote filter
      if (filters.is_remote !== undefined) {
        query += ` AND is_remote = $${paramIndex}`;
        params.push(filters.is_remote);
        paramIndex++;
      }

      // Featured filter
      if (filters.is_featured !== undefined) {
        query += ` AND is_featured = $${paramIndex}`;
        params.push(filters.is_featured);
        paramIndex++;
      }

      // Sorting
      const sortField = this.getSortField(filters.sort);
      query += ` ORDER BY ${sortField} DESC`;

      // Pagination
      const limit = filters.limit || 10;
      const page = filters.page || 1;
      const offset = (page - 1) * limit;

      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      // Get total count
      const countQuery = `SELECT COUNT(*) as count FROM jobs WHERE status = $1${
        filters.keyword ? ` AND (title ILIKE $2 OR description ILIKE $2)` : ''
      }`;
      const countParams: Array<string | JobStatus> = [JobStatus.ACTIVE];
      if (filters.keyword) {
        countParams.push(`%${filters.keyword}%`);
      }
      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count, 10);

      const result = await db.query(query, params);

      return { jobs: result.rows, total };
    } catch (error) {
      logger.error('Error searching jobs', error);
      throw error;
    }
  }

  /**
   * Get featured jobs
   */
  async getFeaturedJobs(limit = 10): Promise<Job[]> {
    try {
      const query = `
        SELECT * FROM jobs 
        WHERE status = $1 AND is_featured = TRUE
        ORDER BY created_at DESC
        LIMIT $2;
      `;
      const result = await db.query(query, [JobStatus.ACTIVE, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting featured jobs', error);
      throw error;
    }
  }

  /**
   * Get employer's jobs
   */
  async getEmployerJobs(employerId: string, status?: JobStatus): Promise<Job[]> {
    try {
      let query = 'SELECT * FROM jobs WHERE employer_id = $1';
      const params: any[] = [employerId];

      if (status) {
        query += ` AND status = $2`;
        params.push(status);
      }

      query += ' ORDER BY created_at DESC;';

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting employer jobs', error);
      throw error;
    }
  }

  /**
   * Get job categories
   */
  async getCategories(): Promise<JobCategory[]> {
    try {
      const query = `
        SELECT * FROM job_categories 
        WHERE is_active = TRUE
        ORDER BY name;
      `;
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting categories', error);
      throw error;
    }
  }

  /**
   * Increment job views
   */
  async incrementJobViews(jobId: string): Promise<void> {
    try {
      await db.query(
        'UPDATE jobs SET views_count = views_count + 1 WHERE id = $1',
        [jobId]
      );
    } catch (error) {
      logger.error('Error incrementing job views', error);
    }
  }

  /**
   * Mark job as featured
   */
  async markAsFeatured(jobId: string, employerId: string): Promise<Job> {
    try {
      const job = await this.getJobById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      if (job.employer_id !== employerId) {
        throw new Error('Unauthorized');
      }

      const query = 'UPDATE jobs SET is_featured = NOT is_featured, updated_at = NOW() WHERE id = $1 RETURNING *;';
      const result = await db.query(query, [jobId]);

      logger.info(`Job marked as featured: ${jobId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error marking job as featured', error);
      throw error;
    }
  }

  /**
   * Save job for candidate
   * Maps from legacy: addwishlist.php
   */
  async saveJob(jobId: string, candidateId: string): Promise<{ id: string; job_id: string; candidate_id: string }> {
    try {
      const job = await this.getJobById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Check if already saved
      const checkQuery = 'SELECT id FROM saved_jobs WHERE job_id = $1 AND candidate_id = $2;';
      const checkResult = await db.query(checkQuery, [jobId, candidateId]);

      if (checkResult.rows.length > 0) {
        throw new Error('Job already saved');
      }

      const savedJobId = uuidv4();
      const query = `
        INSERT INTO saved_jobs (id, job_id, candidate_id, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING id, job_id, candidate_id;
      `;

      const result = await db.query(query, [savedJobId, jobId, candidateId]);

      logger.info(`Job saved by candidate: ${candidateId} - ${jobId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error saving job', error);
      throw error;
    }
  }

  /**
   * Unsave (remove) job for candidate
   * Maps from legacy: removewishlist.php
   */
  async unsaveJob(jobId: string, candidateId: string): Promise<void> {
    try {
      const query = 'DELETE FROM saved_jobs WHERE job_id = $1 AND candidate_id = $2;';
      await db.query(query, [jobId, candidateId]);

      logger.info(`Job unsaved by candidate: ${candidateId} - ${jobId}`);
    } catch (error) {
      logger.error('Error unsaving job', error);
      throw error;
    }
  }

  /**
   * Get candidate's saved jobs
   */
  async getSavedJobs(
    candidateId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ jobs: Job[]; total: number }> {
    try {
      const query = `
        SELECT j.* FROM jobs j
        INNER JOIN saved_jobs s ON j.id = s.job_id
        WHERE s.candidate_id = $1
        ORDER BY s.created_at DESC
        LIMIT $2 OFFSET $3;
      `;

      const countQuery = `
        SELECT COUNT(*) as total FROM saved_jobs
        WHERE candidate_id = $1;
      `;

      const [jobsResult, countResult] = await Promise.all([
        db.query(query, [candidateId, limit, offset]),
        db.query(countQuery, [candidateId])
      ]);

      logger.info(`Retrieved saved jobs for candidate: ${candidateId}`);

      return {
        jobs: jobsResult.rows,
        total: parseInt(countResult.rows[0].total)
      };
    } catch (error) {
      logger.error('Error getting saved jobs', error);
      throw error;
    }
  }

  /**
   * Check if job is saved by candidate
   */
  async isJobSaved(jobId: string, candidateId: string): Promise<boolean> {
    try {
      const query = `
        SELECT id FROM saved_jobs
        WHERE job_id = $1 AND candidate_id = $2;
      `;

      const result = await db.query(query, [jobId, candidateId]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking if job is saved', error);
      throw error;
    }
  }

  /**
   * Get count of saved jobs for candidate
   */
  async getSavedJobsCount(candidateId: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count FROM saved_jobs
        WHERE candidate_id = $1;
      `;

      const result = await db.query(query, [candidateId]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting saved jobs count', error);
      throw error;
    }
  }

  /**
   * Private: Get sort field based on sort parameter
   */
  private getSortField(sort?: string): string {
    switch (sort) {
      case 'salary':
        return 'salary_max';
      case 'trending':
        return 'applications_count';
      case 'relevant':
        return 'is_featured';
      case 'recent':
      default:
        return 'created_at';
    }
  }

  async getSubcategories(categoryId?: string): Promise<any[]> {
    try {
      if (categoryId) {
        const filtered = await db.query(
          `
            SELECT id, category_id, name, slug, description, is_active
            FROM job_subcategories
            WHERE category_id = $1 AND is_active = TRUE
            ORDER BY name ASC
          `,
          [categoryId]
        );
        return filtered.rows;
      }

      const all = await db.query(
        `
          SELECT id, category_id, name, slug, description, is_active
          FROM job_subcategories
          WHERE is_active = TRUE
          ORDER BY name ASC
        `
      );
      return all.rows;
    } catch (error) {
      logger.error('Error getting subcategories', error);
      throw error;
    }
  }

  private async resolveCategoryAndSubcategory(
    categoryId?: string,
    subcategoryId?: string
  ): Promise<{ categoryId: string; subcategoryId: string }> {
    if (categoryId) {
      const categoryCheck = await db.query(
        `
          SELECT id
          FROM job_categories
          WHERE id = $1 AND is_active = TRUE
          LIMIT 1
        `,
        [categoryId]
      );

      if (categoryCheck.rows.length === 0) {
        throw new Error('Selected job category is not active');
      }

      if (subcategoryId) {
        const exact = await db.query(
          `
            SELECT id
            FROM job_subcategories
            WHERE id = $1 AND category_id = $2 AND is_active = TRUE
            LIMIT 1
          `,
          [subcategoryId, categoryId]
        );
        if (exact.rows.length > 0) {
          return { categoryId, subcategoryId: exact.rows[0].id };
        }
      }

      const fallback = await db.query(
        `
          SELECT id
          FROM job_subcategories
          WHERE category_id = $1 AND is_active = TRUE
          ORDER BY created_at ASC
          LIMIT 1
        `,
        [categoryId]
      );

      if (fallback.rows.length > 0) {
        return { categoryId, subcategoryId: fallback.rows[0].id };
      }

      throw new Error('No active subcategory found for selected category');
    }

    const firstAvailable = async () =>
      db.query(
        `
          SELECT c.id AS category_id, s.id AS subcategory_id
          FROM job_categories c
          JOIN job_subcategories s ON s.category_id = c.id
          WHERE c.is_active = TRUE AND s.is_active = TRUE
          ORDER BY c.created_at ASC, s.created_at ASC
          LIMIT 1
        `
      );

    let pair = await firstAvailable();

    if (pair.rows.length === 0) {
      await this.seedDefaultTaxonomy();
      pair = await firstAvailable();
    }

    if (pair.rows.length === 0) {
      throw new Error('No active category/subcategory available');
    }

    return {
      categoryId: pair.rows[0].category_id,
      subcategoryId: pair.rows[0].subcategory_id,
    };
  }

  private async seedDefaultTaxonomy(): Promise<void> {
    await db.query(
      `
        INSERT INTO job_categories (id, name, slug, description, is_active, created_at, updated_at)
        VALUES
          (gen_random_uuid(), 'Engineering', 'engineering', 'Software and engineering roles', TRUE, NOW(), NOW()),
          (gen_random_uuid(), 'Product', 'product', 'Product and strategy roles', TRUE, NOW(), NOW()),
          (gen_random_uuid(), 'Design', 'design', 'Design and UX roles', TRUE, NOW(), NOW())
        ON CONFLICT (slug) DO NOTHING;
      `
    );

    await db.query(
      `
        INSERT INTO job_subcategories (id, category_id, name, slug, description, is_active, created_at, updated_at)
        SELECT
          gen_random_uuid(),
          c.id,
          v.name,
          v.slug,
          v.description,
          TRUE,
          NOW(),
          NOW()
        FROM (
          VALUES
            ('engineering', 'Backend Engineering', 'backend-engineering', 'Backend and API engineering'),
            ('engineering', 'Frontend Engineering', 'frontend-engineering', 'Frontend and UI engineering'),
            ('product', 'Product Management', 'product-management', 'Product planning and execution'),
            ('design', 'UX/UI Design', 'ux-ui-design', 'User experience and visual design')
        ) AS v(category_slug, name, slug, description)
        JOIN job_categories c ON c.slug = v.category_slug
        ON CONFLICT (category_id, slug) DO NOTHING;
      `
    );
  }

  private async resolveCompanyName(
    employerId: string,
    companyName?: string
  ): Promise<string> {
    if (companyName && companyName.trim().length > 0) {
      return companyName.trim();
    }

    const userResult = await db.query(
      `
        SELECT first_name, last_name
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [employerId]
    );

    if (userResult.rows.length === 0) {
      return 'Company';
    }

    const row = userResult.rows[0];
    const name = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
    return name.length > 0 ? `${name} Company` : 'Company';
  }
}

export const jobService = new JobService();
