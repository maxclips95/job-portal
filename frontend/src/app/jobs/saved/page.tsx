'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { jobService } from '@/services/job.service';
import { Job } from '@/types/job';
import { useAuthStore } from '@/store/authStore';

function SavedJobsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const page = parseInt(searchParams.get('page') || '1');
  const limit = 10;
  const offset = (page - 1) * limit;

  useEffect(() => {
    // Redirect if not logged in
    if (!user) {
      router.push('/auth/login');
      return;
    }

    fetchSavedJobs();
  }, [page, user, router]);

  const fetchSavedJobs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await jobService.getSavedJobs(limit, offset);
      setJobs(response.data);
      setTotalCount(response.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load saved jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsaveJob = async (jobId: string) => {
    try {
      await jobService.unsaveJob(jobId);
      setJobs(jobs.filter(job => job.id !== jobId));
      setTotalCount(totalCount - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unsave job');
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Saved Jobs</h1>
          <p className="text-gray-600">You have {totalCount} saved job(s)</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {jobs.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Saved Jobs</h2>
            <p className="text-gray-600 mb-8">You haven't saved any jobs yet. Start exploring jobs to save them for later!</p>
            <Link
              href="/jobs"
              className="inline-block bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
            >
              Browse Jobs
            </Link>
          </div>
        ) : (
          <>
            {/* Job List */}
            <div className="space-y-4 mb-8">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-lg shadow hover:shadow-md transition p-6 border-l-4 border-blue-500"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <Link href={`/jobs/${job.id}`}>
                        <h3 className="text-xl font-bold text-gray-900 hover:text-blue-500 transition">
                          {job.title}
                        </h3>
                      </Link>
                      <p className="text-gray-600 mt-1">{job.company_name}</p>
                    </div>
                    <button
                      onClick={() => handleUnsaveJob(job.id)}
                      className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded-full transition"
                      title="Remove from saved jobs"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3.586a1 1 0 01-.707-.293l-2.414-2.414a1 1 0 00-.707-.293H4a2 2 0 01-2-2V4zm2 6a1 1 0 100 2h8a1 1 0 100-2H6z" />
                      </svg>
                    </button>
                  </div>

                  {/* Job Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Location</p>
                      <p className="font-semibold text-gray-900">{job.location}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Job Type</p>
                      <p className="font-semibold text-gray-900 capitalize">{job.job_type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Salary Range</p>
                      <p className="font-semibold text-gray-900">
                        ${job.salary_min?.toLocaleString()} - ${job.salary_max?.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Experience</p>
                      <p className="font-semibold text-gray-900 capitalize">{job.experience_level}</p>
                    </div>
                  </div>

                  {/* Description Preview */}
                  <p className="text-gray-700 mb-4 line-clamp-2">
                    {job.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {job.is_remote && (
                      <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full">
                        Remote
                      </span>
                    )}
                    {job.is_urgent && (
                      <span className="bg-red-100 text-red-800 text-xs px-3 py-1 rounded-full">
                        Urgent
                      </span>
                    )}
                    <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">
                      {job.category_id}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition text-center"
                    >
                      View Details
                    </Link>
                    <Link
                      href={`/jobs/${job.id}/apply`}
                      className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition text-center"
                    >
                      Apply Now
                    </Link>
                  </div>

                  {/* Meta Info */}
                  <div className="mt-4 text-sm text-gray-500 flex justify-between">
                    <span>Posted: {new Date(job.created_at || '').toLocaleDateString()}</span>
                    <span>Deadline: {new Date(job.deadline || '').toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2">
                {page > 1 && (
                  <Link
                    href={`/jobs/saved?page=${page - 1}`}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                )}

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Link
                    key={p}
                    href={`/jobs/saved?page=${p}`}
                    className={`px-4 py-2 rounded-lg ${
                      p === page
                        ? 'bg-blue-500 text-white'
                        : 'bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </Link>
                ))}

                {page < totalPages && (
                  <Link
                    href={`/jobs/saved?page=${page + 1}`}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Next
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SavedJobsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <SavedJobsContent />
    </Suspense>
  );
}
