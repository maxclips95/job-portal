'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { jobService } from '@/services/job.service';
import ApplicationService from '@/services/application.service';
import { Job } from '@/types/job';

type CandidateStats = {
  total: number;
  pending: number;
  reviewed: number;
  shortlisted: number;
  rejected: number;
  accepted: number;
};

const emptyStats: CandidateStats = {
  total: 0,
  pending: 0,
  reviewed: 0,
  shortlisted: 0,
  rejected: 0,
  accepted: 0,
};

export default function CandidateDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CandidateStats>(emptyStats);
  const [savedCount, setSavedCount] = useState(0);
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [statsData, savedJobsCount, featured] = await Promise.all([
          ApplicationService.getStatistics(),
          jobService.getSavedJobsCount(),
          jobService.getFeaturedJobs(6),
        ]);

        setStats({
          total: Number(statsData.total || 0),
          pending: Number(statsData.pending || 0),
          reviewed: Number(statsData.reviewed || 0),
          shortlisted: Number(statsData.shortlisted || 0),
          rejected: Number(statsData.rejected || 0),
          accepted: Number(statsData.accepted || 0),
        });
        setSavedCount(savedJobsCount);
        setRecommendedJobs(featured || []);
      } catch (err: any) {
        setError(err?.response?.data?.message || err.message || 'Failed to load candidate dashboard');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const profileCompletionHint = useMemo(() => {
    const score = Math.min(100, stats.total === 0 ? 40 : 60 + Math.min(40, stats.reviewed * 10));
    return score;
  }, [stats.total, stats.reviewed]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading candidate dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Candidate Dashboard</h1>
          <p className="text-gray-600 mt-1">Track applications, interviews, offers and discover relevant jobs.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <StatCard label="Applications" value={stats.total} color="text-slate-900" />
          <StatCard label="Pending" value={stats.pending} color="text-yellow-600" />
          <StatCard label="Reviewed" value={stats.reviewed} color="text-blue-600" />
          <StatCard label="Shortlisted" value={stats.shortlisted} color="text-indigo-600" />
          <StatCard label="Offers" value={stats.accepted} color="text-green-600" />
          <StatCard label="Saved Jobs" value={savedCount} color="text-purple-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-5 lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recommended Jobs</h2>
            {recommendedJobs.length === 0 ? (
              <p className="text-sm text-gray-600">No featured jobs yet. Explore latest openings.</p>
            ) : (
              <div className="space-y-3">
                {recommendedJobs.map((job) => (
                  <div key={job.id} className="border border-gray-200 rounded p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{job.title}</h3>
                        <p className="text-sm text-gray-600">{job.company_name} | {job.city}, {job.country}</p>
                        <p className="text-xs text-gray-500 mt-1">{job.job_type.replace('_', ' ')} | {job.experience_level}</p>
                      </div>
                      <Link href={`/jobs/${job.id}`} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <Link href="/jobs" className="text-blue-600 hover:underline text-sm">Browse all jobs</Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <QuickAction href="/candidate/profile" label="Update Profile" />
              <QuickAction href="/candidate/applications" label="Track Applications" />
              <QuickAction href="/candidate/interviews" label="Interview Schedule" />
              <QuickAction href="/candidate/offers" label="Offer Management" />
              <QuickAction href="/jobs/saved" label="Saved Jobs" />
            </div>

            <div className="mt-5 rounded border border-blue-100 bg-blue-50 p-3">
              <p className="text-xs text-blue-700">Profile strength (estimated)</p>
              <p className="text-xl font-bold text-blue-900">{profileCompletionHint}%</p>
              <p className="text-xs text-blue-700 mt-1">Complete profile and skills to improve recommendations.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="block border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
      {label}
    </Link>
  );
}
