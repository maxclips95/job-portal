// AI Resume Screening - Database Service
// Enterprise-grade production code

import { Pool, QueryResult } from 'pg';
import { logger } from '@/utils/logger';
import { AppError } from '@/shared/errors/app.error';
import { SCREENING_CONSTANTS } from './screening.constants';
import type {
  ScreeningJob,
  ScreeningResult,
  ScreeningMetrics,
  ScreeningFilter,
} from './screening.types';

export class ScreeningRepository {
  constructor(private pool: Pool) {}

  /**
   * Create a new screening job for batch resume processing
   * @param employerId - UUID of the employer
   * @param jobId - UUID of the job posting
   * @param totalResumes - Number of resumes to screen
   * @returns Created screening job record
   */
  async createScreeningJob(
    employerId: string,
    jobId: string,
    totalResumes: number
  ): Promise<ScreeningJob> {
    const query = `
      INSERT INTO job_screenings (
        employer_id, 
        job_id, 
        status, 
        total_resumes, 
        processed_count,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *;
    `;

    try {
      const result = await this.pool.query(query, [
        employerId,
        jobId,
        'pending',
        totalResumes,
        0,
      ]);

      return result.rows[0] as ScreeningJob;
    } catch (error) {
      logger.error('Failed to create screening job', { error, employerId, jobId });
      throw new AppError(
        'Failed to create screening job',
        500,
        'DATABASE_ERROR'
      );
    }
  }

  /**
   * Store screening result for a resume
   * @param screeningJobId - UUID of screening job
   * @param resumeId - UUID of resume
   * @param candidateId - UUID of candidate
   * @param matchPercentage - Match score 0-100
   * @param analysis - AI analysis results
   * @returns Created screening result
   */
  async createScreeningResult(
    screeningJobId: string,
    resumeId: string,
    candidateId: string,
    matchPercentage: number,
    analysis: {
      skills: { matched: string[]; missing: string[] };
      strengths: string[];
      gaps: string[];
      recommendations: string[];
    }
  ): Promise<ScreeningResult> {
    const query = `
      INSERT INTO screening_results (
        screening_job_id,
        resume_id,
        candidate_id,
        match_percentage,
        skills_matched,
        skills_missing,
        strengths,
        improvement_areas,
        recommendations,
        status,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *;
    `;

    try {
      const result = await this.pool.query(query, [
        screeningJobId,
        resumeId,
        candidateId,
        matchPercentage,
        analysis.skills.matched,
        analysis.skills.missing,
        analysis.strengths,
        analysis.gaps,
        analysis.recommendations,
        'completed',
      ]);

      // Update screening job progress
      await this.incrementProcessedCount(screeningJobId);

      return result.rows[0] as ScreeningResult;
    } catch (error) {
      logger.error('Failed to create screening result', { 
        error, 
        screeningJobId, 
        resumeId,
      });
      throw new AppError(
        'Failed to store screening result',
        500,
        'DATABASE_ERROR'
      );
    }
  }

