/**
 * Screening Service
 * Core business logic for bulk resume screening
 * Production-grade: Error handling, logging, caching, transactions
 */

import { Pool } from 'pg';
import { Queue, Worker } from 'bull';
import { logger } from '@/utils/logger';
import { AppError } from '@/shared/errors/app.error';
import { ScreeningRepository } from './repositories/screening.repository';
import { ScreeningRankingService } from './screening-ranking.service';
import { ScreeningCacheService } from './screening-cache.service';
import { ResumeParserService } from '@/services/resume.parser.service';
import { GroqService } from '@/services/groq.service';
import type {
  ScreeningJob,
  ScreeningResult,
  ScreeningMetrics,
} from '@/shared/types/database.types';

interface ScreeningRequest {
  employerId: string;
  jobId: string;
  resumes: Array<{ buffer: Buffer; filename: string }>;
}

interface AnalysisResult {
  skills: { matched: string[]; missing: string[] };
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  matchPercentage: number;
}

export class ScreeningService {
  private repository: ScreeningRepository;
  private rankingService: ScreeningRankingService;
  private cacheService: ScreeningCacheService;
  private resumeParser: ResumeParserService;
  private groqService: GroqService;
  private screeningQueue: Queue;

  constructor(
    pool: Pool,
    redisClient: any,
    screeningQueue: Queue
  ) {
    this.repository = new ScreeningRepository(pool);
    this.rankingService = new ScreeningRankingService();
    this.cacheService = new ScreeningCacheService(redisClient);
    this.resumeParser = new ResumeParserService();
    this.groqService = new GroqService();
    this.screeningQueue = screeningQueue;

    // Setup queue worker
    this.setupQueueWorker();
  }

