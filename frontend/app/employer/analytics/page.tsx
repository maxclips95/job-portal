'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { jobService } from '@/services/job.service';
import { Job } from '@/types/job';

export default function EmployerAnalyticsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await jobService.getEmployerJobs();
        setJobs(result || []);
      } catch (err: any) {
        setError(err?.response?.data?.message || err.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const metrics = useMemo(() => {
    const totalJobs = jobs.length;
    const totalViews = jobs.reduce((sum, j) => sum + (j.views_count || 0), 0);
    const totalApplications = jobs.reduce((sum, j) => sum + (j.applications_count || 0), 0);
    const avgViewsPerJob = totalJobs ? totalViews / totalJobs : 0;
    const avgApplicationsPerJob = totalJobs ? totalApplications / totalJobs : 0;
    const conversion = totalViews ? (totalApplications / totalViews) * 100 : 0;

    const statusBreakdown = {
      active: jobs.filter((j) => j.status === 'active').length,
      draft: jobs.filter((j) => j.status === 'draft').length,
      closed: jobs.filter((j) => j.status === 'closed').length,
    };

    const topJobs = [...jobs]
      .sort((a, b) => (b.applications_count || 0) - (a.applications_count || 0))
      .slice(0, 5);

    return {
      totalJobs,
      totalViews,
      totalApplications,
      avgViewsPerJob,
      avgApplicationsPerJob,
      conversion,
      statusBreakdown,
      topJobs,
    };
  }, [jobs]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading employer analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Employer Analytics</h1>
          <p className="text-gray-600 mt-1">Track job performance and hiring pipeline efficiency.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Stat title="Jobs" value={metrics.totalJobs} />
          <Stat title="Views" value={metrics.totalViews} />
          <Stat title="Applications" value={metrics.totalApplications} />
          <Stat title="Avg Views/Job" value={Math.round(metrics.avgViewsPerJob)} />
          <Stat title="Avg Apps/Job" value={Math.round(metrics.avgApplicationsPerJob)} />
          <Stat title="View->Apply %" value={Number(metrics.conversion.toFixed(1))} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Status Mix</h2>
            <div className="space-y-3">
              <BarRow label="Active" value={metrics.statusBreakdown.active} total={metrics.totalJobs} color="bg-green-500" />
              <BarRow label="Draft" value={metrics.statusBreakdown.draft} total={metrics.totalJobs} color="bg-yellow-500" />
              <BarRow label="Closed" value={metrics.statusBreakdown.closed} total={metrics.totalJobs} color="bg-gray-500" />
            </div>
            <div className="mt-4">
              <Link href="/employer/jobs" className="text-blue-600 hover:underline text-sm">
                Manage all jobs
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Jobs by Applications</h2>
            {metrics.topJobs.length === 0 ? (
              <p className="text-sm text-gray-600">No jobs yet.</p>
            ) : (
              <div className="space-y-3">
                {metrics.topJobs.map((job) => (
                  <div key={job.id} className="border border-gray-200 rounded p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{job.title}</p>
                        <p className="text-xs text-gray-600">{job.company_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-blue-700">{job.applications_count || 0} apps</p>
                        <p className="text-xs text-gray-500">{job.views_count || 0} views</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function BarRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-700">{label}</span>
        <span className="text-gray-700">{value}</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded">
        <div className={`h-2 rounded ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
