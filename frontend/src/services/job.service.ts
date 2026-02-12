import axios, { AxiosInstance } from 'axios';
import { Job, JobSearchFilters, JobCategory } from '@/types/job';

class JobService {
  private api: AxiosInstance;
  private apiOrigin = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  private baseURL = this.apiOrigin.endsWith('/api') ? this.apiOrigin : `${this.apiOrigin}/api`;

  constructor() {
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  async createJob(jobData: any): Promise<Job> {
    const response = await this.api.post('/jobs', jobData);
    return response.data.data;
  }

  async getJob(jobId: string): Promise<Job> {
    const response = await this.api.get(`/jobs/${jobId}`);
    return response.data.data;
  }

  async updateJob(jobId: string, jobData: Partial<Job>): Promise<Job> {
    const response = await this.api.put(`/jobs/${jobId}`, jobData);
    return response.data.data;
  }

  async publishJob(jobId: string): Promise<Job> {
    const response = await this.api.post(`/jobs/${jobId}/publish`);
    return response.data.data;
  }

  async closeJob(jobId: string): Promise<Job> {
    const response = await this.api.post(`/jobs/${jobId}/close`);
    return response.data.data;
  }

  async deleteJob(jobId: string): Promise<void> {
    await this.api.delete(`/jobs/${jobId}`);
  }

  async searchJobs(filters: JobSearchFilters): Promise<{ jobs: Job[]; pagination: any }> {
    const params = new URLSearchParams();
    
    if (filters.keyword) params.append('keyword', filters.keyword);
    if (filters.category_id) params.append('category_id', filters.category_id);
    if (filters.location) params.append('location', filters.location);
    if (filters.country) params.append('country', filters.country);
    if (filters.city) params.append('city', filters.city);
    if (filters.job_type) params.append('job_type', filters.job_type);
    if (filters.experience_level) params.append('experience_level', filters.experience_level);
    if (filters.salary_min) params.append('salary_min', filters.salary_min.toString());
    if (filters.salary_max) params.append('salary_max', filters.salary_max.toString());
    if (filters.is_remote) params.append('is_remote', 'true');
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.sort) params.append('sort', filters.sort);

    const response = await this.api.get(`/jobs/search?${params.toString()}`);
    return {
      jobs: response.data.data.data,
      pagination: response.data.data.pagination,
    };
  }

  async getFeaturedJobs(limit = 10): Promise<Job[]> {
    const response = await this.api.get(`/jobs/featured?limit=${limit}`);
    return response.data.data;
  }

  async getEmployerJobs(status?: string): Promise<Job[]> {
    const url = status ? `/jobs/employer/jobs?status=${status}` : '/jobs/employer/jobs';
    const response = await this.api.get(url);
    return response.data.data;
  }

  async getCategories(): Promise<JobCategory[]> {
    const response = await this.api.get('/jobs/categories');
    return response.data.data;
  }

  async getSubcategories(categoryId?: string): Promise<Array<{
    id: string;
    category_id: string;
    name: string;
    slug: string;
    description?: string;
  }>> {
    const url = categoryId
      ? `/jobs/categories/${categoryId}/subcategories`
      : '/jobs/subcategories';
    const response = await this.api.get(url);
    return response.data.data;
  }

  async saveJob(jobId: string): Promise<{ id: string; job_id: string; candidate_id: string }> {
    const response = await this.api.post(`/jobs/${jobId}/save`);
    return response.data.data;
  }

  async unsaveJob(jobId: string): Promise<void> {
    await this.api.delete(`/jobs/${jobId}/save`);
  }

  async getSavedJobs(
    limit = 10,
    offset = 0,
  ): Promise<{ data: Job[]; pagination: { total: number; limit: number; page: number; pages: number } }> {
    const response = await this.api.get('/jobs/saved/list', {
      params: { limit, offset },
    });

    return {
      data: response.data?.data || [],
      pagination: response.data?.pagination || {
        total: 0,
        limit,
        page: 1,
        pages: 0,
      },
    };
  }

  async getSavedJobsCount(): Promise<number> {
    const response = await this.api.get('/jobs/saved/count');
    return Number(response.data?.data?.count || 0);
  }

  async markAsFeatured(jobId: string): Promise<Job> {
    const response = await this.api.post(`/jobs/${jobId}/feature`);
    return response.data.data;
  }

  async isJobSaved(jobId: string): Promise<boolean> {
    const response = await this.api.get(`/jobs/${jobId}/is-saved`);
    return Boolean(response.data?.data?.isSaved);
  }
}

export const jobService = new JobService();