  /**
   * Initiate bulk screening for multiple resumes
   * @param request - Screening request with resumes
   * @returns Created screening job
   */
  async initiateBulkScreening(request: ScreeningRequest): Promise<ScreeningJob> {
    try {
      logger.info('Initiating bulk screening', {
        employerId: request.employerId,
        jobId: request.jobId,
        resumeCount: request.resumes.length,
      });

      // Validate employer has active subscription
      // TODO: Add subscription check when payments are ready

      // Create screening job
      const screeningJob = await this.repository.createScreeningJob(
        request.employerId,
        request.jobId,
        request.resumes.length
      );

      // Queue screening tasks
      for (const resume of request.resumes) {
        await this.screeningQueue.add(
          'process-resume',
          {
            screeningJobId: screeningJob.id,
            resumeBuffer: resume.buffer.toString('base64'),
            resumeFilename: resume.filename,
            jobId: request.jobId,
          },
          {
            priority: 5,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          }
        );
      }

      logger.info('Screening job created and queued', {
        screeningJobId: screeningJob.id,
        resumeCount: request.resumes.length,
      });

      return screeningJob;
    } catch (error) {
      logger.error('Failed to initiate screening', { error });
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to initiate screening',
        500,
        'SCREENING_ERROR'
      );
    }
  }

  /**
   * Process single resume (called by queue worker)
   * @param screeningJobId - UUID of screening job
   * @param resumeBuffer - Resume file buffer
   * @param jobId - UUID of job posting
   * @returns Screening result
   */
  async processResumeForScreening(
    screeningJobId: string,
    resumeBuffer: Buffer,
    jobId: string
  ): Promise<ScreeningResult> {
    try {
      // Parse resume
      const parsedResume = await this.resumeParser.parseResumePDF(resumeBuffer);
      
      if (!parsedResume.extractedSkills) {
        parsedResume.extractedSkills = [];
      }

      // Get job requirements (from cache if available)
      const jobRequirements = await this.cacheService.getJobRequirements(jobId);
      
      if (!jobRequirements) {
        throw new AppError('Job requirements not found', 404, 'NOT_FOUND');
      }

      // Analyze resume against job requirements
      const analysis = await this.analyzeResumeForJob(
        parsedResume,
        jobRequirements
      );

      // Rank candidate
      const rankingScore = this.rankingService.calculateScreeningScore(
        analysis,
        jobRequirements
      );

      // Store result
      const result = await this.repository.createScreeningResult(
        screeningJobId,
        '', // TODO: Get resume_id from resume storage
        '', // TODO: Get candidate_id from parsed resume
        rankingScore,
        analysis
      );

      logger.info('Resume processed successfully', {
        screeningJobId,
        matchPercentage: rankingScore,
      });

      return result;
    } catch (error) {
      logger.error('Failed to process resume', { error, screeningJobId });
      throw error;
    }
  }

  /**
   * Analyze resume against job requirements
   * @param parsedResume - Parsed resume data
   * @param jobRequirements - Job posting requirements
   * @returns Analysis results
   */
  private async analyzeResumeForJob(
    parsedResume: any,
    jobRequirements: any
  ): Promise<AnalysisResult> {
    try {
      // Extract skills from both resume and job
      const resumeSkills = parsedResume.extractedSkills || [];
      const jobSkills = jobRequirements.requiredSkills || [];
      const niceTohaveSkills = jobRequirements.niceTohaveSkills || [];

      // Calculate skill matches
      const matchedSkills = resumeSkills.filter((skill: string) =>
        jobSkills.some((js: string) =>
          skill.toLowerCase().includes(js.toLowerCase())
        )
      );

      const missingSkills = jobSkills.filter(
        (skill: string) =>
          !resumeSkills.some((rs: string) =>
            rs.toLowerCase().includes(skill.toLowerCase())
          )
      );

      // Use Groq for detailed analysis
      const aiAnalysis = await this.groqService.analyzeResumeContent(
        parsedResume.fullText,
        jobRequirements.jobTitle,
        jobRequirements.description
      );

      return {
        skills: {
          matched: matchedSkills,
          missing: missingSkills,
        },
        strengths: aiAnalysis.strengths || [],
        gaps: aiAnalysis.gaps || [],
        recommendations: aiAnalysis.recommendations || [],
        matchPercentage: this.calculateMatchPercentage(
          matchedSkills,
          jobSkills,
          niceTohaveSkills
        ),
      };
    } catch (error) {
      logger.error('Failed to analyze resume', { error });
      throw error;
    }
  }

  /**
   * Calculate match percentage
   * @param matchedSkills - Array of matched skills
   * @param requiredSkills - Array of required skills
   * @param niceTohaveSkills - Array of nice-to-have skills
   * @returns Match percentage 0-100
   */
  private calculateMatchPercentage(
    matchedSkills: string[],
    requiredSkills: string[],
    niceTohaveSkills: string[] = []
  ): number {
    if (requiredSkills.length === 0) return 0;

    const requiredMatch =
      (matchedSkills.length / requiredSkills.length) * 100;
    const niceToHaveMatch =
      niceTohaveSkills.length > 0
        ? (matchedSkills.filter((skill) =>
            niceTohaveSkills.some((nt) =>
              skill.toLowerCase().includes(nt.toLowerCase())
            )
          ).length /
            niceTohaveSkills.length) *
          20
        : 0;

    return Math.min(100, requiredMatch + niceToHaveMatch);
  }

  /**
   * Get screening results with filters
   * @param screeningJobId - UUID of screening job
   * @param filters - Filter options
   * @returns Paginated results
   */
  async getScreeningResults(screeningJobId: string, filters: any) {
    try {
      // Check cache first
      const cached = await this.cacheService.getScreeningResults(
        screeningJobId,
        filters
      );
      if (cached) return cached;

      // Get from database
      const results = await this.repository.getScreeningResults(
        screeningJobId,
        filters
      );

      // Cache results
      await this.cacheService.setScreeningResults(
        screeningJobId,
        filters,
        results
      );

      return results;
    } catch (error) {
      logger.error('Failed to get screening results', { error });
      throw new AppError(
        'Failed to fetch screening results',
        500,
        'DATABASE_ERROR'
      );
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
    try {
      // Check cache first
      const cached = await this.cacheService.getAnalytics(screeningJobId);
      if (cached) return cached;

      // Get from database
      const analytics = await this.repository.getScreeningAnalytics(
        screeningJobId
      );

      // Cache for 1 hour
      await this.cacheService.setAnalytics(screeningJobId, analytics, 3600);

      return analytics;
    } catch (error) {
      logger.error('Failed to get screening analytics', { error });
      throw new AppError(
        'Failed to fetch analytics',
        500,
        'DATABASE_ERROR'
      );
    }
  }

  /**
   * Save shortlist
   * @param screeningJobId - UUID of screening job
   * @param candidateIds - Array of candidate IDs to shortlist
   * @returns Updated screening job
   */
  async saveShortlist(
    screeningJobId: string,
    candidateIds: string[]
  ): Promise<ScreeningJob> {
    try {
      const result = await this.repository.saveShortlist(
        screeningJobId,
        candidateIds
      );

      // Invalidate cache
      await this.cacheService.invalidate(screeningJobId);

      logger.info('Shortlist saved', {
        screeningJobId,
        candidateCount: candidateIds.length,
      });

      return result;
    } catch (error) {
      logger.error('Failed to save shortlist', { error });
      throw new AppError('Failed to save shortlist', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Setup Bull queue worker
   * Processes queued resume screening tasks
   */
  private setupQueueWorker() {
    const worker = new Worker(
      'screening-queue',
      async (job) => {
        try {
          const { screeningJobId, resumeBuffer, jobId } = job.data;
          const buffer = Buffer.from(resumeBuffer, 'base64');

          await this.processResumeForScreening(
            screeningJobId,
            buffer,
            jobId
          );

          logger.info('Queue job completed', { jobId: job.id });
        } catch (error) {
          logger.error('Queue job failed', { error, jobId: job.id });
          throw error;
        }
      },
      {
        concurrency: 5, // Process 5 resumes concurrently
        lockDuration: 30000, // 30 second lock
        lockRenewTime: 15000, // Renew every 15 seconds
      }
    );

    // Handle worker events
    worker.on('completed', (job) => {
      logger.info('Job completed', { jobId: job.id });
    });

    worker.on('failed', (job, err) => {
      logger.error('Job failed', { jobId: job?.id, error: err });
    });
  }
}
