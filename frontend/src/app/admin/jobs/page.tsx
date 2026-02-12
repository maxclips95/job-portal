'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Search,
  CheckCircle,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader,
} from 'lucide-react';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: { min: number; max: number; currency: string };
  category: string;
  jobType: string;
  status: 'pending' | 'approved' | 'rejected';
  applicants: number;
  postedAt: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>(
    'pending'
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [jobDetails, setJobDetails] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  const itemsPerPage = 8;

  // Fetch jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const endpoint =
          statusFilter === 'pending'
            ? '/api/admin/jobs/pending'
            : '/api/admin/jobs';

        const response = await axios.get(endpoint, {
          params: statusFilter !== 'pending' ? { status: statusFilter } : {},
          withCredentials: true,
        });

        setJobs(response.data.jobs || []);
        setError('');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch jobs');
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [statusFilter]);

  // Filter jobs
  useEffect(() => {
    let filtered = jobs.filter((job) => {
      const matchesSearch =
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.location.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });

    setFilteredJobs(filtered);
    setCurrentPage(1);
  }, [searchTerm, jobs]);

  // Pagination
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // View job details
  const handleViewDetails = async (jobId: string) => {
    try {
      const response = await axios.get(`/api/jobs/${jobId}`, {
        withCredentials: true,
      });
      setJobDetails(response.data?.data || response.data);
      setShowDetails(true);
    } catch (err) {
      setError('Failed to load job details');
    }
  };

  // Approve job
  const handleApproveJob = async (jobId: string) => {
    try {
      setProcessing(true);
      await axios.put(
        `/api/admin/jobs/${jobId}/approve`,
        {},
        { withCredentials: true }
      );

      setJobs(
        jobs.map((job) =>
          job.id === jobId ? { ...job, status: 'approved' } : job
        )
      );
      setSelectedJobId(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve job');
    } finally {
      setProcessing(false);
    }
  };

  // Reject job
  const handleRejectJob = async (jobId: string) => {
    try {
      setProcessing(true);
      await axios.put(
        `/api/admin/jobs/${jobId}/reject`,
        { reason: rejectionReason },
        { withCredentials: true }
      );

      setJobs(
        jobs.map((job) =>
          job.id === jobId ? { ...job, status: 'rejected' } : job
        )
      );
      setSelectedJobId(null);
      setRejectionReason('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject job');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">Pending Review</span>;
      case 'approved':
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Approved</span>;
      case 'rejected':
        return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">Rejected</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Manage Job Postings
          </h1>
          <p className="text-gray-600">
            Review, approve, or reject job postings from employers
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by job title, company, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All Jobs</option>
            </select>
          </div>
        </div>

        {/* Jobs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {paginatedJobs.length > 0 ? (
            paginatedJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition p-6 border-l-4 border-blue-500"
              >
                {/* Job Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {job.title}
                    </h3>
                    <p className="text-gray-600 font-medium">{job.company}</p>
                  </div>
                  <div>{getStatusBadge(job.status)}</div>
                </div>

                {/* Job Details */}
                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  <div>📍 {job.location}</div>
                  <div>💼 {job.jobType}</div>
                  <div>📂 {job.category}</div>
                  <div>
                    💰 {job.salary.currency} {job.salary.min.toLocaleString()} -
                    {job.salary.max.toLocaleString()}
                  </div>
                  <div>👥 {job.applicants} applicants</div>
                </div>

                {/* Actions */}
                {job.status === 'pending' ? (
                  <div className="space-y-3">
                    {selectedJobId === job.id ? (
                      <div className="space-y-3">
                        <textarea
                          placeholder="Reason for rejection (optional)..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleApproveJob(job.id)
                            }
                            disabled={processing}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-medium flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            {processing ? 'Processing...' : 'Approve'}
                          </button>
                          <button
                            onClick={() =>
                              handleRejectJob(job.id)
                            }
                            disabled={processing}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition font-medium flex items-center justify-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            {processing ? 'Processing...' : 'Reject'}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedJobId(null);
                              setRejectionReason('');
                            }}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedJobId(job.id)}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                        >
                          Review
                        </button>
                        <button
                          onClick={() =>
                            handleViewDetails(job.id)
                          }
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Details
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() =>
                      handleViewDetails(job.id)
                    }
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2 font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                )}

                {/* Posted Date */}
                <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                  Posted on {new Date(job.postedAt).toLocaleDateString()}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-600 text-lg">
                No jobs found matching your filters
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredJobs.length > itemsPerPage && (
          <div className="flex items-center justify-between bg-white rounded-lg shadow-md px-6 py-4">
            <div className="text-sm text-gray-600">
              Showing{' '}
              <span className="font-medium">
                {(currentPage - 1) * itemsPerPage + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium">
                {Math.min(currentPage * itemsPerPage, filteredJobs.length)}
              </span>{' '}
              of <span className="font-medium">{filteredJobs.length}</span> jobs
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setCurrentPage(Math.max(1, currentPage - 1))
                }
                disabled={currentPage === 1}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from(
                  { length: totalPages },
                  (_, i) => i + 1
                ).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded text-sm font-medium transition ${
                      page === currentPage
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-600 mb-1">Total Jobs</div>
            <div className="text-2xl font-bold text-gray-900">
              {jobs.length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-600 mb-1">Pending Review</div>
            <div className="text-2xl font-bold text-yellow-600">
              {jobs.filter((j) => j.status === 'pending').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-600 mb-1">Approved</div>
            <div className="text-2xl font-bold text-green-600">
              {jobs.filter((j) => j.status === 'approved').length}
            </div>
          </div>
        </div>

        {/* Job Details Modal */}
        {showDetails && jobDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gray-50 p-6 border-b border-gray-200 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {jobDetails.title}
                  </h2>
                  <p className="text-gray-600">{jobDetails.company}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDetails(false);
                    setJobDetails(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Location
                    </label>
                    <p className="text-gray-900">{jobDetails.location}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Salary
                    </label>
                    <p className="text-gray-900">
                      {jobDetails.salary?.currency} {jobDetails.salary?.min.toLocaleString()} -
                      {jobDetails.salary?.max.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Job Type
                    </label>
                    <p className="text-gray-900">{jobDetails.jobType}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Category
                    </label>
                    <p className="text-gray-900">{jobDetails.category}</p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {jobDetails.description}
                  </p>
                </div>

                {/* Requirements */}
                {jobDetails.requirements && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Requirements
                    </label>
                    <p className="text-gray-900 whitespace-pre-wrap">
                      {jobDetails.requirements}
                    </p>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-gray-50 p-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowDetails(false);
                    setJobDetails(null);
                  }}
                  className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
