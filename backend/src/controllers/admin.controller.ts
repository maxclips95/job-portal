import { Request, Response } from 'express';
import AdminService from '@/services/admin.service';

class AdminController {
  /**
   * GET /api/admin/dashboard - Get dashboard statistics
   */
  static async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const stats = await AdminService.getDashboardStats();
      res.status(200).json(stats);
    } catch (error) {
      console.error('Error getting dashboard:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  }

  /**
   * GET /api/admin/users - Get all users with filters
   */
  static async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const { role, status, search, limit, offset } = req.query;

      const filters = {
        role: role as string | undefined,
        status: status as string | undefined,
        search: search as string | undefined,
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0,
      };

      const result = await AdminService.getUsers(filters);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  /**
   * GET /api/admin/users/:id - Get user details
   */
  static async getUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      const user = await AdminService.getUserById(id);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(200).json(user);
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }

  /**
   * PUT /api/admin/users/:id/status - Update user status
   */
  static async updateUserStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!id) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      if (!['active', 'suspended', 'banned'].includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
      }

      const user = await AdminService.updateUserStatus(id, status);

      // Log admin action
      await AdminService.logAdminAction(
        (req.user as any)?.userId,
        'UPDATE_USER_STATUS',
        `User status changed to ${status}`,
        id
      );

      res.status(200).json(user);
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({ error: 'Failed to update user status' });
    }
  }

  /**
   * PUT /api/admin/users/:id/role - Update user role
   */
  static async updateUserRole(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!id) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      if (!['admin', 'employer', 'candidate'].includes(role)) {
        res.status(400).json({ error: 'Invalid role' });
        return;
      }

      const user = await AdminService.updateUserRole(id, role);

      await AdminService.logAdminAction(
        (req.user as any)?.userId,
        'UPDATE_USER_ROLE',
        `User role changed to ${role}`,
        id
      );

      res.status(200).json(user);
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  }

  /**
   * DELETE /api/admin/users/:id - Delete user
   */
  static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      const success = await AdminService.deleteUser(id);

      if (!success) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      await AdminService.logAdminAction(
        (req.user as any)?.userId,
        'DELETE_USER',
        'User deleted',
        id
      );

      res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }

  /**
   * GET /api/admin/jobs/pending - Get pending jobs
   */
  static async getPendingJobs(req: Request, res: Response): Promise<void> {
    try {
      const { limit, offset } = req.query;

      const result = await AdminService.getPendingJobs(
        limit ? parseInt(limit as string) : 20,
        offset ? parseInt(offset as string) : 0
      );

      res.status(200).json(result);
    } catch (error) {
      console.error('Error getting pending jobs:', error);
      res.status(500).json({ error: 'Failed to fetch pending jobs' });
    }
  }

  /**
   * PUT /api/admin/jobs/:id/approve - Approve job
   */
  static async approveJob(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: 'Invalid job ID' });
        return;
      }

      const job = await AdminService.approveJob(id, (req.user as any)?.userId);

      await AdminService.logAdminAction(
        (req.user as any)?.userId,
        'APPROVE_JOB',
        'Job approved',
        id,
        'job'
      );

      res.status(200).json(job);
    } catch (error) {
      console.error('Error approving job:', error);
      res.status(500).json({ error: 'Failed to approve job' });
    }
  }

  /**
   * PUT /api/admin/jobs/:id/reject - Reject job
   */
  static async rejectJob(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!id) {
        res.status(400).json({ error: 'Invalid job ID' });
        return;
      }

      if (!reason || reason.trim() === '') {
        res.status(400).json({ error: 'Rejection reason is required' });
        return;
      }

      const job = await AdminService.rejectJob(id, reason, (req.user as any)?.userId);

      await AdminService.logAdminAction(
        (req.user as any)?.userId,
        'REJECT_JOB',
        `Job rejected: ${reason}`,
        id,
        'job'
      );

      res.status(200).json(job);
    } catch (error) {
      console.error('Error rejecting job:', error);
      res.status(500).json({ error: 'Failed to reject job' });
    }
  }

  /**
   * GET /api/admin/jobs - Get all jobs with filters
   */
  static async getJobs(req: Request, res: Response): Promise<void> {
    try {
      const { status, search, limit, offset } = req.query;

      const filters = {
        status: status as string | undefined,
        search: search as string | undefined,
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0,
      };

      const result = await AdminService.getJobs(filters);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error getting jobs:', error);
      res.status(500).json({ error: 'Failed to fetch jobs' });
    }
  }

  /**
   * GET /api/admin/analytics/jobs - Get job analytics
   */
  static async getJobAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const analytics = await AdminService.getJobAnalytics();
      res.status(200).json(analytics);
    } catch (error) {
      console.error('Error getting job analytics:', error);
      res.status(500).json({ error: 'Failed to fetch job analytics' });
    }
  }

  /**
   * GET /api/admin/analytics/users - Get user analytics
   */
  static async getUserAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const analytics = await AdminService.getUserAnalytics();
      res.status(200).json(analytics);
    } catch (error) {
      console.error('Error getting user analytics:', error);
      res.status(500).json({ error: 'Failed to fetch user analytics' });
    }
  }

  /**
   * GET /api/admin/settings - Get system settings
   */
  static async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const settings = await AdminService.getSystemSettings();
      res.status(200).json({ settings });
    } catch (error) {
      console.error('Error getting settings:', error);
      res.status(500).json({ message: 'Failed to fetch settings' });
    }
  }

  /**
   * PUT /api/admin/settings - Update system settings
   */
  static async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const settings = await AdminService.updateSystemSettings(req.body);

      await AdminService.logAdminAction(
        (req.user as any)?.userId,
        'UPDATE_SETTINGS',
        'System settings updated',
        undefined,
        'settings'
      );

      res.status(200).json({ settings, message: 'Settings updated successfully' });
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({ message: 'Failed to update settings' });
    }
  }

  /**
   * GET /api/admin/email-templates - Get email templates
   */
  static async getEmailTemplates(req: Request, res: Response): Promise<void> {
    try {
      const templates = await AdminService.getEmailTemplates();
      res.status(200).json({ templates });
    } catch (error) {
      console.error('Error getting email templates:', error);
      res.status(500).json({ message: 'Failed to fetch email templates' });
    }
  }

  /**
   * PUT /api/admin/email-templates/:id - Update email template
   */
  static async updateEmailTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { subject, content } = req.body;

      if (!id) {
        res.status(400).json({ error: 'Invalid template ID' });
        return;
      }

      if (!subject || subject.trim() === '') {
        res.status(400).json({ message: 'Subject is required' });
        return;
      }

      if (!content || content.trim() === '') {
        res.status(400).json({ message: 'Content is required' });
        return;
      }

      const template = await AdminService.updateEmailTemplate(id, subject, content);

      await AdminService.logAdminAction(
        (req.user as any)?.userId,
        'UPDATE_EMAIL_TEMPLATE',
        'Email template updated',
        id,
        'email_template'
      );

      res.status(200).json({ template });
    } catch (error) {
      console.error('Error updating email template:', error);
      res.status(500).json({ message: 'Failed to update email template' });
    }
  }

  /**
   * GET /api/admin/activity-logs - Get activity logs
   */
  static async getActivityLogs(req: Request, res: Response): Promise<void> {
    try {
      const { limit, offset } = req.query;

      const logs = await AdminService.getActivityLogs(
        limit ? parseInt(limit as string) : 100,
        offset ? parseInt(offset as string) : 0
      );

      res.status(200).json(logs);
    } catch (error) {
      console.error('Error getting activity logs:', error);
      res.status(500).json({ message: 'Failed to fetch activity logs' });
    }
  }

  /**
   * GET /api/admin/companies/pending - Get companies for verification
   */
  static async getCompaniesForVerification(req: Request, res: Response): Promise<void> {
    try {
      const { limit, offset } = req.query;

      const companies = await AdminService.getCompaniesForVerification(
        limit ? parseInt(limit as string) : 20,
        offset ? parseInt(offset as string) : 0
      );

      res.status(200).json(companies);
    } catch (error) {
      console.error('Error getting companies:', error);
      res.status(500).json({ message: 'Failed to fetch companies' });
    }
  }

  /**
   * GET /api/admin/companies - Get all companies with optional filters
   */
  static async getCompanies(req: Request, res: Response): Promise<void> {
    try {
      const { status, search, limit, offset } = req.query;
      const companies = await AdminService.getCompanies({
        status: status as string | undefined,
        search: search as string | undefined,
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0,
      });
      res.status(200).json(companies);
    } catch (error) {
      console.error('Error getting companies:', error);
      res.status(500).json({ message: 'Failed to fetch companies' });
    }
  }

  /**
   * PUT /api/admin/companies/:id/verify - Verify company
   */
  static async verifyCompany(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { level, reviewNotes, overrideDocuments } = req.body || {};

      if (!id) {
        res.status(400).json({ error: 'Invalid company ID' });
        return;
      }

      if (level && !['basic', 'full'].includes(level)) {
        res.status(400).json({ error: 'Invalid verification level' });
        return;
      }

      const company = await AdminService.verifyCompany(id, {
        level,
        reviewNotes,
        overrideDocuments,
      });

      await AdminService.logAdminAction(
        (req.user as any)?.userId,
        'VERIFY_COMPANY',
        `Company verified (${level || 'basic'})`,
        id,
        'company'
      );

      res.status(200).json({ company });
    } catch (error) {
      console.error('Error verifying company:', error);
      res.status(500).json({ message: 'Failed to verify company' });
    }
  }

  /**
   * PUT /api/admin/companies/:id/reject - Reject company verification
   */
  static async rejectCompanyVerification(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!id) {
        res.status(400).json({ error: 'Invalid company ID' });
        return;
      }

      if (!reason || reason.trim() === '') {
        res.status(400).json({ error: 'Rejection reason is required' });
        return;
      }

      const company = await AdminService.rejectCompanyVerification(id, reason);

      await AdminService.logAdminAction(
        (req.user as any)?.userId,
        'REJECT_COMPANY_VERIFICATION',
        `Company verification rejected: ${reason}`,
        id,
        'company'
      );

      res.status(200).json({ company });
    } catch (error) {
      console.error('Error rejecting company verification:', error);
      res.status(500).json({ message: 'Failed to reject company verification' });
    }
  }

  /**
   * PUT /api/admin/companies/:id/request-documents
   */
  static async requestCompanyDocuments(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason, requiredDocuments } = req.body || {};

      if (!id) {
        res.status(400).json({ error: 'Invalid company ID' });
        return;
      }

      const company = await AdminService.requestCompanyDocuments(
        id,
        String(reason || ''),
        Array.isArray(requiredDocuments) ? requiredDocuments : []
      );

      await AdminService.logAdminAction(
        (req.user as any)?.userId,
        'REQUEST_COMPANY_DOCUMENTS',
        `Documents requested: ${String(reason || '').trim() || 'manual review requested'}`,
        id,
        'company'
      );

      res.status(200).json({ company });
    } catch (error) {
      console.error('Error requesting company documents:', error);
      res.status(500).json({ message: 'Failed to request company documents' });
    }
  }

  /**
   * PUT /api/admin/companies/:id/mark-documents-received
   */
  static async markCompanyDocumentsReceived(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reviewNotes } = req.body || {};

      if (!id) {
        res.status(400).json({ error: 'Invalid company ID' });
        return;
      }

      const company = await AdminService.markCompanyDocumentsReceived(id, reviewNotes);

      await AdminService.logAdminAction(
        (req.user as any)?.userId,
        'MARK_COMPANY_DOCUMENTS_RECEIVED',
        'Company documents marked as received',
        id,
        'company'
      );

      res.status(200).json({ company });
    } catch (error) {
      console.error('Error marking company documents received:', error);
      res.status(500).json({ message: 'Failed to mark company documents received' });
    }
  }
}

export default AdminController;
