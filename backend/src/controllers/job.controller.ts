import { Request, Response, NextFunction } from 'express';
import { jobService } from '@/services/job.service';
import { ApiResponse, PaginatedResponse } from '@/types/common';
import { ExperienceLevel, Job, JobSearchFilters } from '@/types/job';
import { logger } from '@/utils/logger';

/**
 * Job Controller
 * Handles job management endpoints
 * Maps from legacy: add-job.php, jobs.php, search.php, etc.
 */

export class JobController {
  /**
   * POST /api/jobs
   * Create new job posting
   */
  static async createJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', timestamp: new Date() });
        return;
      }

      const payload = req.body || {};
      const mapped = {
        title: payload.title,
        description: payload.description,
        requirements: Array.isArray(payload.requirements)
          ? payload.requirements
          : typeof payload.requirements === 'string'
          ? payload.requirements
              .split('\n')
              .map((line: string) => line.trim())
              .filter(Boolean)
          : [],
        salaryMin: payload.salaryMin ?? payload.salary_min ?? 0,
        salaryMax: payload.salaryMax ?? payload.salary_max ?? 0,
        salaryCurrency: payload.salaryCurrency ?? payload.salary_currency ?? 'USD',
        jobType: payload.jobType ?? payload.job_type,
        experienceLevel: payload.experienceLevel ?? payload.experience_level,
        location: payload.location || [payload.city, payload.country].filter(Boolean).join(', '),
        country: payload.country,
        city: payload.city,
        categoryId: payload.categoryId ?? payload.category_id,
        subcategoryId: payload.subcategoryId ?? payload.subcategory_id,
        companyName: payload.companyName ?? payload.company_name,
        companyLogoUrl: payload.companyLogoUrl ?? payload.company_logo_url,
        isRemote: payload.isRemote ?? payload.is_remote ?? false,
        isUrgent: payload.isUrgent ?? payload.is_urgent ?? false,
        deadline: new Date(payload.deadline),
      };

      const job = await jobService.createJob(req.user.userId, mapped);

      const response: ApiResponse<Job> = {
        success: true,
        message: 'Job created successfully',
        data: job,
        timestamp: new Date(),
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/jobs/:id
   * Get job details by ID
   */
  static async getJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      // Increment view count
      await jobService.incrementJobViews(id);

      const job = await jobService.getJobById(id);
      
      if (!job) {
        res.status(404).json({
          success: false,
          message: 'Job not found',
          timestamp: new Date(),
        });
        return;
      }

      const response: ApiResponse<Job> = {
        success: true,
        message: 'Job retrieved successfully',
        data: job,
        timestamp: new Date(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/jobs/:id
   * Update job details
   */
  static async updateJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', timestamp: new Date() });
        return;
      }

      const { id } = req.params;
      const job = await jobService.updateJob(id, req.user.userId, req.body);

      const response: ApiResponse<Job> = {
        success: true,
        message: 'Job updated successfully',
        data: job,
        timestamp: new Date(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/jobs/:id/publish
   * Publish job (change status from draft to active)
   */
  static async publishJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', timestamp: new Date() });
        return;
      }

      const { id } = req.params;
      const job = await jobService.publishJob(id, req.user.userId);

      const response: ApiResponse<Job> = {
        success: true,
        message: 'Job published successfully',
        data: job,
        timestamp: new Date(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/jobs/:id/close
   * Close job posting
   */
  static async closeJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', timestamp: new Date() });
        return;
      }

      const { id } = req.params;
      const job = await jobService.closeJob(id, req.user.userId);

      const response: ApiResponse<Job> = {
        success: true,
        message: 'Job closed successfully',
        data: job,
        timestamp: new Date(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/jobs/:id
   * Delete job
   */
  static async deleteJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', timestamp: new Date() });
        return;
      }

      const { id } = req.params;
      await jobService.deleteJob(id, req.user.userId);

      const response: ApiResponse = {
        success: true,
        message: 'Job deleted successfully',
        timestamp: new Date(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/jobs/search
   * Search jobs with filters
   */
  static async searchJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: JobSearchFilters = {
        keyword: req.query.keyword as string,
        category_id: req.query.category_id as string,
        location: req.query.location as string,
        country: req.query.country as string,
        city: req.query.city as string,
        job_type: req.query.job_type as any,
        experience_level: req.query.experience_level as ExperienceLevel,
        salary_min: req.query.salary_min ? parseInt(req.query.salary_min as string) : undefined,
        salary_max: req.query.salary_max ? parseInt(req.query.salary_max as string) : undefined,
        is_remote: req.query.is_remote === 'true',
        is_featured: req.query.is_featured === 'true',
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sort: req.query.sort as any,
      };

      const { jobs, total } = await jobService.searchJobs(filters);

      const response: ApiResponse<PaginatedResponse<Job>> = {
        success: true,
        message: 'Jobs retrieved successfully',
        data: {
          data: jobs,
          pagination: {
            page: filters.page || 1,
            limit: filters.limit || 10,
            total,
            pages: Math.ceil(total / (filters.limit || 10)),
          },
        },
        timestamp: new Date(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/jobs/featured
   * Get featured jobs
   */
  static async getFeaturedJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const jobs = await jobService.getFeaturedJobs(limit);

      const response: ApiResponse<Job[]> = {
        success: true,
        message: 'Featured jobs retrieved successfully',
        data: jobs,
        timestamp: new Date(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/jobs/employer
   * Get employer's jobs
   */
  static async getEmployerJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', timestamp: new Date() });
        return;
      }

      const status = req.query.status as any;
      const jobs = await jobService.getEmployerJobs(req.user.userId, status);

      const response: ApiResponse<Job[]> = {
        success: true,
        message: 'Employer jobs retrieved successfully',
        data: jobs,
        timestamp: new Date(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/jobs/categories
   * Get job categories
   */
  static async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await jobService.getCategories();

      const response: ApiResponse = {
        success: true,
        message: 'Categories retrieved successfully',
        data: categories,
        timestamp: new Date(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/jobs/categories/:categoryId/subcategories
   * Get job subcategories (optionally filtered by category)
   */
  static async getSubcategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categoryId = (req.params.categoryId || req.query.categoryId) as string | undefined;
      const subcategories = await jobService.getSubcategories(categoryId);

      const response: ApiResponse = {
        success: true,
        message: 'Subcategories retrieved successfully',
        data: subcategories,
        timestamp: new Date(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/jobs/:id/save
   * Save job for candidate
   */
  static async saveJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', timestamp: new Date() });
        return;
      }

      const { id } = req.params;
      const savedJob = await jobService.saveJob(id, req.user.userId);

      const response: ApiResponse<any> = {
        success: true,
        message: 'Job saved successfully',
        data: savedJob,
        timestamp: new Date(),
      };

      res.status(201).json(response);
    } catch (error: any) {
      if (error.message === 'Job already saved') {
        res.status(409).json({
          success: false,
          message: 'Job already saved',
          timestamp: new Date(),
        });
        return;
      }
      next(error);
    }
  }

  /**
   * DELETE /api/jobs/:id/save
   * Unsave (remove) job for candidate
   */
  static async unsaveJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', timestamp: new Date() });
        return;
      }

      const { id } = req.params;
      await jobService.unsaveJob(id, req.user.userId);

      const response: ApiResponse<any> = {
        success: true,
        message: 'Job unsaved successfully',
        data: null,
        timestamp: new Date(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/jobs/saved/list
   * Get candidate's saved jobs
   */
  static async getSavedJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', timestamp: new Date() });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const { jobs, total } = await jobService.getSavedJobs(req.user.userId, limit, offset);

      const response = {
        success: true,
        message: 'Saved jobs retrieved successfully',
        data: jobs,
        pagination: {
          total,
          limit,
          page: Math.floor(offset / limit) + 1,
          pages: Math.ceil(total / limit),
        },
        timestamp: new Date(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/jobs/:id/is-saved
   * Check if job is saved by candidate
   */
  static async isJobSaved(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', timestamp: new Date() });
        return;
      }

      const { id } = req.params;
      const isSaved = await jobService.isJobSaved(id, req.user.userId);

      const response: ApiResponse<{ isSaved: boolean }> = {
        success: true,
        message: 'Job save status retrieved',
        data: { isSaved },
        timestamp: new Date(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/jobs/saved/count
   * Get count of saved jobs for candidate
   */
  static async getSavedJobsCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', timestamp: new Date() });
        return;
      }

      const count = await jobService.getSavedJobsCount(req.user.userId);

      const response: ApiResponse<{ count: number }> = {
        success: true,
        message: 'Saved jobs count retrieved',
        data: { count },
        timestamp: new Date(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/jobs/:id/feature
   * Mark job as featured
   */
  static async markAsFeatured(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', timestamp: new Date() });
        return;
      }

      const { id } = req.params;
      const job = await jobService.markAsFeatured(id, req.user.userId);

      const response: ApiResponse<Job> = {
        success: true,
        message: 'Job marked as featured',
        data: job,
        timestamp: new Date(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default JobController;
