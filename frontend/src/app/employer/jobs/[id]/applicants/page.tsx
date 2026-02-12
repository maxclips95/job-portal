'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { jobService } from '@/services/job.service';

type EmployerApplication = {
  id: string;
  candidate_id: string;
  status: 'applied' | 'reviewed' | 'shortlisted' | 'rejected' | 'accepted' | 'withdrawn';
  applied_at: string;
  cover_letter?: string;
  resume_url?: string;
  rating?: number;
  notes?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  interview_id?: string;
  scheduled_at?: string;
  interview_type?: string;
  offer_id?: string;
  offer_status?: string;
};

type JobMeta = {
  id: string;
  title: string;
  company_name: string;
};

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_BASE = API_ORIGIN.endsWith('/api') ? API_ORIGIN : `${API_ORIGIN}/api`;

export default function EmployerApplicantsPage() {
  const params = useParams();
  const jobId = params.id as string;

  const [job, setJob] = useState<JobMeta | null>(null);
  const [applications, setApplications] = useState<EmployerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | EmployerApplication['status']>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [interviewType, setInterviewType] = useState<'phone' | 'video' | 'in_person' | 'written'>('video');
  const [interviewAt, setInterviewAt] = useState('');
  const [interviewDuration, setInterviewDuration] = useState(45);
  const [interviewLink, setInterviewLink] = useState('');

  const [offerPosition, setOfferPosition] = useState('');
  const [offerSalary, setOfferSalary] = useState(0);
  const [offerBenefits, setOfferBenefits] = useState('');
  const [offerStartDate, setOfferStartDate] = useState('');
  const [offerExpiryDate, setOfferExpiryDate] = useState('');

  const getAuthConfig = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      withCredentials: true,
    };
  };

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const [jobData, appsResp] = await Promise.all([
        jobService.getJob(jobId),
        axios.get(`${API_BASE}/applications/jobs/${jobId}`, getAuthConfig()),
      ]);

      setJob({
        id: jobData.id,
        title: jobData.title,
        company_name: jobData.company_name,
      });
      setApplications(appsResp.data?.data?.applications || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load applicants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [jobId]);

  const filteredApplications = useMemo(() => {
    if (statusFilter === 'all') return applications;
    return applications.filter((app) => app.status === statusFilter);
  }, [applications, statusFilter]);

  const setApplicationStatus = async (applicationId: string, status: EmployerApplication['status']) => {
    setActionLoadingId(applicationId);
    setError(null);
    try {
      await axios.patch(
        `${API_BASE}/applications/${applicationId}/status`,
        { status },
        getAuthConfig()
      );
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to update status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const scheduleInterview = async (applicationId: string) => {
    if (!interviewAt) {
      setError('Please choose interview date/time.');
      return;
    }

    setActionLoadingId(applicationId);
    setError(null);
    try {
      await axios.post(
        `${API_BASE}/applications/${applicationId}/interviews`,
        {
          interviewType,
          scheduledAt: new Date(interviewAt).toISOString(),
          durationMinutes: interviewDuration,
          interviewLink: interviewLink || null,
        },
        getAuthConfig()
      );

      await setApplicationStatus(applicationId, 'shortlisted');
      setInterviewAt('');
      setInterviewLink('');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to schedule interview');
      setActionLoadingId(null);
    }
  };

  const createOffer = async (applicationId: string) => {
    if (!offerPosition || !offerStartDate || !offerExpiryDate) {
      setError('Offer position, start date, and expiry date are required.');
      return;
    }

    setActionLoadingId(applicationId);
    setError(null);
    try {
      await axios.post(
        `${API_BASE}/applications/${applicationId}/offer`,
        {
          positionTitle: offerPosition,
          salary: offerSalary,
          benefits: offerBenefits,
          startDate: new Date(offerStartDate).toISOString(),
          expirationDate: new Date(offerExpiryDate).toISOString(),
        },
        getAuthConfig()
      );

      await setApplicationStatus(applicationId, 'accepted');
      setOfferPosition('');
      setOfferSalary(0);
      setOfferBenefits('');
      setOfferStartDate('');
      setOfferExpiryDate('');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to create offer');
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading applicants...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/employer/jobs" className="text-blue-600 hover:underline">
            Back to employer jobs
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Applicant Pipeline</h1>
          <p className="text-gray-600 mt-1">{job?.title} | {job?.company_name}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-2 flex-wrap">
          {(['all', 'applied', 'reviewed', 'shortlisted', 'rejected', 'accepted', 'withdrawn'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 rounded capitalize ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {filteredApplications.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
            No applicants found for this filter.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((app) => (
              <div key={app.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {[app.first_name, app.last_name].filter(Boolean).join(' ') || 'Candidate'}
                    </h3>
                    <p className="text-gray-600">{app.email || 'No email'}</p>
                    <p className="text-gray-500 text-sm">Applied: {new Date(app.applied_at).toLocaleString()}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm capitalize">
                    {app.status}
                  </span>
                </div>

                <div className="mb-4 text-sm text-gray-700">
                  {app.cover_letter ? app.cover_letter : 'No cover letter submitted.'}
                </div>

                <div className="flex gap-2 flex-wrap mb-3">
                  <button
                    disabled={actionLoadingId === app.id}
                    onClick={() => setApplicationStatus(app.id, 'reviewed')}
                    className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                  >
                    Mark Reviewed
                  </button>
                  <button
                    disabled={actionLoadingId === app.id}
                    onClick={() => setApplicationStatus(app.id, 'shortlisted')}
                    className="px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    Shortlist
                  </button>
                  <button
                    disabled={actionLoadingId === app.id}
                    onClick={() => setApplicationStatus(app.id, 'rejected')}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Reject
                  </button>
                  {app.resume_url && (
                    <a
                      href={app.resume_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      Open Resume
                    </a>
                  )}
                  <button
                    onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                    className="px-3 py-2 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                  >
                    {expandedId === app.id ? 'Hide Actions' : 'Interview/Offer'}
                  </button>
                </div>

                {expandedId === app.id && (
                  <div className="mt-4 border-t pt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <select
                        value={interviewType}
                        onChange={(e) => setInterviewType(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 rounded"
                      >
                        <option value="video">Video</option>
                        <option value="phone">Phone</option>
                        <option value="in_person">In Person</option>
                        <option value="written">Written</option>
                      </select>
                      <input
                        type="datetime-local"
                        value={interviewAt}
                        onChange={(e) => setInterviewAt(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded"
                      />
                      <input
                        type="number"
                        min={15}
                        value={interviewDuration}
                        onChange={(e) => setInterviewDuration(Number(e.target.value || 45))}
                        className="px-3 py-2 border border-gray-300 rounded"
                        placeholder="Duration (min)"
                      />
                      <input
                        type="text"
                        value={interviewLink}
                        onChange={(e) => setInterviewLink(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded"
                        placeholder="Interview link (optional)"
                      />
                    </div>
                    <button
                      disabled={actionLoadingId === app.id}
                      onClick={() => scheduleInterview(app.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Schedule Interview
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <input
                        type="text"
                        value={offerPosition}
                        onChange={(e) => setOfferPosition(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded"
                        placeholder="Offer position"
                      />
                      <input
                        type="number"
                        min={0}
                        value={offerSalary}
                        onChange={(e) => setOfferSalary(Number(e.target.value || 0))}
                        className="px-3 py-2 border border-gray-300 rounded"
                        placeholder="Salary"
                      />
                      <input
                        type="date"
                        value={offerStartDate}
                        onChange={(e) => setOfferStartDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded"
                      />
                      <input
                        type="date"
                        value={offerExpiryDate}
                        onChange={(e) => setOfferExpiryDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded"
                      />
                      <input
                        type="text"
                        value={offerBenefits}
                        onChange={(e) => setOfferBenefits(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded"
                        placeholder="Benefits"
                      />
                    </div>
                    <button
                      disabled={actionLoadingId === app.id}
                      onClick={() => createOffer(app.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Create Offer
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
