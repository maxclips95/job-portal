import { Request, Response, NextFunction } from 'express';
import JobController from '../job.controller';
import JobService from '../../services/job.service';

jest.mock('../../services/job.service');

const mockRequest = (overrides = {}) =>
  ({
    body: {},
    params: {},
    query: {},
    user: { id: 1, role: 'candidate' },
    ...overrides,
  } as unknown as Request);

const mockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
};

const mockNext = () => jest.fn() as NextFunction;

describe('JobController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllJobs', () => {
    it('should return all jobs with 200 status', async () => {
      const mockJobs = [
        {
          id: 1,
          title: 'Frontend Developer',
          company: 'Tech Corp',
          location: 'New York',
        },
      ];

      (JobService.getJobsByFilter as jest.Mock).mockResolvedValue(mockJobs);

      const req = mockRequest({
        query: { limit: '10', offset: '0' },
      });
      const res = mockResponse();

      await JobController.getAllJobs(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          jobs: mockJobs,
        })
      );
    });

    it('should return 400 if limit or offset is invalid', async () => {
      const req = mockRequest({
        query: { limit: 'invalid', offset: '0' },
      });
      const res = mockResponse();

      await JobController.getAllJobs(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle service errors with 500 status', async () => {
      (JobService.getJobsByFilter as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const req = mockRequest();
      const res = mockResponse();

      await JobController.getAllJobs(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('searchJobs', () => {
    it('should search jobs by keyword', async () => {
      const mockResults = [
        { id: 1, title: 'Frontend Developer' },
      ];

      (JobService.searchJobs as jest.Mock).mockResolvedValue(mockResults);

      const req = mockRequest({
        query: { keyword: 'frontend', limit: '10', offset: '0' },
      });
      const res = mockResponse();

      await JobController.searchJobs(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          jobs: mockResults,
        })
      );
    });

    it('should return 400 if keyword is missing', async () => {
      const req = mockRequest({
        query: { limit: '10', offset: '0' },
      });
      const res = mockResponse();

      await JobController.searchJobs(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getJobById', () => {
    it('should return job details with 200 status', async () => {
      const mockJob = {
        id: 1,
        title: 'Frontend Developer',
        company: 'Tech Corp',
        description: 'Join our team',
      };

      (JobService.getJobById as jest.Mock).mockResolvedValue(mockJob);

      const req = mockRequest({
        params: { id: '1' },
      });
      const res = mockResponse();

      await JobController.getJobById(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockJob);
    });

    it('should return 404 if job not found', async () => {
      (JobService.getJobById as jest.Mock).mockResolvedValue(null);

      const req = mockRequest({
        params: { id: '999' },
      });
      const res = mockResponse();

      await JobController.getJobById(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('createJob', () => {
    it('should create job and return 201 status', async () => {
      const newJob = {
        id: 1,
        title: 'Senior Frontend Developer',
        company: 'Tech Corp',
        location: 'New York',
        jobType: 'Full-time',
        salaryMin: 100000,
        salaryMax: 150000,
        category: 'Technology',
        experience: 5,
        deadline: new Date('2026-03-01'),
        employerId: 1,
      };

      (JobService.createJob as jest.Mock).mockResolvedValue(newJob);

      const req = mockRequest({
        body: {
          title: 'Senior Frontend Developer',
          company: 'Tech Corp',
          location: 'New York',
          jobType: 'Full-time',
          salaryMin: 100000,
          salaryMax: 150000,
          category: 'Technology',
          experience: 5,
          deadline: '2026-03-01',
        },
        user: { id: 1, role: 'employer' },
      });
      const res = mockResponse();

      await JobController.createJob(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(newJob);
    });

    it('should return 400 if required fields are missing', async () => {
      const req = mockRequest({
        body: { title: 'Job Title' }, // Missing other required fields
      });
      const res = mockResponse();

      await JobController.createJob(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 401 if not authenticated', async () => {
      const req = mockRequest({
        body: { title: 'Job Title' },
        user: null,
      });
      const res = mockResponse();

      await JobController.createJob(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('updateJob', () => {
    it('should update job and return 200 status', async () => {
      const updatedJob = {
        id: 1,
        title: 'Updated Title',
        company: 'Tech Corp',
      };

      (JobService.updateJob as jest.Mock).mockResolvedValue(updatedJob);

      const req = mockRequest({
        params: { id: '1' },
        body: { title: 'Updated Title' },
      });
      const res = mockResponse();

      await JobController.updateJob(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedJob);
    });

    it('should return 404 if job not found', async () => {
      (JobService.updateJob as jest.Mock).mockRejectedValue(
        new Error('Job not found')
      );

      const req = mockRequest({
        params: { id: '999' },
        body: { title: 'Updated Title' },
      });
      const res = mockResponse();

      await JobController.updateJob(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteJob', () => {
    it('should delete job and return 200 status', async () => {
      (JobService.deleteJob as jest.Mock).mockResolvedValue(true);

      const req = mockRequest({
        params: { id: '1' },
      });
      const res = mockResponse();

      await JobController.deleteJob(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.any(String) })
      );
    });

    it('should return 404 if job not found', async () => {
      (JobService.deleteJob as jest.Mock).mockResolvedValue(false);

      const req = mockRequest({
        params: { id: '999' },
      });
      const res = mockResponse();

      await JobController.deleteJob(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('saveJob', () => {
    it('should save job and return 201 status', async () => {
      (JobService.saveJob as jest.Mock).mockResolvedValue(true);

      const req = mockRequest({
        params: { id: '1' },
        user: { id: 5, role: 'candidate' },
      });
      const res = mockResponse();

      await JobController.saveJob(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 409 if job already saved', async () => {
      (JobService.saveJob as jest.Mock).mockRejectedValue(
        new Error('Already saved')
      );

      const req = mockRequest({
        params: { id: '1' },
        user: { id: 5, role: 'candidate' },
      });
      const res = mockResponse();

      await JobController.saveJob(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('should return 401 if not authenticated', async () => {
      const req = mockRequest({
        params: { id: '1' },
        user: null,
      });
      const res = mockResponse();

      await JobController.saveJob(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('unsaveJob', () => {
    it('should unsave job and return 200 status', async () => {
      (JobService.unsaveJob as jest.Mock).mockResolvedValue(true);

      const req = mockRequest({
        params: { id: '1' },
        user: { id: 5, role: 'candidate' },
      });
      const res = mockResponse();

      await JobController.unsaveJob(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if save record not found', async () => {
      (JobService.unsaveJob as jest.Mock).mockResolvedValue(false);

      const req = mockRequest({
        params: { id: '999' },
        user: { id: 5, role: 'candidate' },
      });
      const res = mockResponse();

      await JobController.unsaveJob(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getSavedJobs', () => {
    it('should return saved jobs with pagination', async () => {
      const mockData = {
        jobs: [
          { id: 1, title: 'Frontend Developer' },
        ],
        total: 5,
      };

      (JobService.getSavedJobs as jest.Mock).mockResolvedValue(mockData);

      const req = mockRequest({
        query: { limit: '10', offset: '0' },
        user: { id: 5, role: 'candidate' },
      });
      const res = mockResponse();

      await JobController.getSavedJobs(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockData);
    });

    it('should return 401 if not authenticated', async () => {
      const req = mockRequest({
        query: { limit: '10', offset: '0' },
        user: null,
      });
      const res = mockResponse();

      await JobController.getSavedJobs(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('isJobSaved', () => {
    it('should return saved status', async () => {
      (JobService.isJobSaved as jest.Mock).mockResolvedValue(true);

      const req = mockRequest({
        params: { id: '1' },
        user: { id: 5, role: 'candidate' },
      });
      const res = mockResponse();

      await JobController.isJobSaved(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ saved: true })
      );
    });
  });

  describe('getSavedJobsCount', () => {
    it('should return count of saved jobs', async () => {
      (JobService.getSavedJobsCount as jest.Mock).mockResolvedValue(7);

      const req = mockRequest({
        user: { id: 5, role: 'candidate' },
      });
      const res = mockResponse();

      await JobController.getSavedJobsCount(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ count: 7 })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors with 500 status', async () => {
      (JobService.getJobById as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const req = mockRequest({
        params: { id: '1' },
      });
      const res = mockResponse();

      await JobController.getJobById(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should validate job ID format', async () => {
      const req = mockRequest({
        params: { id: 'invalid' },
      });
      const res = mockResponse();

      await JobController.getJobById(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Authorization', () => {
    it('should prevent non-employer from creating job', async () => {
      const req = mockRequest({
        body: { title: 'Job' },
        user: { id: 1, role: 'candidate' },
      });
      const res = mockResponse();

      await JobController.createJob(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should prevent non-employer from updating job', async () => {
      const req = mockRequest({
        params: { id: '1' },
        body: { title: 'Updated' },
        user: { id: 1, role: 'candidate' },
      });
      const res = mockResponse();

      await JobController.updateJob(req, res, mockNext());

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
