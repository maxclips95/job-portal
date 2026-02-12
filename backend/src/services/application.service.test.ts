import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import * as applicationService from '../application.service';

// Mock database
jest.mock('../database', () => ({
  query: jest.fn(),
}));

import { query } from '../database';

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('Application Service', () => {
  beforeEach(() => {
    mockQuery.mockClear();
  });

  describe('applyForJob', () => {
    test('should create a new application successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'app1',
            jobId: 'job1',
            candidateId: 'cand1',
            resume: 'resume.pdf',
            coverLetter: 'Sample letter',
            status: 'pending',
            appliedAt: new Date(),
          },
        ],
      });

      const result = await applicationService.applyForJob('job1', 'cand1', {
        resume: 'resume.pdf',
        coverLetter: 'Sample letter',
      });

      expect(result).toBeDefined();
      expect(result.jobId).toBe('job1');
      expect(result.candidateId).toBe('cand1');
      expect(mockQuery).toHaveBeenCalled();
    });

    test('should throw error if job not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        applicationService.applyForJob('invalid_job', 'cand1', {
          resume: 'resume.pdf',
          coverLetter: '',
        })
      ).rejects.toThrow('Job not found');
    });

    test('should throw error if already applied', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing' }] });

      await expect(
        applicationService.applyForJob('job1', 'cand1', {
          resume: 'resume.pdf',
          coverLetter: '',
        })
      ).rejects.toThrow('Already applied');
    });

    test('should throw error if resume not provided', async () => {
      await expect(
        applicationService.applyForJob('job1', 'cand1', {
          resume: '',
          coverLetter: 'Letter',
        })
      ).rejects.toThrow('Resume is required');
    });
  });

  describe('getMyApplications', () => {
    test('should fetch applications for candidate', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'app1',
            jobId: 'job1',
            title: 'Senior Dev',
            company: 'TechCorp',
            status: 'pending',
          },
          {
            id: 'app2',
            jobId: 'job2',
            title: 'Junior Dev',
            company: 'StartupXYZ',
            status: 'approved',
          },
        ],
      });

      const result = await applicationService.getMyApplications('cand1', {});

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Senior Dev');
      expect(mockQuery).toHaveBeenCalled();
    });

    test('should filter applications by status', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'app1',
            jobId: 'job1',
            title: 'Senior Dev',
            status: 'approved',
          },
        ],
      });

      const result = await applicationService.getMyApplications('cand1', {
        status: 'approved',
      });

      expect(result[0].status).toBe('approved');
    });

    test('should support pagination', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'app1',
            jobId: 'job1',
            title: 'Senior Dev',
          },
        ],
      });

      const result = await applicationService.getMyApplications('cand1', {
        limit: 10,
        offset: 0,
      });

      expect(Array.isArray(result)).toBe(true);
    });

    test('should return empty array if no applications', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await applicationService.getMyApplications('cand1', {});

      expect(result).toEqual([]);
    });
  });

  describe('getApplication', () => {
    test('should fetch application details', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'app1',
            jobId: 'job1',
            candidateId: 'cand1',
            status: 'pending',
            appliedAt: new Date(),
          },
        ],
      });

      const result = await applicationService.getApplication('app1');

      expect(result).toBeDefined();
      expect(result.id).toBe('app1');
      expect(mockQuery).toHaveBeenCalled();
    });

    test('should throw error if application not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        applicationService.getApplication('invalid_app')
      ).rejects.toThrow('Application not found');
    });
  });

  describe('withdrawApplication', () => {
    test('should withdraw application successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'app1',
            jobId: 'job1',
            status: 'withdrawn',
          },
        ],
      });

      const result = await applicationService.withdrawApplication(
        'app1',
        'cand1'
      );

      expect(result.status).toBe('withdrawn');
    });

    test('should throw error if not authorized', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'app1',
            candidateId: 'cand_different',
          },
        ],
      });

      await expect(
        applicationService.withdrawApplication('app1', 'cand1')
      ).rejects.toThrow('Not authorized');
    });

    test('should throw error if already withdrawn', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'app1',
            status: 'withdrawn',
            candidateId: 'cand1',
          },
        ],
      });

      await expect(
        applicationService.withdrawApplication('app1', 'cand1')
      ).rejects.toThrow('Already withdrawn');
    });
  });

  describe('getMyInterviews', () => {
    test('should fetch interviews for candidate', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'int1',
            applicationId: 'app1',
            jobTitle: 'Senior Dev',
            scheduledAt: new Date(),
            status: 'scheduled',
          },
        ],
      });

      const result = await applicationService.getMyInterviews('cand1');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('scheduled');
    });

    test('should return empty array if no interviews', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await applicationService.getMyInterviews('cand1');

      expect(result).toEqual([]);
    });
  });

  describe('getInterview', () => {
    test('should fetch interview details', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'int1',
            applicationId: 'app1',
            scheduledAt: new Date(),
            meetingLink: 'https://meet.google.com/...',
            status: 'scheduled',
          },
        ],
      });

      const result = await applicationService.getInterview('int1');

      expect(result).toBeDefined();
      expect(result.meetingLink).toBeDefined();
    });

    test('should throw error if interview not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        applicationService.getInterview('invalid_int')
      ).rejects.toThrow('Interview not found');
    });
  });

  describe('rescheduleInterview', () => {
    test('should reschedule interview successfully', async () => {
      const newDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'int1',
            applicationId: 'app1',
            scheduledAt: newDate,
            status: 'scheduled',
          },
        ],
      });

      const result = await applicationService.rescheduleInterview(
        'int1',
        'cand1',
        newDate
      );

      expect(result.scheduledAt).toEqual(newDate);
    });

    test('should throw error if date is in the past', async () => {
      const pastDate = new Date(Date.now() - 1000);

      await expect(
        applicationService.rescheduleInterview('int1', 'cand1', pastDate)
      ).rejects.toThrow('Date must be in the future');
    });

    test('should throw error if interview already completed', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'int1',
            status: 'completed',
            applicationId: 'app1',
          },
        ],
      });

      await expect(
        applicationService.rescheduleInterview(
          'int1',
          'cand1',
          new Date(Date.now() + 1000)
        )
      ).rejects.toThrow('Cannot reschedule completed interview');
    });
  });

  describe('submitInterviewFeedback', () => {
    test('should submit feedback successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'int1',
            feedback: 'Great candidate',
            feedbackSubmittedAt: new Date(),
            status: 'completed',
          },
        ],
      });

      const result = await applicationService.submitInterviewFeedback(
        'int1',
        'cand1',
        'Great candidate'
      );

      expect(result.feedback).toBe('Great candidate');
    });

    test('should require feedback text', async () => {
      await expect(
        applicationService.submitInterviewFeedback('int1', 'cand1', '')
      ).rejects.toThrow('Feedback is required');
    });

    test('should throw error if interview not completed', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'int1',
            status: 'scheduled',
            applicationId: 'app1',
          },
        ],
      });

      await expect(
        applicationService.submitInterviewFeedback('int1', 'cand1', 'Feedback')
      ).rejects.toThrow('Interview not completed yet');
    });
  });

  describe('getMyOffers', () => {
    test('should fetch offers for candidate', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'offer1',
            applicationId: 'app1',
            jobTitle: 'Senior Dev',
            annualSalary: 150000,
            status: 'pending',
          },
        ],
      });

      const result = await applicationService.getMyOffers('cand1');

      expect(result).toHaveLength(1);
      expect(result[0].annualSalary).toBe(150000);
    });

    test('should return empty array if no offers', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await applicationService.getMyOffers('cand1');

      expect(result).toEqual([]);
    });
  });

  describe('getOffer', () => {
    test('should fetch offer details', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'offer1',
            applicationId: 'app1',
            annualSalary: 150000,
            startDate: new Date(),
            status: 'pending',
          },
        ],
      });

      const result = await applicationService.getOffer('offer1');

      expect(result).toBeDefined();
      expect(result.annualSalary).toBe(150000);
    });

    test('should throw error if offer not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        applicationService.getOffer('invalid_offer')
      ).rejects.toThrow('Offer not found');
    });
  });

  describe('acceptOffer', () => {
    test('should accept offer successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'offer1',
            applicationId: 'app1',
            status: 'accepted',
            acceptedAt: new Date(),
          },
        ],
      });

      const result = await applicationService.acceptOffer('offer1', 'cand1');

      expect(result.status).toBe('accepted');
      expect(result.acceptedAt).toBeDefined();
    });

    test('should throw error if not authorized', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'offer1',
            applicationId: 'app1',
            candidateId: 'cand_different',
          },
        ],
      });

      await expect(
        applicationService.acceptOffer('offer1', 'cand1')
      ).rejects.toThrow('Not authorized');
    });

    test('should throw error if offer already accepted', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'offer1',
            status: 'accepted',
            applicationId: 'app1',
          },
        ],
      });

      await expect(
        applicationService.acceptOffer('offer1', 'cand1')
      ).rejects.toThrow('Offer already accepted');
    });

    test('should throw error if offer expired', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'offer1',
            status: 'expired',
            applicationId: 'app1',
          },
        ],
      });

      await expect(
        applicationService.acceptOffer('offer1', 'cand1')
      ).rejects.toThrow('Offer expired');
    });
  });

  describe('rejectOffer', () => {
    test('should reject offer successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'offer1',
            applicationId: 'app1',
            status: 'rejected',
            rejectionReason: 'Better opportunity',
            rejectedAt: new Date(),
          },
        ],
      });

      const result = await applicationService.rejectOffer(
        'offer1',
        'cand1',
        'Better opportunity'
      );

      expect(result.status).toBe('rejected');
      expect(result.rejectionReason).toBe('Better opportunity');
    });

    test('should throw error if already rejected', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'offer1',
            status: 'rejected',
            applicationId: 'app1',
          },
        ],
      });

      await expect(
        applicationService.rejectOffer('offer1', 'cand1', 'Reason')
      ).rejects.toThrow('Offer already rejected');
    });

    test('should require rejection reason', async () => {
      await expect(
        applicationService.rejectOffer('offer1', 'cand1', '')
      ).rejects.toThrow('Rejection reason is required');
    });
  });

  describe('getStatistics', () => {
    test('should return application statistics', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total: 15,
            pending: 3,
            reviewed: 5,
            shortlisted: 4,
            rejected: 2,
            accepted: 1,
          },
        ],
      });

      const result = await applicationService.getStatistics('cand1');

      expect(result.total).toBe(15);
      expect(result.pending).toBe(3);
      expect(result.accepted).toBe(1);
    });

    test('should return zeros if no applications', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total: 0,
            pending: 0,
            reviewed: 0,
            shortlisted: 0,
            rejected: 0,
            accepted: 0,
          },
        ],
      });

      const result = await applicationService.getStatistics('cand1');

      expect(result.total).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(
        applicationService.getMyApplications('cand1', {})
      ).rejects.toThrow('Database connection failed');
    });

    test('should validate input parameters', async () => {
      await expect(
        applicationService.applyForJob('', 'cand1', { resume: 'file.pdf', coverLetter: '' })
      ).rejects.toThrow('Job ID is required');
    });

    test('should handle concurrent operations', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const [result1, result2] = await Promise.all([
        applicationService.getMyApplications('cand1', {}),
        applicationService.getMyApplications('cand2', {}),
      ]);

      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
    });
  });
});
