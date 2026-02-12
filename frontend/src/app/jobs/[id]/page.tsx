'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { jobService } from '@/services/job.service';
import { Job } from '@/types/job';
import Link from 'next/link';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    loadJob();
  }, [jobId]);

  const loadJob = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await jobService.getJob(jobId);
      setJob(data);
      try {
        const saved = await jobService.isJobSaved(jobId);
        setIsSaved(saved);
      } catch {
        setIsSaved(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load job');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    router.push(`/jobs/${jobId}/apply`);
  };

  const handleSave = async () => {
    try {
      if (isSaved) {
        await jobService.unsaveJob(jobId);
        setIsSaved(false);
        return;
      }
      await jobService.saveJob(jobId);
      setIsSaved(true);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        setIsSaved(true);
        return;
      }
      if (status === 401) {
        router.push('/auth/login');
        return;
      }
      setError(err?.response?.data?.message || err.message || 'Failed to update saved state');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error || 'Job not found'}</p>
          <Link href="/jobs" className="text-blue-600 hover:underline">
            Back to Jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Job Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{job.title}</h1>
              <p className="text-xl text-gray-600">{job.company_name}</p>
            </div>
            {job.company_logo_url && (
              <img src={job.company_logo_url} alt={job.company_name} className="w-20 h-20 rounded" />
            )}
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            <span className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded">
              {job.job_type.replace('_', ' ').toUpperCase()}
            </span>
            {job.is_remote && (
              <span className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded">
                Remote
              </span>
            )}
            {job.is_urgent && (
              <span className="inline-block bg-red-100 text-red-800 px-4 py-2 rounded">
                Urgent
              </span>
            )}
            {job.is_featured && (
              <span className="inline-block bg-yellow-100 text-yellow-800 px-4 py-2 rounded">
                ⭐ Featured
              </span>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleApply}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 font-medium text-lg"
            >
              Apply Now
            </button>
            <button
              onClick={handleSave}
              className={`px-6 py-3 rounded-lg font-medium text-lg ${
                isSaved
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                  : 'bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200'
              }`}
            >
              {isSaved ? '💾 Saved' : '💾 Save Job'}
            </button>
          </div>
        </div>
      </div>

      {/* Job Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-3 gap-8 mb-8">
          {/* Main Content */}
          <div className="col-span-2">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Job Description</h2>
              <div className="prose prose-sm max-w-none text-gray-700">
                {job.description.split('\n').map((line, index) => (
                  <p key={index} className="mb-4">{line}</p>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Requirements</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                {job.requirements.map((req, index) => (
                  <li key={index}>{req}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="bg-white rounded-lg shadow p-6 space-y-6">
              <div>
                <p className="text-gray-600 text-sm mb-1">Salary</p>
                <p className="text-2xl font-bold text-gray-800">
                  ${job.salary_min}K - ${job.salary_max}K
                </p>
                <p className="text-gray-600 text-sm">{job.salary_currency}/year</p>
              </div>

              <div>
                <p className="text-gray-600 text-sm mb-1">Location</p>
                <p className="font-semibold text-gray-800">{job.city}</p>
                <p className="text-gray-600">{job.country}</p>
              </div>

              <div>
                <p className="text-gray-600 text-sm mb-1">Experience Level</p>
                <p className="font-semibold text-gray-800 capitalize">{job.experience_level}</p>
              </div>

              <div>
                <p className="text-gray-600 text-sm mb-1">Application Deadline</p>
                <p className="font-semibold text-gray-800">
                  {new Date(job.deadline).toLocaleDateString()}
                </p>
              </div>

              <div className="pt-4 border-t">
                <p className="text-gray-600 text-sm mb-2">Job Stats</p>
                <p className="text-gray-700">
                  👁️ {job.views_count} views
                </p>
                <p className="text-gray-700">
                  📝 {job.applications_count} applications
                </p>
              </div>

              <div className="pt-4 border-t">
                <p className="text-gray-600 text-sm mb-2">About Company</p>
                <p className="text-gray-700 text-sm">
                  Click on the company name to view their profile and other job openings.
                </p>
                <Link
                  href={`/employers/${job.employer_id}`}
                  className="text-blue-600 hover:underline text-sm font-medium mt-2 block"
                >
                  View Company Profile →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
