'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import applicationService from '@/services/application.service';

type ApplicationDetails = {
  id: string | number;
  status: 'applied' | 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'accepted' | 'withdrawn';
  appliedDate: string;
  resume: string;
  coverLetter: string;
  jobTitle?: string;
  companyName?: string;
  location?: string;
};

const statusOrder: Array<ApplicationDetails['status']> = [
  'pending',
  'reviewed',
  'shortlisted',
  'accepted',
];

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await applicationService.getApplication(id);
        setApplication(data as ApplicationDetails);
      } catch (err: any) {
        setError(err?.response?.data?.message || err.message || 'Failed to load application');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const handleWithdraw = async () => {
    if (!application) return;
    if (!window.confirm('Are you sure you want to withdraw this application?')) return;

    setWithdrawing(true);
    try {
      await applicationService.withdrawApplication(application.id);
      setApplication({ ...application, status: 'withdrawn' });
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to withdraw application');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading application...</div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-3">{error || 'Application not found'}</p>
          <Link href="/candidate/applications" className="text-blue-600 hover:underline">
            Back to applications
          </Link>
        </div>
      </div>
    );
  }

  const normalizedStatus = application.status === 'applied' ? 'pending' : application.status;
  const activeStep = statusOrder.indexOf(normalizedStatus as ApplicationDetails['status']);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => router.push('/candidate/applications')}
            className="text-blue-600 hover:underline"
          >
            Back to applications
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{application.jobTitle || 'Job Application'}</h1>
          <p className="text-gray-600">{application.companyName || 'Unknown company'}</p>
          {application.location && <p className="text-gray-500 text-sm">{application.location}</p>}
          <p className="text-gray-500 text-sm mt-2">
            Applied on {new Date(application.appliedDate).toLocaleDateString()}
          </p>
          <div className="mt-3">
            <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700 capitalize">
              {normalizedStatus}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Progress</h2>
          <div className="space-y-3">
            {statusOrder.map((status, index) => {
              const done = activeStep >= 0 && index <= activeStep;
              return (
                <div key={status} className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${done ? 'bg-green-500' : 'bg-gray-300'}`}
                  />
                  <p className={`capitalize ${done ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>{status}</p>
                </div>
              );
            })}
            {normalizedStatus === 'rejected' && <p className="text-red-600 font-medium">Application was rejected</p>}
            {normalizedStatus === 'withdrawn' && <p className="text-gray-700 font-medium">Application was withdrawn</p>}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Submitted Details</h2>
          <p className="text-gray-700 text-sm mb-2">
            Resume: {application.resume || 'Not provided'}
          </p>
          <p className="text-gray-700 whitespace-pre-wrap text-sm">
            {application.coverLetter || 'No cover letter submitted.'}
          </p>
        </div>

        {normalizedStatus === 'pending' && (
          <button
            onClick={handleWithdraw}
            disabled={withdrawing}
            className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
          >
            {withdrawing ? 'Withdrawing...' : 'Withdraw Application'}
          </button>
        )}
      </div>
    </div>
  );
}
