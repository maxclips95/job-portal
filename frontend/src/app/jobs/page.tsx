'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { jobService } from '@/services/job.service';
import { Job, JobCategory, JobSearchFilters } from '@/types/job';

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [filters, setFilters] = useState<JobSearchFilters>({
    keyword: '',
    category_id: '',
    location: '',
    job_type: undefined,
    page: 1,
    limit: 10,
    sort: 'recent',
  });

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await jobService.getCategories();
        setCategories(data);
      } catch (err) {
        console.error('Error loading categories:', err);
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    const loadJobs = async () => {
      setLoading(true);
      setError(null);
      try {
        const { jobs: jobsData, pagination: paginationData } = await jobService.searchJobs(filters);
        setJobs(jobsData);
        setPagination(paginationData);

        const savedChecks = await Promise.all(
          jobsData.map(async (job) => {
            try {
              const isSaved = await jobService.isJobSaved(job.id);
              return isSaved ? job.id : null;
            } catch {
              return null;
            }
          })
        );

        setSavedJobIds(new Set(savedChecks.filter((value): value is string => Boolean(value))));
      } catch (err: any) {
        setError(err?.response?.data?.message || err.message || 'Failed to load jobs');
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
  }, [filters]);

  const handleSearch = (keyword: string) => {
    setFilters((prev) => ({ ...prev, keyword, page: 1 }));
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleSaveToggle = async (jobId: string) => {
    setError(null);
    try {
      const currentlySaved = savedJobIds.has(jobId);
      if (currentlySaved) {
        await jobService.unsaveJob(jobId);
        setSavedJobIds((prev) => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
        return;
      }

      await jobService.saveJob(jobId);
      setSavedJobIds((prev) => new Set(prev).add(jobId));
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        setSavedJobIds((prev) => new Set(prev).add(jobId));
        return;
      }
      if (status === 401) {
        setError('Please login to save jobs.');
        return;
      }
      setError(err?.response?.data?.message || err.message || 'Failed to update saved state');
    }
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Find Your Perfect Job</h1>

          <div className="flex gap-4 mb-6">
            <input
              type="text"
              placeholder="Job title, keywords..."
              value={filters.keyword || ''}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => setFilters((prev) => ({ ...prev }))}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Search
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.category_id || ''}
                onChange={(e) => handleFilterChange('category_id', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                placeholder="City or country"
                value={filters.location || ''}
                onChange={(e) => handleFilterChange('location', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
              <select
                value={filters.job_type || ''}
                onChange={(e) => handleFilterChange('job_type', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={filters.sort || 'recent'}
                onChange={(e) => handleFilterChange('sort', e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="recent">Most Recent</option>
                <option value="relevant">Most Relevant</option>
                <option value="salary">Highest Salary</option>
                <option value="trending">Trending</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No jobs found matching your criteria</p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 mb-8">
              {jobs.map((job) => (
                <div key={job.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{job.title}</h3>
                      <p className="text-gray-600 mb-2">{job.company_name}</p>
                      <div className="flex gap-2 mb-3">
                        <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm">
                          {job.job_type.replace('_', ' ').toUpperCase()}
                        </span>
                        {job.is_remote && (
                          <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded text-sm">
                            Remote
                          </span>
                        )}
                        {job.is_urgent && (
                          <span className="inline-block bg-red-100 text-red-800 px-3 py-1 rounded text-sm">
                            Urgent
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-700 line-clamp-2 mb-4">{job.description}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-600">Location</p>
                      <p className="font-medium text-gray-800">{job.city}, {job.country}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Salary</p>
                      <p className="font-medium text-gray-800">${job.salary_min} - ${job.salary_max}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Experience</p>
                      <p className="font-medium text-gray-800 capitalize">{job.experience_level}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Applications</p>
                      <p className="font-medium text-gray-800">{job.applications_count}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 text-center font-medium"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => handleSaveToggle(job.id)}
                      className={`px-4 py-2 border rounded ${
                        savedJobIds.has(job.id)
                          ? 'border-yellow-300 bg-yellow-50 text-yellow-800'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {savedJobIds.has(job.id) ? 'Saved' : 'Save'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {pagination.pages > 1 && (
              <div className="flex justify-center gap-2">
                {Array.from({ length: pagination.pages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-4 py-2 rounded ${
                      pagination.page === page
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
