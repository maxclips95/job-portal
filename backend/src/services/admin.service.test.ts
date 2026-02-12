import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import * as adminService from '../admin.service';

jest.mock('../database', () => ({
  query: jest.fn(),
}));

import { query } from '../database';

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('Admin Service', () => {
  beforeEach(() => {
    mockQuery.mockClear();
  });

  describe('getDashboardStats', () => {
    test('should return dashboard statistics', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            totalUsers: 500,
            totalJobs: 125,
            totalApplications: 3500,
            activeUsers: 45,
            pendingApprovals: 12,
            totalRevenue: 5000,
          },
        ],
      });

      const result = await adminService.getDashboardStats();

      expect(result.totalUsers).toBe(500);
      expect(result.totalJobs).toBe(125);
      expect(result.totalApplications).toBe(3500);
      expect(result.activeUsers).toBe(45);
    });

    test('should handle missing data gracefully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            totalUsers: 0,
            totalJobs: 0,
            totalApplications: 0,
            activeUsers: 0,
            pendingApprovals: 0,
            totalRevenue: 0,
          },
        ],
      });

      const result = await adminService.getDashboardStats();

      expect(result.totalUsers).toBe(0);
    });
  });

  describe('getUsers', () => {
    test('should fetch users with default filters', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'user1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            role: 'candidate',
            status: 'active',
          },
          {
            id: 'user2',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            role: 'employer',
            status: 'active',
          },
        ],
      });

      const result = await adminService.getUsers({});

      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('john@example.com');
    });

    test('should filter users by role', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'user1',
            role: 'employer',
            status: 'active',
          },
        ],
      });

      const result = await adminService.getUsers({ role: 'employer' });

      expect(result[0].role).toBe('employer');
      expect(mockQuery).toHaveBeenCalled();
    });

    test('should filter users by status', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'user1',
            status: 'suspended',
            role: 'candidate',
          },
        ],
      });

      const result = await adminService.getUsers({ status: 'suspended' });

      expect(result[0].status).toBe('suspended');
    });

    test('should search users by email or name', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'user1',
            firstName: 'John',
            email: 'john@example.com',
          },
        ],
      });

      const result = await adminService.getUsers({ search: 'john' });

      expect(result).toHaveLength(1);
    });

    test('should support pagination', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 'user1', firstName: 'User1' },
          { id: 'user2', firstName: 'User2' },
        ],
      });

      const result = await adminService.getUsers({ limit: 10, offset: 0 });

      expect(Array.isArray(result)).toBe(true);
    });

    test('should return empty array if no users found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await adminService.getUsers({});

      expect(result).toEqual([]);
    });
  });

  describe('getUserById', () => {
    test('should fetch user by ID', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'user1',
            firstName: 'John',
            email: 'john@example.com',
            role: 'candidate',
          },
        ],
      });

      const result = await adminService.getUserById('user1');

      expect(result.id).toBe('user1');
      expect(result.firstName).toBe('John');
    });

    test('should throw error if user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(adminService.getUserById('invalid')).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('updateUserStatus', () => {
    test('should update user status successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'user1',
            status: 'suspended',
          },
        ],
      });

      const result = await adminService.updateUserStatus('user1', 'suspended');

      expect(result.status).toBe('suspended');
    });

    test('should validate status values', async () => {
      await expect(
        adminService.updateUserStatus('user1', 'invalid_status' as any)
      ).rejects.toThrow('Invalid status');
    });

    test('should support active status', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'user1', status: 'active' }],
      });

      const result = await adminService.updateUserStatus('user1', 'active');

      expect(result.status).toBe('active');
    });

    test('should support banned status', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'user1', status: 'banned' }],
      });

      const result = await adminService.updateUserStatus('user1', 'banned');

      expect(result.status).toBe('banned');
    });
  });

  describe('updateUserRole', () => {
    test('should update user role successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'user1',
            role: 'admin',
          },
        ],
      });

      const result = await adminService.updateUserRole('user1', 'admin');

      expect(result.role).toBe('admin');
    });

    test('should validate role values', async () => {
      await expect(
        adminService.updateUserRole('user1', 'invalid_role' as any)
      ).rejects.toThrow('Invalid role');
    });

    test('should prevent self-demotion from admin', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'admin_user',
            role: 'admin',
          },
        ],
      });

      await expect(
        adminService.updateUserRole('admin_user', 'candidate')
      ).rejects.toThrow('Cannot remove admin role');
    });
  });

  describe('deleteUser', () => {
    test('should delete user successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'user1' }] });

      await adminService.deleteUser('user1');

      expect(mockQuery).toHaveBeenCalled();
    });

    test('should throw error if user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(adminService.deleteUser('invalid')).rejects.toThrow(
        'User not found'
      );
    });

    test('should prevent deleting last admin', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'admin1', role: 'admin' }],
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{ count: 1 }], // Only 1 admin exists
      });

      await expect(adminService.deleteUser('admin1')).rejects.toThrow(
        'Cannot delete last admin'
      );
    });
  });

  describe('getPendingJobs', () => {
    test('should fetch pending jobs for approval', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'job1',
            title: 'Senior Dev',
            company: 'TechCorp',
            status: 'pending',
          },
          {
            id: 'job2',
            title: 'Junior Dev',
            company: 'StartupXYZ',
            status: 'pending',
          },
        ],
      });

      const result = await adminService.getPendingJobs(10, 0);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('pending');
    });

    test('should support pagination', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await adminService.getPendingJobs(10, 20);

      expect(mockQuery).toHaveBeenCalled();
    });

    test('should return empty array if no pending jobs', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await adminService.getPendingJobs(10, 0);

      expect(result).toEqual([]);
    });
  });

  describe('approveJob', () => {
    test('should approve job successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'job1',
            title: 'Senior Dev',
            status: 'approved',
          },
        ],
      });

      const result = await adminService.approveJob('job1');

      expect(result.status).toBe('approved');
    });

    test('should throw error if job not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(adminService.approveJob('invalid')).rejects.toThrow(
        'Job not found'
      );
    });

    test('should throw error if job already approved', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'job1',
            status: 'approved',
          },
        ],
      });

      await expect(adminService.approveJob('job1')).rejects.toThrow(
        'Job already approved'
      );
    });
  });

  describe('rejectJob', () => {
    test('should reject job with reason', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'job1',
            status: 'rejected',
            rejectionReason: 'Inappropriate content',
          },
        ],
      });

      const result = await adminService.rejectJob('job1', 'Inappropriate content');

      expect(result.status).toBe('rejected');
      expect(result.rejectionReason).toBe('Inappropriate content');
    });

    test('should require rejection reason', async () => {
      await expect(adminService.rejectJob('job1', '')).rejects.toThrow(
        'Rejection reason is required'
      );
    });

    test('should throw error if job already rejected', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'job1',
            status: 'rejected',
          },
        ],
      });

      await expect(
        adminService.rejectJob('job1', 'Reason')
      ).rejects.toThrow('Job already rejected');
    });
  });

  describe('getJobAnalytics', () => {
    test('should return job analytics', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total: 200,
            approved: 150,
            pending: 30,
            rejected: 20,
            active: 120,
            expired: 30,
          },
        ],
      });

      const result = await adminService.getJobAnalytics();

      expect(result.total).toBe(200);
      expect(result.approved).toBe(150);
      expect(result.pending).toBe(30);
    });

    test('should handle empty analytics', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total: 0,
            approved: 0,
            pending: 0,
            rejected: 0,
            active: 0,
            expired: 0,
          },
        ],
      });

      const result = await adminService.getJobAnalytics();

      expect(result.total).toBe(0);
    });
  });

  describe('getUserAnalytics', () => {
    test('should return user analytics', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            totalCandidates: 350,
            totalEmployers: 75,
            activeToday: 42,
            newThisMonth: 28,
            suspendedCount: 5,
          },
        ],
      });

      const result = await adminService.getUserAnalytics();

      expect(result.totalCandidates).toBe(350);
      expect(result.totalEmployers).toBe(75);
      expect(result.activeToday).toBe(42);
    });
  });

  describe('getSystemSettings', () => {
    test('should fetch system settings', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            siteName: 'Job Portal',
            siteDescription: 'Find and post jobs',
            maxJobsPerDay: 10,
            notificationEmail: 'admin@jobportal.com',
          },
        ],
      });

      const result = await adminService.getSystemSettings();

      expect(result.siteName).toBe('Job Portal');
      expect(result.maxJobsPerDay).toBe(10);
    });
  });

  describe('updateSystemSettings', () => {
    test('should update system settings', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            siteName: 'Updated Portal',
            maxJobsPerDay: 20,
          },
        ],
      });

      const result = await adminService.updateSystemSettings({
        siteName: 'Updated Portal',
        maxJobsPerDay: 20,
      });

      expect(result.siteName).toBe('Updated Portal');
    });

    test('should validate settings', async () => {
      await expect(
        adminService.updateSystemSettings({
          maxJobsPerDay: -1, // Invalid
        })
      ).rejects.toThrow('Invalid settings');
    });
  });

  describe('getActivityLogs', () => {
    test('should fetch activity logs', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'log1',
            adminId: 'admin1',
            action: 'approve_job',
            description: 'Approved job Senior Dev',
            targetId: 'job1',
            createdAt: new Date(),
          },
          {
            id: 'log2',
            adminId: 'admin1',
            action: 'reject_user',
            description: 'Banned user for spam',
            targetId: 'user5',
            createdAt: new Date(),
          },
        ],
      });

      const result = await adminService.getActivityLogs(10, 0);

      expect(result).toHaveLength(2);
      expect(result[0].action).toBe('approve_job');
    });

    test('should support pagination for logs', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await adminService.getActivityLogs(25, 50);

      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('logAdminAction', () => {
    test('should log admin action', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'log1',
            adminId: 'admin1',
            action: 'approve_job',
          },
        ],
      });

      const result = await adminService.logAdminAction(
        'admin1',
        'approve_job',
        'Approved Senior Dev job',
        'job1'
      );

      expect(result.action).toBe('approve_job');
    });
  });

  describe('getCompaniesForVerification', () => {
    test('should fetch companies pending verification', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'comp1',
            name: 'TechCorp',
            status: 'pending',
          },
          {
            id: 'comp2',
            name: 'StartupXYZ',
            status: 'pending',
          },
        ],
      });

      const result = await adminService.getCompaniesForVerification(10, 0);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('pending');
    });

    test('should support pagination', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await adminService.getCompaniesForVerification(10, 20);

      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('verifyCompany', () => {
    test('should verify company successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'comp1',
            name: 'TechCorp',
            status: 'verified',
          },
        ],
      });

      const result = await adminService.verifyCompany('comp1');

      expect(result.status).toBe('verified');
    });

    test('should throw error if company not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(adminService.verifyCompany('invalid')).rejects.toThrow(
        'Company not found'
      );
    });

    test('should throw error if already verified', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'comp1',
            status: 'verified',
          },
        ],
      });

      await expect(adminService.verifyCompany('comp1')).rejects.toThrow(
        'Company already verified'
      );
    });
  });

  describe('rejectCompanyVerification', () => {
    test('should reject company with reason', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'comp1',
            status: 'rejected',
            rejectionReason: 'Invalid documentation',
          },
        ],
      });

      const result = await adminService.rejectCompanyVerification(
        'comp1',
        'Invalid documentation'
      );

      expect(result.status).toBe('rejected');
    });

    test('should require rejection reason', async () => {
      await expect(
        adminService.rejectCompanyVerification('comp1', '')
      ).rejects.toThrow('Rejection reason is required');
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(adminService.getDashboardStats()).rejects.toThrow(
        'Database error'
      );
    });

    test('should handle concurrent admin operations', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'user1', status: 'active' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'user2', status: 'suspended' }] });

      const [result1, result2] = await Promise.all([
        adminService.updateUserStatus('user1', 'active'),
        adminService.updateUserStatus('user2', 'suspended'),
      ]);

      expect(result1.status).toBe('active');
      expect(result2.status).toBe('suspended');
    });
  });
});
