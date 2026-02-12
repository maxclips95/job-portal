'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { jobService } from '@/services/job.service';
import { Job } from '@/types/job';

export default function EmployerDashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const items = await jobService.getEmployerJobs();
        setJobs(items);
      } catch (err: any) {
        setError(err?.response?.data?.message || err.message || 'Failed to load employer dashboard');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const metrics = useMemo(() => {
    const active = jobs.filter((job) => job.status === 'active').length;
    const draft = jobs.filter((job) => job.status === 'draft').length;
    const closed = jobs.filter((job) => job.status === 'closed').length;
    const applications = jobs.reduce((sum, job) => sum + (job.applications_count || 0), 0);
    const views = jobs.reduce((sum, job) => sum + (job.views_count || 0), 0);

    return {
      total: jobs.length,
      active,
      draft,
      closed,
      applications,
      views,
    };
  }, [jobs]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading employer dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Employer Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage postings, applicants and hiring pipeline.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500">Total Jobs</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500">Active</p>
            <p className="text-2xl font-bold text-green-600">{metrics.active}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500">Draft</p>
            <p className="text-2xl font-bold text-yellow-600">{metrics.draft}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500">Closed</p>
            <p className="text-2xl font-bold text-gray-700">{metrics.closed}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500">Applications</p>
            <p className="text-2xl font-bold text-blue-600">{metrics.applications}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500">Views</p>
            <p className="text-2xl font-bold text-indigo-600">{metrics.views}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/employer/post-job" className="bg-white rounded-lg shadow p-4 hover:bg-gray-50">
            <h2 className="font-semibold text-gray-900">Post New Job</h2>
            <p className="text-sm text-gray-600 mt-1">Create vacancy and publish listing.</p>
          </Link>
          <Link href="/employer/jobs" className="bg-white rounded-lg shadow p-4 hover:bg-gray-50">
            <h2 className="font-semibold text-gray-900">Manage My Jobs</h2>
            <p className="text-sm text-gray-600 mt-1">Edit, close, feature and monitor postings.</p>
          </Link>
          <Link href="/employer/jobs" className="bg-white rounded-lg shadow p-4 hover:bg-gray-50">
            <h2 className="font-semibold text-gray-900">Open Applicant Pipelines</h2>
            <p className="text-sm text-gray-600 mt-1">Open each job and review candidates.</p>
          </Link>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Advanced Tools</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/employer/analytics" className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">
              Hiring Analytics
            </Link>
            <Link href="/screening" className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
              AI Screening
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
