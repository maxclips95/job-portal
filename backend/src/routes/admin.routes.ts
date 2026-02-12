import { Router } from 'express';
import AdminController from '../controllers/admin.controller';
import { authenticateToken } from '@/middleware/auth';

const router = Router();

/**
 * Middleware to check if user is admin
 */
const adminAuth = (req: any, res: any, next: any) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Apply authentication and admin check to all admin routes
router.use(authenticateToken, adminAuth);

/**
 * Dashboard Routes
 */
router.get('/dashboard', AdminController.getDashboard);

/**
 * User Management Routes
 */
router.get('/users', AdminController.getUsers);
router.get('/users/:id', AdminController.getUser);
router.put('/users/:id/status', AdminController.updateUserStatus);
router.put('/users/:id/role', AdminController.updateUserRole);
router.delete('/users/:id', AdminController.deleteUser);

/**
 * Job Moderation Routes
 */
router.get('/jobs/pending', AdminController.getPendingJobs);
router.put('/jobs/:id/approve', AdminController.approveJob);
router.put('/jobs/:id/reject', AdminController.rejectJob);
router.get('/jobs', AdminController.getJobs);

/**
 * Analytics Routes
 */
router.get('/analytics/jobs', AdminController.getJobAnalytics);
router.get('/analytics/users', AdminController.getUserAnalytics);

/**
 * Settings Routes
 */
router.get('/settings', AdminController.getSettings);
router.put('/settings', AdminController.updateSettings);

/**
 * Email Template Routes
 */
router.get('/email-templates', AdminController.getEmailTemplates);
router.put('/email-templates/:id', AdminController.updateEmailTemplate);

/**
 * Activity Log Routes
 */
router.get('/activity-logs', AdminController.getActivityLogs);

/**
 * Company Verification Routes
 */
router.get('/companies/pending', AdminController.getCompaniesForVerification);
router.get('/companies', AdminController.getCompanies);
router.put('/companies/:id/request-documents', AdminController.requestCompanyDocuments);
router.put('/companies/:id/mark-documents-received', AdminController.markCompanyDocumentsReceived);
router.put('/companies/:id/verify', AdminController.verifyCompany);
router.put('/companies/:id/reject', AdminController.rejectCompanyVerification);

export default router;
