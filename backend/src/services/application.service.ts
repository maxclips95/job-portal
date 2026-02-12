import { Logger } from '@/utils/logger';
import { JobApplication, Interview, JobOffer, ApplicationStatus } from '@/types/application';

const logger = new Logger('ApplicationService');

export class ApplicationService {
  constructor(private db: any) {}

  /**
   * Apply for a job
   */
  async applyForJob(
    jobId: string,
    candidateId: string,
    coverLetter?: string,
    resumeUrl?: string
  ): Promise<JobApplication> {
    try {
      // Check if job exists
      const jobCheck = await this.db.query('SELECT id FROM jobs WHERE id = $1', [jobId]);
      if (jobCheck.rows.length === 0) {
        throw new Error('Job not found');
      }

      // Check if already applied
      const existingApp = await this.db.query(
        'SELECT id FROM job_applications WHERE job_id = $1 AND candidate_id = $2',
        [jobId, candidateId]
      );

      if (existingApp.rows.length > 0) {
        throw new Error('You have already applied for this job');
      }

      const result = await this.db.query(
        `INSERT INTO job_applications (job_id, candidate_id, cover_letter, resume_url, status)
         VALUES ($1, $2, $3, $4, 'applied')
         RETURNING id, job_id, candidate_id, cover_letter, resume_url, status, applied_at, created_at, updated_at`,
        [jobId, candidateId, coverLetter, resumeUrl]
      );

      // Increment applications count
      await this.db.query(
        'UPDATE jobs SET applications_count = applications_count + 1 WHERE id = $1',
        [jobId]
      );

      logger.info(`Application created for job ${jobId} by candidate ${candidateId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error applying for job:', error);
      throw error;
    }
  }

  /**
   * Get applications for a specific job (employer view)
   */
  async getJobApplications(
    jobId: string,
    employerId: string,
    status?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ applications: any[]; total: number }> {
    try {
      // Verify employer owns this job
      const jobCheck = await this.db.query(
        'SELECT id FROM jobs WHERE id = $1 AND employer_id = $2',
        [jobId, employerId]
      );

      if (jobCheck.rows.length === 0) {
        throw new Error('Job not found or unauthorized');
      }

      const offset = (page - 1) * limit;
      const countParams: any[] = [jobId];
      let countQuery = 'SELECT COUNT(*) as count FROM job_applications WHERE job_id = $1';
      if (status) {
        countQuery += ' AND status = $2';
        countParams.push(status);
      }
      const countResult = await this.db.query(countQuery, countParams);

      const dataParams: any[] = [jobId];
      let statusClause = '';
      if (status) {
        statusClause = 'AND ja.status = $2';
        dataParams.push(status);
      }
      dataParams.push(limit, offset);

      const result = await this.db.query(
        `
          SELECT
            ja.*,
            j.title AS job_title,
            j.company_name,
            u.first_name,
            u.last_name,
            u.email,
            u.phone,
            i.id AS interview_id,
            i.scheduled_at,
            i.interview_type,
            jo.id AS offer_id,
            jo.status AS offer_status
          FROM job_applications ja
          JOIN jobs j ON j.id = ja.job_id
          JOIN users u ON u.id = ja.candidate_id
          LEFT JOIN LATERAL (
            SELECT id, scheduled_at, interview_type
            FROM interviews
            WHERE application_id = ja.id
            ORDER BY created_at DESC
            LIMIT 1
          ) i ON TRUE
          LEFT JOIN LATERAL (
            SELECT id, status
            FROM job_offers
            WHERE application_id = ja.id
            ORDER BY created_at DESC
            LIMIT 1
          ) jo ON TRUE
          WHERE ja.job_id = $1
          ${statusClause}
          ORDER BY ja.applied_at DESC
          LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
        `,
        dataParams
      );

      return {
        applications: result.rows,
        total: parseInt(countResult.rows[0].count),
      };
    } catch (error) {
      logger.error('Error fetching job applications:', error);
      throw error;
    }
  }

  /**
   * Get applications for a candidate
   */
  async getCandidateApplications(
    candidateId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ applications: any[]; total: number }> {
    try {
      // Get total count
      const countResult = await this.db.query(
        'SELECT COUNT(*) as count FROM job_applications WHERE candidate_id = $1',
        [candidateId]
      );

      const offset = (page - 1) * limit;
      const result = await this.db.query(
        `SELECT ja.*, j.title as job_title, j.company_name, j.city, j.country
         FROM job_applications ja
         JOIN jobs j ON j.id = ja.job_id
         WHERE ja.candidate_id = $1
         ORDER BY ja.applied_at DESC
         LIMIT $2 OFFSET $3`,
        [candidateId, limit, offset]
      );

      return {
        applications: result.rows,
        total: parseInt(countResult.rows[0].count),
      };
    } catch (error) {
      logger.error('Error fetching candidate applications:', error);
      throw error;
    }
  }

  /**
   * Update application status
   */
  async updateApplicationStatus(
    applicationId: string,
    status: ApplicationStatus,
    employerId: string
  ): Promise<JobApplication> {
    try {
      // Verify employer has permission
      const appCheck = await this.db.query(
        `SELECT ja.id FROM job_applications ja
         JOIN jobs j ON j.id = ja.job_id
         WHERE ja.id = $1 AND j.employer_id = $2`,
        [applicationId, employerId]
      );

      if (appCheck.rows.length === 0) {
        throw new Error('Application not found or unauthorized');
      }

      const result = await this.db.query(
        `UPDATE job_applications 
         SET status = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 
         RETURNING *`,
        [status, applicationId]
      );

      logger.info(`Application ${applicationId} status updated to ${status}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating application status:', error);
      throw error;
    }
  }

  /**
   * Rate an application
   */
  async rateApplication(
    applicationId: string,
    rating: number,
    notes: string,
    employerId: string
  ): Promise<JobApplication> {
    try {
      if (rating < 0 || rating > 5) {
        throw new Error('Rating must be between 0 and 5');
      }

      // Verify employer has permission
      const appCheck = await this.db.query(
        `SELECT ja.id FROM job_applications ja
         JOIN jobs j ON j.id = ja.job_id
         WHERE ja.id = $1 AND j.employer_id = $2`,
        [applicationId, employerId]
      );

      if (appCheck.rows.length === 0) {
        throw new Error('Application not found or unauthorized');
      }

      const result = await this.db.query(
        `UPDATE job_applications 
         SET rating = $1, notes = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $3 
         RETURNING *`,
        [rating, notes, applicationId]
      );

      logger.info(`Application ${applicationId} rated ${rating}/5`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error rating application:', error);
      throw error;
    }
  }

  /**
   * Withdraw application
   */
  async withdrawApplication(applicationId: string, candidateId: string): Promise<JobApplication> {
    try {
      // Verify candidate owns this application
      const appCheck = await this.db.query(
        'SELECT id, job_id FROM job_applications WHERE id = $1 AND candidate_id = $2',
        [applicationId, candidateId]
      );

      if (appCheck.rows.length === 0) {
        throw new Error('Application not found');
      }

      const jobId = appCheck.rows[0].job_id;

      const result = await this.db.query(
        `UPDATE job_applications 
         SET status = 'withdrawn', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1 
         RETURNING *`,
        [applicationId]
      );

      // Decrement applications count
      await this.db.query(
        'UPDATE jobs SET applications_count = applications_count - 1 WHERE id = $1',
        [jobId]
      );

      logger.info(`Application ${applicationId} withdrawn by candidate ${candidateId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error withdrawing application:', error);
      throw error;
    }
  }

  /**
   * Get application details
   */
  async getApplicationDetails(applicationId: string): Promise<any> {
    try {
      const result = await this.db.query(
        `SELECT ja.*, j.title as job_title, j.company_name, j.city, j.country,
                u.email as candidate_email, u.first_name, u.last_name
         FROM job_applications ja
         JOIN jobs j ON j.id = ja.job_id
         JOIN users u ON u.id = ja.candidate_id
         WHERE ja.id = $1`,
        [applicationId]
      );

      if (result.rows.length === 0) {
        throw new Error('Application not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching application details:', error);
      throw error;
    }
  }

  /**
   * Schedule interview
   */
  async scheduleInterview(
    applicationId: string,
    interviewType: 'phone' | 'video' | 'in_person' | 'written',
    scheduledAt: Date,
    durationMinutes: number,
    interviewLink?: string,
    interviewerId?: string,
    employerId?: string
  ): Promise<Interview> {
    try {
      if (employerId) {
        const access = await this.db.query(
          `
            SELECT ja.id
            FROM job_applications ja
            JOIN jobs j ON j.id = ja.job_id
            WHERE ja.id = $1 AND j.employer_id = $2
            LIMIT 1
          `,
          [applicationId, employerId]
        );

        if (access.rows.length === 0) {
          throw new Error('Application not found or unauthorized');
        }
      }

      const result = await this.db.query(
        `INSERT INTO interviews (
          application_id, interview_type, status, scheduled_at, duration_minutes, interview_link, interviewer_id
        ) VALUES ($1, $2, 'scheduled', $3, $4, $5, $6)
         RETURNING id, application_id, interview_type, status, scheduled_at, duration_minutes, interview_link, interviewer_id, created_at`,
        [applicationId, interviewType, scheduledAt, durationMinutes, interviewLink, interviewerId]
      );

      logger.info(`Interview scheduled for application ${applicationId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error scheduling interview:', error);
      throw error;
    }
  }

  /**
   * Get interviews for an application
   */
  async getApplicationInterviews(applicationId: string): Promise<Interview[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM interviews WHERE application_id = $1 ORDER BY scheduled_at DESC',
        [applicationId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching interviews:', error);
      throw error;
    }
  }

  /**
   * Update interview
   */
  async updateInterview(
    interviewId: string,
    updates: Partial<Interview>
  ): Promise<Interview> {
    try {
      const fields = Object.keys(updates)
        .map((key, i) => `${key} = $${i + 1}`)
        .join(', ');

      const values = [...Object.values(updates), interviewId];

      const result = await this.db.query(
        `UPDATE interviews SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Interview not found');
      }

      logger.info(`Interview ${interviewId} updated`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating interview:', error);
      throw error;
    }
  }

  /**
   * Create job offer
   */
  async createJobOffer(
    applicationId: string,
    positionTitle: string,
    salary: number,
    benefits: string,
    startDate: Date,
    expirationDate: Date,
    employerId?: string
  ): Promise<JobOffer> {
    try {
      if (employerId) {
        const access = await this.db.query(
          `
            SELECT ja.id
            FROM job_applications ja
            JOIN jobs j ON j.id = ja.job_id
            WHERE ja.id = $1 AND j.employer_id = $2
            LIMIT 1
          `,
          [applicationId, employerId]
        );

        if (access.rows.length === 0) {
          throw new Error('Application not found or unauthorized');
        }
      }

      const result = await this.db.query(
        `INSERT INTO job_offers (
          application_id, position_title, salary, benefits, start_date, expiration_date, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
         RETURNING id, application_id, position_title, salary, benefits, start_date, expiration_date, status, created_at`,
        [applicationId, positionTitle, salary, benefits, startDate, expirationDate]
      );

      logger.info(`Job offer created for application ${applicationId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating job offer:', error);
      throw error;
    }
  }

  /**
   * Get job offer
   */
  async getJobOffer(offerId: string): Promise<JobOffer> {
    try {
      const result = await this.db.query(
        'SELECT * FROM job_offers WHERE id = $1',
        [offerId]
      );

      if (result.rows.length === 0) {
        throw new Error('Offer not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching job offer:', error);
      throw error;
    }
  }

  /**
   * Update job offer status
   */
  async updateOfferStatus(
    offerId: string,
    status: 'pending' | 'accepted' | 'rejected' | 'expired'
  ): Promise<JobOffer> {
    try {
      const result = await this.db.query(
        `UPDATE job_offers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
        [status, offerId]
      );

      if (result.rows.length === 0) {
        throw new Error('Offer not found');
      }

      logger.info(`Offer ${offerId} status updated to ${status}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating offer status:', error);
      throw error;
    }
  }

  /**
   * Get interviews for logged-in candidate
   */
  async getCandidateInterviews(candidateId: string): Promise<any[]> {
    try {
      const result = await this.db.query(
        `
          SELECT
            i.id,
            i.application_id,
            i.interview_type,
            i.status,
            i.scheduled_at,
            i.interview_link,
            i.feedback,
            i.created_at,
            i.updated_at,
            j.title as job_title,
            j.company_name
          FROM interviews i
          JOIN job_applications ja ON ja.id = i.application_id
          JOIN jobs j ON j.id = ja.job_id
          WHERE ja.candidate_id = $1
          ORDER BY i.scheduled_at DESC NULLS LAST, i.created_at DESC
        `,
        [candidateId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching candidate interviews:', error);
      throw error;
    }
  }

  /**
   * Get single interview for candidate
   */
  async getCandidateInterviewById(interviewId: string, candidateId: string): Promise<any> {
    try {
      const result = await this.db.query(
        `
          SELECT
            i.id,
            i.application_id,
            i.interview_type,
            i.status,
            i.scheduled_at,
            i.interview_link,
            i.feedback,
            i.created_at,
            i.updated_at,
            j.title as job_title,
            j.company_name
          FROM interviews i
          JOIN job_applications ja ON ja.id = i.application_id
          JOIN jobs j ON j.id = ja.job_id
          WHERE i.id = $1 AND ja.candidate_id = $2
          LIMIT 1
        `,
        [interviewId, candidateId]
      );

      if (result.rows.length === 0) {
        throw new Error('Interview not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching candidate interview by id:', error);
      throw error;
    }
  }

  /**
   * Reschedule interview for candidate
   */
  async rescheduleCandidateInterview(
    interviewId: string,
    candidateId: string,
    newDate: Date
  ): Promise<any> {
    try {
      const ownership = await this.db.query(
        `
          SELECT i.id
          FROM interviews i
          JOIN job_applications ja ON ja.id = i.application_id
          WHERE i.id = $1 AND ja.candidate_id = $2
          LIMIT 1
        `,
        [interviewId, candidateId]
      );

      if (ownership.rows.length === 0) {
        throw new Error('Interview not found');
      }

      const result = await this.db.query(
        `
          UPDATE interviews
          SET scheduled_at = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *
        `,
        [newDate, interviewId]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error rescheduling candidate interview:', error);
      throw error;
    }
  }

  /**
   * Save candidate interview feedback
   */
  async submitCandidateInterviewFeedback(
    interviewId: string,
    candidateId: string,
    feedback: string
  ): Promise<any> {
    try {
      const ownership = await this.db.query(
        `
          SELECT i.id
          FROM interviews i
          JOIN job_applications ja ON ja.id = i.application_id
          WHERE i.id = $1 AND ja.candidate_id = $2
          LIMIT 1
        `,
        [interviewId, candidateId]
      );

      if (ownership.rows.length === 0) {
        throw new Error('Interview not found');
      }

      const result = await this.db.query(
        `
          UPDATE interviews
          SET feedback = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *
        `,
        [feedback, interviewId]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error submitting candidate interview feedback:', error);
      throw error;
    }
  }

  /**
   * Get offers for candidate
   */
  async getCandidateOffers(candidateId: string): Promise<any[]> {
    try {
      const result = await this.db.query(
        `
          SELECT
            o.id,
            o.application_id,
            o.position_title,
            o.salary,
            o.benefits,
            o.start_date,
            o.expiration_date,
            o.status,
            o.created_at,
            o.updated_at,
            j.company_name
          FROM job_offers o
          JOIN job_applications ja ON ja.id = o.application_id
          JOIN jobs j ON j.id = ja.job_id
          WHERE ja.candidate_id = $1
          ORDER BY o.created_at DESC
        `,
        [candidateId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching candidate offers:', error);
      throw error;
    }
  }

  /**
   * Get single offer for candidate
   */
  async getCandidateOfferById(offerId: string, candidateId: string): Promise<any> {
    try {
      const result = await this.db.query(
        `
          SELECT
            o.*,
            j.company_name
          FROM job_offers o
          JOIN job_applications ja ON ja.id = o.application_id
          JOIN jobs j ON j.id = ja.job_id
          WHERE o.id = $1 AND ja.candidate_id = $2
          LIMIT 1
        `,
        [offerId, candidateId]
      );

      if (result.rows.length === 0) {
        throw new Error('Offer not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching candidate offer by id:', error);
      throw error;
    }
  }

  /**
   * Update offer status for candidate-owned offer
   */
  async updateCandidateOfferStatus(
    offerId: string,
    candidateId: string,
    status: 'accepted' | 'rejected'
  ): Promise<any> {
    try {
      const ownership = await this.db.query(
        `
          SELECT o.id
          FROM job_offers o
          JOIN job_applications ja ON ja.id = o.application_id
          WHERE o.id = $1 AND ja.candidate_id = $2
          LIMIT 1
        `,
        [offerId, candidateId]
      );

      if (ownership.rows.length === 0) {
        throw new Error('Offer not found');
      }

      const result = await this.db.query(
        `
          UPDATE job_offers
          SET status = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *
        `,
        [status, offerId]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error updating candidate offer status:', error);
      throw error;
    }
  }

  /**
   * Candidate application statistics
   */
  async getCandidateApplicationStatistics(candidateId: string): Promise<{
    total: number;
    pending: number;
    reviewed: number;
    shortlisted: number;
    rejected: number;
    accepted: number;
  }> {
    try {
      const result = await this.db.query(
        `
          SELECT
            COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE status = 'applied')::int as pending,
            COUNT(*) FILTER (WHERE status = 'reviewed')::int as reviewed,
            COUNT(*) FILTER (WHERE status = 'shortlisted')::int as shortlisted,
            COUNT(*) FILTER (WHERE status = 'rejected')::int as rejected,
            COUNT(*) FILTER (WHERE status = 'accepted')::int as accepted
          FROM job_applications
          WHERE candidate_id = $1
        `,
        [candidateId]
      );

      const row = result.rows[0] || {};
      return {
        total: Number(row.total || 0),
        pending: Number(row.pending || 0),
        reviewed: Number(row.reviewed || 0),
        shortlisted: Number(row.shortlisted || 0),
        rejected: Number(row.rejected || 0),
        accepted: Number(row.accepted || 0),
      };
    } catch (error) {
      logger.error('Error fetching candidate application statistics:', error);
      throw error;
    }
  }
}
