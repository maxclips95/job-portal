/**
 * Screening Routes
 * API endpoints for screening feature
 * Production-grade: Authentication, validation, error handling
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { ScreeningController } from './screening.controller';
import { ScreeningService } from './screening.service';
import { ScreeningRepository } from './repositories/screening.repository';
import { ScreeningRankingService } from './services/screening-ranking.service';
import { ScreeningCacheService } from './services/screening-cache.service';
import { authMiddleware } from '@/middleware/auth.middleware';
import { errorHandler } from '@/middleware/error';
import { logger } from '@/utils/logger';

// Configure multer for file uploads (max 50MB per file, 500MB total)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 500,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

/**
 * Initialize services (dependency injection)
 */
function initializeServices() {
  const repository = new ScreeningRepository();
  const cacheService = new ScreeningCacheService();
  const rankingService = new ScreeningRankingService();
  const screeningService = new ScreeningService(
    repository,
    cacheService,
    rankingService
  );
  const controller = new ScreeningController(screeningService);

  return controller;
}

/**
 * Create screening routes
 */
export function createScreeningRoutes(): Router {
  const router = Router();
  const controller = initializeServices();

  logger.info('Initializing screening routes');

  /**
   * POST /api/screening/batch-upload
   * Upload and initiate screening of multiple resumes
   * Authentication: Required (employer)
   * Body: multipart/form-data with files and jobId
   * Response: 202 Accepted with screening job details
   */
  router.post(
    '/batch-upload',
    authMiddleware,
    upload.array('resumes', 500),
    (req, res, next) => {
      try {
        // Validate jobId in body or query
        if (!req.body.jobId && !req.query.jobId) {
          return res.status(400).json({
            success: false,
            error: 'Job ID is required',
            code: 'VALIDATION_ERROR',
          });
        }

        // Ensure jobId is in body for controller
        if (!req.body.jobId && req.query.jobId) {
          req.body.jobId = req.query.jobId;
        }

        controller.uploadBatch(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /api/screening/results
   * Get screening results with filters
   * Authentication: Required
   * Query params:
   *   - screeningJobId: UUID (required)
   *   - minMatch: 0-100 (optional, default 0)
   *   - status: 'pending'|'completed'|'shortlisted' (optional)
   *   - sortBy: 'match'|'created' (optional)
   *   - sortDesc: true|false (optional)
   *   - limit: 1-100 (optional, default 20)
   *   - offset: >= 0 (optional, default 0)
   * Response: 200 OK with results array and pagination
   */
  router.get('/results', authMiddleware, (req, res, next) => {
    controller.getResults(req, res, next);
  });

  /**
   * GET /api/screening/analytics
   * Get screening analytics and insights
   * Authentication: Required
   * Query params:
   *   - screeningJobId: UUID (required)
   * Response: 200 OK with analytics data
   */
  router.get('/analytics', authMiddleware, (req, res, next) => {
    controller.getAnalytics(req, res, next);
  });

  /**
   * GET /api/screening/:screeningJobId
   * Get screening job status
   * Authentication: Required
   * Params: screeningJobId UUID
   * Response: 200 OK with job details
   */
  router.get('/:screeningJobId', authMiddleware, (req, res, next) => {
    controller.getStatus(req, res, next);
  });

  /**
   * PUT /api/screening/shortlist
   * Save shortlist of selected candidates
   * Authentication: Required (employer)
   * Body: { screeningJobId, candidateIds: [] }
   * Response: 200 OK with updated job status
   */
  router.put('/shortlist', authMiddleware, (req, res, next) => {
    controller.saveShortlist(req, res, next);
  });

  /**
   * GET /api/screening/:screeningJobId/export
   * Export screening results
   * Authentication: Required
   * Query params:
   *   - format: 'json'|'csv' (default: 'json')
   * Response: 200 OK with exported data or CSV file
   */
  router.get('/:screeningJobId/export', authMiddleware, (req, res, next) => {
    controller.exportShortlist(req, res, next);
  });

  /**
   * DELETE /api/screening/:screeningJobId
   * Delete screening job and all results
   * Authentication: Required (employer who created job)
   * Params: screeningJobId UUID
   * Response: 200 OK
   */
  router.delete('/:screeningJobId', authMiddleware, (req, res, next) => {
    controller.deleteScreening(req, res, next);
  });

  /**
   * Error handling middleware
   */
  router.use((err: any, req: Request, res: Response, next: any) => {
    logger.error('Screening route error', {
      message: err.message,
      code: err.code,
      path: req.path,
      method: req.method,
    });

    if (err.message === 'Only PDF files are allowed') {
      return res.status(400).json({
        success: false,
        error: 'Only PDF files are allowed',
        code: 'VALIDATION_ERROR',
      });
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File too large (max 50MB per file)',
        code: 'FILE_SIZE_ERROR',
      });
    }

    errorHandler(err, req, res, next);
  });

  logger.info('Screening routes initialized (6 endpoints)');

  return router;
}

/**
 * Register screening routes with app
 */
export function registerScreeningRoutes(app: any): void {
  app.use('/api/screening', createScreeningRoutes());
  logger.info('Screening routes registered at /api/screening');
}
