import JobService from '../job.service';
import db from '../../config/database';

jest.mock('../../config/database');

describe('JobService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createJob', () => {
    it('should create a new job successfully', async () => {
      const mockJob = {
        id: 1,
        title: 'Senior Frontend Developer',
        company: 'Tech Corp',
        description: 'Join our team',
        location: 'New York',
        jobType: 'Full-time',
        category: 'Technology',
        salaryMin: 100000,
        salaryMax: 150000,
        experience: 5,
        deadline: new Date('2026-03-01'),
        postedDate: new Date(),
        employerId: 1,
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockJob],
      });

      const result = await JobService.createJob({
        title: 'Senior Frontend Developer',
        company: 'Tech Corp',
        description: 'Join our team',
        location: 'New York',
        jobType: 'Full-time',
        category: 'Technology',
        salaryMin: 100000,
        salaryMax: 150000,
        experience: 5,
        deadline: new Date('2026-03-01'),
        employerId: 1,
      });

      expect(result).toEqual(mockJob);
      expect(db.query).toHaveBeenCalled();
    });

    it('should throw error if title is missing', async () => {
      await expect(
        JobService.createJob({
          title: '',
          company: 'Tech Corp',
          description: 'Join our team',
          location: 'New York',
          jobType: 'Full-time',
          category: 'Technology',
          salaryMin: 100000,
          salaryMax: 150000,
          experience: 5,
          deadline: new Date('2026-03-01'),
          employerId: 1,
        })
      ).rejects.toThrow();
    });

    it('should throw error if salary range is invalid', async () => {
      await expect(
        JobService.createJob({
          title: 'Senior Frontend Developer',
          company: 'Tech Corp',
          description: 'Join our team',
          location: 'New York',
          jobType: 'Full-time',
          category: 'Technology',
          salaryMin: 150000,
          salaryMax: 100000, // Invalid: max < min
          experience: 5,
          deadline: new Date('2026-03-01'),
          employerId: 1,
        })
      ).rejects.toThrow();
    });
  });

  describe('getJobById', () => {
    it('should retrieve job by ID', async () => {
      const mockJob = {
        id: 1,
        title: 'Senior Frontend Developer',
        company: 'Tech Corp',
        description: 'Join our team',
        location: 'New York',
        jobType: 'Full-time',
        category: 'Technology',
        salaryMin: 100000,
        salaryMax: 150000,
        experience: 5,
        postedDate: new Date(),
        deadline: new Date('2026-03-01'),
        employerId: 1,
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockJob],
      });

      const result = await JobService.getJobById(1);

      expect(result).toEqual(mockJob);
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [1]);
    });

    it('should return null if job not found', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      const result = await JobService.getJobById(999);

      expect(result).toBeNull();
    });

    it('should throw error for invalid job ID', async () => {
      await expect(JobService.getJobById(-1)).rejects.toThrow();
    });
  });

  describe('getJobsByFilter', () => {
    it('should retrieve jobs with filters', async () => {
      const mockJobs = [
        {
          id: 1,
          title: 'Frontend Developer',
          company: 'Tech Corp',
          location: 'New York',
          jobType: 'Full-time',
          category: 'Technology',
          salaryMin: 100000,
          salaryMax: 150000,
          experience: 5,
          postedDate: new Date(),
          deadline: new Date('2026-03-01'),
        },
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockJobs,
      });

      const result = await JobService.getJobsByFilter({
        category: 'Technology',
        location: 'New York',
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual(mockJobs);
      expect(db.query).toHaveBeenCalled();
    });

    it('should handle pagination correctly', async () => {
      const mockJobs = [];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockJobs,
      });

      const result = await JobService.getJobsByFilter({
        limit: 10,
        offset: 20, // Page 3
      });

      expect(result).toEqual(mockJobs);
      expect(db.query).toHaveBeenCalled();
    });

    it('should apply multiple filters', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      await JobService.getJobsByFilter({
        category: 'Technology',
        location: 'New York',
        jobType: 'Full-time',
        salaryMin: 100000,
        limit: 10,
        offset: 0,
      });

      expect(db.query).toHaveBeenCalled();
    });
  });

  describe('updateJob', () => {
    it('should update job successfully', async () => {
      const mockUpdatedJob = {
        id: 1,
        title: 'Updated Title',
        company: 'Tech Corp',
        description: 'Updated description',
        location: 'New York',
        jobType: 'Full-time',
        category: 'Technology',
        salaryMin: 120000,
        salaryMax: 160000,
        experience: 6,
        postedDate: new Date(),
        deadline: new Date('2026-03-01'),
        employerId: 1,
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockUpdatedJob],
      });

      const result = await JobService.updateJob(1, {
        title: 'Updated Title',
        description: 'Updated description',
        salaryMin: 120000,
        salaryMax: 160000,
      });

      expect(result).toEqual(mockUpdatedJob);
    });

    it('should throw error if job not found', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      await expect(
        JobService.updateJob(999, { title: 'New Title' })
      ).rejects.toThrow();
    });

    it('should not update with invalid salary range', async () => {
      await expect(
        JobService.updateJob(1, {
          salaryMin: 150000,
          salaryMax: 100000, // Invalid
        })
      ).rejects.toThrow();
    });
  });

  describe('deleteJob', () => {
    it('should delete job successfully', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rowCount: 1,
      });

      const result = await JobService.deleteJob(1);

      expect(result).toBe(true);
    });

    it('should return false if job not found', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rowCount: 0,
      });

      const result = await JobService.deleteJob(999);

      expect(result).toBe(false);
    });
  });

  describe('searchJobs', () => {
    it('should search jobs by keyword', async () => {
      const mockResults = [
        {
          id: 1,
          title: 'Frontend Developer',
          company: 'Tech Corp',
          description: 'Join our team',
          location: 'New York',
        },
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockResults,
      });

      const result = await JobService.searchJobs('Frontend', 10, 0);

      expect(result).toEqual(mockResults);
      expect(db.query).toHaveBeenCalled();
    });

    it('should return empty array if no matches', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      const result = await JobService.searchJobs('NonExistent', 10, 0);

      expect(result).toEqual([]);
    });

    it('should handle special characters in search', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      await JobService.searchJobs('C++/Java', 10, 0);

      expect(db.query).toHaveBeenCalled();
    });
  });

  describe('saveJob', () => {
    it('should save job for candidate', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 1, job_id: 1, candidate_id: 5 }],
      });

      const result = await JobService.saveJob(1, 5);

      expect(result).toBeTruthy();
    });

    it('should throw error if job already saved', async () => {
      (db.query as jest.Mock).mockRejectedValueOnce(
        new Error('duplicate key value')
      );

      await expect(JobService.saveJob(1, 5)).rejects.toThrow();
    });

    it('should throw error if job or candidate not found', async () => {
      (db.query as jest.Mock).mockRejectedValueOnce(
        new Error('foreign key constraint')
      );

      await expect(JobService.saveJob(999, 999)).rejects.toThrow();
    });
  });

  describe('unsaveJob', () => {
    it('should unsave job for candidate', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rowCount: 1,
      });

      const result = await JobService.unsaveJob(1, 5);

      expect(result).toBe(true);
    });

    it('should return false if save record not found', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rowCount: 0,
      });

      const result = await JobService.unsaveJob(999, 999);

      expect(result).toBe(false);
    });
  });

  describe('getSavedJobs', () => {
    it('should get all saved jobs for candidate with pagination', async () => {
      const mockSavedJobs = {
        jobs: [
          {
            id: 1,
            title: 'Frontend Developer',
            company: 'Tech Corp',
            location: 'New York',
            jobType: 'Full-time',
            salaryMin: 100000,
            salaryMax: 150000,
          },
        ],
        total: 5,
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockSavedJobs.jobs,
      });

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ count: 5 }],
      });

      const result = await JobService.getSavedJobs(5, 10, 0);

      expect(result.jobs).toEqual(mockSavedJobs.jobs);
      expect(result.total).toBe(5);
    });

    it('should return empty list if candidate has no saved jobs', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ count: 0 }],
      });

      const result = await JobService.getSavedJobs(999, 10, 0);

      expect(result.jobs).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('isJobSaved', () => {
    it('should return true if job is saved', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ saved: true }],
      });

      const result = await JobService.isJobSaved(1, 5);

      expect(result).toBe(true);
    });

    it('should return false if job is not saved', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ saved: false }],
      });

      const result = await JobService.isJobSaved(1, 5);

      expect(result).toBe(false);
    });
  });

  describe('getSavedJobsCount', () => {
    it('should return count of saved jobs', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ count: 7 }],
      });

      const result = await JobService.getSavedJobsCount(5);

      expect(result).toBe(7);
    });

    it('should return 0 if candidate has no saved jobs', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ count: 0 }],
      });

      const result = await JobService.getSavedJobsCount(999);

      expect(result).toBe(0);
    });
  });

  describe('getJobsByEmployer', () => {
    it('should retrieve all jobs posted by employer', async () => {
      const mockJobs = [
        {
          id: 1,
          title: 'Frontend Developer',
          company: 'Tech Corp',
          status: 'approved',
          postedDate: new Date(),
        },
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockJobs,
      });

      const result = await JobService.getJobsByEmployer(1);

      expect(result).toEqual(mockJobs);
    });

    it('should return empty array if employer has no jobs', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      const result = await JobService.getJobsByEmployer(999);

      expect(result).toEqual([]);
    });
  });

  describe('getApprovedJobs', () => {
    it('should retrieve only approved jobs', async () => {
      const mockJobs = [
        {
          id: 1,
          title: 'Frontend Developer',
          status: 'approved',
        },
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockJobs,
      });

      const result = await JobService.getApprovedJobs(10, 0);

      expect(result).toEqual(mockJobs);
    });
  });

  describe('updateJobStatus', () => {
    it('should update job status to approved', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 1, status: 'approved' }],
      });

      const result = await JobService.updateJobStatus(1, 'approved');

      expect(result.status).toBe('approved');
    });

    it('should throw error for invalid status', async () => {
      await expect(
        JobService.updateJobStatus(1, 'invalid_status')
      ).rejects.toThrow();
    });
  });

  describe('getJobStatistics', () => {
    it('should return job statistics', async () => {
      const mockStats = {
        totalJobs: 150,
        approvedJobs: 120,
        pendingJobs: 20,
        rejectedJobs: 10,
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: 150 }] })
        .mockResolvedValueOnce({ rows: [{ count: 120 }] })
        .mockResolvedValueOnce({ rows: [{ count: 20 }] })
        .mockResolvedValueOnce({ rows: [{ count: 10 }] });

      const result = await JobService.getJobStatistics();

      expect(result.totalJobs).toBe(150);
      expect(result.approvedJobs).toBe(120);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      (db.query as jest.Mock).mockRejectedValueOnce(
        new Error('Connection refused')
      );

      await expect(JobService.getJobsByEmployer(1)).rejects.toThrow(
        'Connection refused'
      );
    });

    it('should handle null parameters gracefully', async () => {
      await expect(JobService.getJobById(null as any)).rejects.toThrow();
    });

    it('should handle concurrent operations', async () => {
      (db.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 1 }],
      });

      const promise1 = JobService.getJobById(1);
      const promise2 = JobService.getJobById(2);

      const results = await Promise.all([promise1, promise2]);

      expect(results).toHaveLength(2);
    });
  });
});
