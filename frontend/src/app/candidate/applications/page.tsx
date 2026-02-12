'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApplicationStore } from '@/stores/applicationStore';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  Eye,
} from 'lucide-react';

const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  pending: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    icon: <Clock size={18} />,
  },
  reviewed: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    icon: <Eye size={18} />,
  },
  shortlisted: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    icon: <AlertCircle size={18} />,
  },
  accepted: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    icon: <CheckCircle size={18} />,
  },
  rejected: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    icon: <XCircle size={18} />,
  },
  withdrawn: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    icon: <Trash2 size={18} />,
  },
};

export default function ApplicationsPage() {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const {
    applications,
    applicationLoading,
    applicationError,
    fetchApplications,
    withdrawApplication,
    statistics,
    fetchStatistics,
  } = useApplicationStore();

  useEffect(() => {
    fetchApplications({ status: selectedStatus, limit: 10, offset: (currentPage - 1) * 10 });
    fetchStatistics();
  }, [selectedStatus, currentPage, fetchApplications, fetchStatistics]);

  const filteredApplications = selectedStatus
    ? applications.filter((app) => app.status === selectedStatus)
    : applications;

  const handleWithdraw = async (applicationId: string | number) => {
    if (window.confirm('Are you sure you want to withdraw this application?')) {
      await withdrawApplication(applicationId);
    }
  };

  const getStatusConfig = (status: string) =>
    statusColors[status] || {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      icon: <AlertCircle size={18} />,
    };

  if (applicationLoading && applications.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Applications</h1>
          <p className="text-gray-600">Track and manage all your job applications</p>
        </div>

        {/* Error Message */}
        {applicationError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{applicationError}</p>
          </div>
        )}

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg p-4 shadow border-l-4 border-gray-400">
              <p className="text-gray-600 text-sm font-medium">Total</p>
              <p className="text-3xl font-bold text-gray-900">{statistics.total}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow border-l-4 border-yellow-400">
              <p className="text-gray-600 text-sm font-medium">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">{statistics.pending}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow border-l-4 border-blue-400">
              <p className="text-gray-600 text-sm font-medium">Reviewed</p>
              <p className="text-3xl font-bold text-blue-600">{statistics.reviewed}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow border-l-4 border-purple-400">
              <p className="text-gray-600 text-sm font-medium">Shortlisted</p>
              <p className="text-3xl font-bold text-purple-600">{statistics.shortlisted}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow border-l-4 border-green-400">
              <p className="text-gray-600 text-sm font-medium">Accepted</p>
              <p className="text-3xl font-bold text-green-600">{statistics.accepted}</p>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow mb-6 p-4 border-b border-gray-200">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => {
                setSelectedStatus(null);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                selectedStatus === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Applications
            </button>
            {['pending', 'reviewed', 'shortlisted', 'accepted', 'rejected'].map((status) => {
              const statusConfig = getStatusConfig(status);
              return (
              <button
                key={status}
                onClick={() => {
                  setSelectedStatus(status);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors capitalize flex items-center gap-2 ${
                  selectedStatus === status
                    ? statusConfig.bg + ' ' + statusConfig.text
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {statusConfig.icon}
                {status}
              </button>
              );
            })}
          </div>
        </div>

        {/* Applications List */}
        {filteredApplications.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center shadow">
            <p className="text-gray-600 text-lg mb-4">No applications found</p>
            <button
              onClick={() => router.push('/jobs')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Browse Jobs
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((app) => {
              const statusConfig = getStatusConfig(app.status);
              return (
              <div
                key={app.id}
                className={`rounded-lg shadow border-l-4 p-6 ${statusConfig.bg}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900">{app.jobTitle}</h3>
                    <p className="text-gray-600 font-medium">{app.companyName}</p>
                    <p className="text-gray-500 text-sm">{app.location}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2 ${statusConfig.text} bg-white border`}
                    >
                      {statusConfig.icon}
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Application Details */}
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div>
                    <p className="text-gray-600">Applied Date</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(app.appliedDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status</p>
                    <p className="font-semibold text-gray-900 capitalize">{app.status}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/applications/${app.id}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Eye size={18} />
                    View Details
                  </button>

                  {app.status === 'pending' && (
                    <button
                      onClick={() => handleWithdraw(app.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-300 rounded-lg font-semibold text-red-700 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={18} />
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {filteredApplications.length > 0 && (
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            <div className="flex items-center gap-2">
              <span className="text-gray-600">Page {currentPage}</span>
            </div>

            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              className="px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
