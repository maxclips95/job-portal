import express, { Router } from 'express';
import JobController from '@/controllers/job.controller';
import { authenticateToken } from '@/middleware/auth';

const router: Router = express.Router();

/**
 * Job Routes
 * Maps from legacy: add-job.php, jobs.php, search.php, etc.
 */

// Public routes
router.get('/search', JobController.searchJobs);
router.get('/featured', JobController.getFeaturedJobs);
router.get('/categories', JobController.getCategories);
router.get('/categories/:categoryId/subcategories', JobController.getSubcategories);
router.get('/subcategories', JobController.getSubcategories);

// Protected routes (authenticated users)
router.post('/', authenticateToken, JobController.createJob);
router.put('/:id', authenticateToken, JobController.updateJob);
router.delete('/:id', authenticateToken, JobController.deleteJob);
router.post('/:id/publish', authenticateToken, JobController.publishJob);
router.post('/:id/close', authenticateToken, JobController.closeJob);
router.post('/:id/feature', authenticateToken, JobController.markAsFeatured);
router.get('/employer/jobs', authenticateToken, JobController.getEmployerJobs);

// Save jobs routes
router.post('/:id/save', authenticateToken, JobController.saveJob);
router.delete('/:id/save', authenticateToken, JobController.unsaveJob);
router.get('/saved/list', authenticateToken, JobController.getSavedJobs);
router.get('/saved/count', authenticateToken, JobController.getSavedJobsCount);
router.get('/:id/is-saved', authenticateToken, JobController.isJobSaved);

// Keep dynamic route last so static paths like /employer/jobs and /saved/list work correctly.
router.get('/:id', JobController.getJob);

export default router;