  /**
   * Get screening results with pagination and filters
   * @param screeningJobId - UUID of screening job
   * @param filters - Filter options
   * @returns Paginated screening results
   */
  async getScreeningResults(
    screeningJobId: string,
    filters: ScreeningFilter & { limit: number; offset: number }
  ): Promise<{ results: ScreeningResult[]; total: number }> {
    let query = `
      SELECT * FROM screening_results
      WHERE screening_job_id = $1
    `;
    const params: any[] = [screeningJobId];
    let paramIndex = 2;

    // Apply filters
    if (filters.minMatchPercentage !== undefined) {
      query += ` AND match_percentage >= $${paramIndex}`;
      params.push(filters.minMatchPercentage);
      paramIndex++;
    }

    if (filters.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.sortBy) {
      const sortDirection = filters.sortDesc ? 'DESC' : 'ASC';
      query += ` ORDER BY ${filters.sortBy} ${sortDirection}`;
    } else {
      query += ` ORDER BY match_percentage DESC`;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM screening_results WHERE screening_job_id = $1`;
    const countResult = await this.pool.query(countQuery, [screeningJobId]);
    const total = parseInt(countResult.rows[0].count, 10);

    // Add pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(filters.limit, filters.offset);

    try {
      const result = await this.pool.query(query, params);
      return {
        results: result.rows as ScreeningResult[],
        total,
      };
    } catch (error) {
      logger.error('Failed to fetch screening results', { error, screeningJobId });
      throw new AppError(
        'Failed to fetch screening results',
        500,
        'DATABASE_ERROR'
      );
    }
  }

  /**
   * Get screening job details
   * @param screeningJobId - UUID of screening job
   * @returns Screening job record
   */
  async getScreeningJob(screeningJobId: string): Promise<ScreeningJob> {
    const query = 'SELECT * FROM job_screenings WHERE id = $1';

    try {
      const result = await this.pool.query(query, [screeningJobId]);

      if (result.rows.length === 0) {
        throw new AppError('Screening job not found', 404, 'NOT_FOUND');
      }

      return result.rows[0] as ScreeningJob;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to fetch screening job', { error, screeningJobId });
      throw new AppError(
        'Failed to fetch screening job',
        500,
        'DATABASE_ERROR'
      );
    }
  }

  /**
   * Save candidates to shortlist
   * @param screeningJobId - UUID of screening job
   * @param candidateIds - Array of candidate UUIDs
   * @returns Updated screening job
   */
  async saveShortlist(
    screeningJobId: string,
    candidateIds: string[]
  ): Promise<ScreeningJob> {
    const query = `
      UPDATE job_screenings
      SET shortlisted_candidates = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;

    try {
      const result = await this.pool.query(query, [candidateIds, screeningJobId]);
      return result.rows[0] as ScreeningJob;
    } catch (error) {
      logger.error('Failed to save shortlist', { error, screeningJobId });
      throw new AppError('Failed to save shortlist', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get screening analytics
   * @param screeningJobId - UUID of screening job
   * @returns Analytics metrics
   */
  async getScreeningAnalytics(
    screeningJobId: string
  ): Promise<ScreeningMetrics> {
    const query = `
      SELECT
        COUNT(*) as total_screened,
        AVG(match_percentage) as avg_match,
        MAX(match_percentage) as max_match,
        MIN(match_percentage) as min_match,
        COUNT(CASE WHEN match_percentage >= 70 THEN 1 END) as strong_matches,
        COUNT(CASE WHEN match_percentage >= 50 AND match_percentage < 70 THEN 1 END) as moderate_matches,
        COUNT(CASE WHEN match_percentage < 50 THEN 1 END) as weak_matches
      FROM screening_results
      WHERE screening_job_id = $1;
    `;

    try {
      const result = await this.pool.query(query, [screeningJobId]);
      const row = result.rows[0];

      return {
        totalScreened: parseInt(row.total_screened, 10),
        averageMatch: parseFloat(row.avg_match) || 0,
        maxMatch: parseInt(row.max_match, 10),
        minMatch: parseInt(row.min_match, 10),
        strongMatches: parseInt(row.strong_matches, 10),
        moderateMatches: parseInt(row.moderate_matches, 10),
        weakMatches: parseInt(row.weak_matches, 10),
      };
    } catch (error) {
      logger.error('Failed to fetch screening analytics', { error, screeningJobId });
      throw new AppError(
        'Failed to fetch screening analytics',
        500,
        'DATABASE_ERROR'
      );
    }
  }

  /**
   * Delete screening job and its results
   * @param screeningJobId - UUID of screening job
   */
  async deleteScreeningJob(screeningJobId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Delete screening results first (foreign key)
      await client.query(
        'DELETE FROM screening_results WHERE screening_job_id = $1',
        [screeningJobId]
      );

      // Delete screening job
      await client.query(
        'DELETE FROM job_screenings WHERE id = $1',
        [screeningJobId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to delete screening job', { error, screeningJobId });
      throw new AppError(
        'Failed to delete screening job',
        500,
        'DATABASE_ERROR'
      );
    } finally {
      client.release();
    }
  }

  /**
   * Increment processed count for screening job
   * @param screeningJobId - UUID of screening job
   */
  private async incrementProcessedCount(screeningJobId: string): Promise<void> {
    const query = `
      UPDATE job_screenings
      SET processed_count = processed_count + 1,
          updated_at = NOW()
      WHERE id = $1;
    `;

    try {
      await this.pool.query(query, [screeningJobId]);
    } catch (error) {
      logger.error('Failed to increment processed count', { error, screeningJobId });
      // Don't throw - just log, as this is not critical
    }
  }

  /**
   * Get employer's screening jobs with pagination
   * @param employerId - UUID of employer
   * @param limit - Pagination limit
   * @param offset - Pagination offset
   * @returns Paginated screening jobs
   */
  async getEmployerScreeningJobs(
    employerId: string,
    limit: number,
    offset: number
  ): Promise<{ jobs: ScreeningJob[]; total: number }> {
    const countQuery = 'SELECT COUNT(*) FROM job_screenings WHERE employer_id = $1';
    const countResult = await this.pool.query(countQuery, [employerId]);
    const total = parseInt(countResult.rows[0].count, 10);

    const query = `
      SELECT * FROM job_screenings
      WHERE employer_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;
    `;

    try {
      const result = await this.pool.query(query, [employerId, limit, offset]);
      return {
        jobs: result.rows as ScreeningJob[],
        total,
      };
    } catch (error) {
      logger.error('Failed to fetch employer screening jobs', {
        error,
        employerId,
      });
      throw new AppError(
        'Failed to fetch screening jobs',
        500,
        'DATABASE_ERROR'
      );
    }
  }
}
