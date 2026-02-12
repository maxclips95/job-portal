'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { jobService } from '@/services/job.service';
import { Job } from '@/types/job';

type EmployerFilter = 'all' | 'active' | 'draft' | 'closed';

export default function EmployerJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<EmployerFilter>('all');

  const loadJobs = async (selectedFilter: EmployerFilter = filter) => {
    setLoading(true);
    setError(null);
    try {
      const [all, filtered] = await Promise.all([
        jobService.getEmployerJobs(),
        selectedFilter === 'all' ? jobService.getEmployerJobs() : jobService.getEmployerJobs(selectedFilter),
      ]);

      setAllJobs(all);
      setJobs(filtered);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs(filter);
  }, [filter]);

  const stats = useMemo(() => {
    return {
      total: allJobs.length,
      active: allJobs.filter((j) => j.status === 'active').length,
      draft: allJobs.filter((j) => j.status === 'draft').length,
      closed: allJobs.filter((j) => j.status === 'closed').length,
      totalApplications: allJobs.reduce((sum, j) => sum + (j.applications_count || 0), 0),
      totalViews: allJobs.reduce((sum, j) => sum + (j.views_count || 0), 0),
    };
  }, [allJobs]);

  const handleDelete = async (jobId: string) => {
    if (!window.confirm('Are you sure you want to delete this job?')) return;

    try {
      await jobService.deleteJob(jobId);
      await loadJobs(filter);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to delete job');
    }
  };

  const handlePublish = async (jobId: string) => {
    try {
      await jobService.publishJob(jobId);
      await loadJobs(filter);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to publish job');
    }
  };

  const handleClose = async (jobId: string) => {
    try {
      await jobService.closeJob(jobId);
      await loadJobs(filter);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to close job');
    }
  };

  const handleFeature = async (jobId: string) => {
    try {
      await jobService.markAsFeatured(jobId);
      await loadJobs(filter);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to toggle feature');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-800">My Job Postings</h1>
            <Link
              href="/employer/post-job"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              Post New Job
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-600 text-sm">Total Jobs</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-blue-600 text-sm">Active</p>
              <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-yellow-600 text-sm">Draft</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.draft}</p>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-gray-700 text-sm">Closed</p>
              <p className="text-2xl font-bold text-gray-800">{stats.closed}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-green-600 text-sm">Applications</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalApplications}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-purple-600 text-sm">Views</p>
              <p className="text-2xl font-bold text-purple-600">{stats.totalViews}</p>
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

        <div className="flex gap-2 mb-6">
          {(['all', 'active', 'draft', 'closed'] as const).map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`px-4 py-2 rounded font-medium capitalize ${
                filter === item
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item}{' '}
              ({
                item === 'all'
                  ? stats.total
                  : item === 'active'
                  ? stats.active
                  : item === 'draft'
                  ? stats.draft
                  : stats.closed
              })
            </button>
          ))}
        </div>

        {jobs.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 text-lg mb-4">No jobs found for this filter.</p>
            <Link
              href="/employer/post-job"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Post Your First Job
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-xl font-bold text-gray-800">{job.title}</h3>
                      <span
                        className={`px-3 py-1 rounded text-xs font-medium ${
                          job.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : job.status === 'draft'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {job.status}
                      </span>
                      {job.is_featured && (
                        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-xs font-medium">
                          Featured
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600">{job.job_type.replace('_', ' ')} | {job.city}, {job.country}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">${job.salary_min} - ${job.salary_max}</p>
                    <p className="text-gray-600 text-sm">{job.salary_currency} / year</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 py-4 border-y mb-4">
                  <div>
                    <p className="text-gray-600 text-sm">Views</p>
                    <p className="text-xl font-semibold text-gray-800">{job.views_count}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Applications</p>
                    <p className="text-xl font-semibold text-gray-800">{job.applications_count}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Deadline</p>
                    <p className="text-xl font-semibold text-gray-800">
                      {new Date(job.deadline).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <p className="text-gray-700 line-clamp-2 mb-4">{job.description}</p>

                <div className="flex gap-2 flex-wrap">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="px-4 py-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                  >
                    View Live
                  </Link>
                  <Link
                    href={`/employer/jobs/${job.id}/edit`}
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/employer/jobs/${job.id}/applicants`}
                    className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                  >
                    Applicants
                  </Link>
                  {job.status === 'draft' && (
                    <button
                      onClick={() => handlePublish(job.id)}
                      className="px-4 py-2 bg-green-100 text-green-600 rounded hover:bg-green-200"
                    >
                      Publish
                    </button>
                  )}
                  {job.status === 'active' && (
                    <>
                      <button
                        onClick={() => handleFeature(job.id)}
                        className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                      >
                        {job.is_featured ? 'Unfeature' : 'Feature'}
                      </button>
                      <button
                        onClick={() => handleClose(job.id)}
                        className="px-4 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
                      >
                        Close
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(job.id)}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 ml-auto"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
