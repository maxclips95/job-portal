'use client';

/**
 * Screening Layout Component
 * Main layout for the screening feature with tabs for Upload, Results, and Analytics
 */

import React, { useState, useEffect } from 'react';
import ScreeningUpload from './components/ScreeningUpload';
import ScreeningResults from './components/ScreeningResults';
import ScreeningAnalytics from './components/ScreeningAnalytics';
import type { ScreeningJobResponse } from '@/services/screening/screeningService';
import { screeningService } from '@/services/screening/screeningService';
import { jobService } from '@/services/job.service';

type TabType = 'upload' | 'results' | 'analytics';

interface ScreeningJob {
  id: string;
  title: string;
}

export default function ScreeningPage() {
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [currentScreeningJobId, setCurrentScreeningJobId] = useState<string>('');
  const [availableJobs, setAvailableJobs] = useState<ScreeningJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [jobStatus, setJobStatus] = useState<ScreeningJobResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    loadAvailableJobs();
  }, []);

  const loadAvailableJobs = async () => {
    setIsLoadingJobs(true);
    try {
      const jobs = await jobService.getEmployerJobs();
      setAvailableJobs(
        (jobs || []).map((job) => ({
          id: job.id,
          title: job.title,
        }))
      );
    } catch (error) {
      console.error('Failed to load jobs:', error);
      setAvailableJobs([]);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const handleUploadComplete = (job: ScreeningJobResponse) => {
    setCurrentScreeningJobId(job.id);
    setJobStatus(job);
    setStatusMessage(
      `Upload successful. Screening job ${job.id} is now processing ${job.totalResumes} resumes.`
    );
    setShowSuccessMessage(true);

    // Auto-switch to results tab after 2 seconds
    setTimeout(() => {
      setActiveTab('results');
      setShowSuccessMessage(false);
    }, 2000);

    // Poll job status every 5 seconds
    pollJobStatus(job.id);
  };

  const pollJobStatus = async (jobId: string) => {
    const maxAttempts = 120; // 10 minutes
    let attempts = 0;

    const poll = async () => {
      try {
        const job = await screeningService.getJobStatus(jobId);
        setJobStatus(job);

        if (job.status === 'COMPLETED') {
          setStatusMessage('Screening completed. View results and analytics.');
          return;
        }

        if (job.status === 'FAILED') {
          setStatusMessage('Screening failed. Please try again.');
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        }
      } catch (error) {
        console.error('Failed to poll job status:', error);
      }
    };

    poll();
  };

  const handleJobIdChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentScreeningJobId(e.target.value);
    setActiveTab('results');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Resume Screening
          </h1>
          <p className="text-lg text-gray-600">
            Upload resumes, view results, and analyze screening data with AI-powered matching
          </p>
        </div>

        {/* Status Message */}
        {showSuccessMessage && statusMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg shadow-sm">
            <p className="text-green-800 font-semibold">{statusMessage}</p>
          </div>
        )}

        {/* Job Status Bar */}
        {jobStatus && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-blue-600 font-semibold mb-1">Current Screening Job</p>
                <p className="text-lg font-mono text-blue-900">{jobStatus.id}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-600 mb-1">Status</p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    jobStatus.status === 'COMPLETED'
                      ? 'bg-green-100 text-green-800'
                      : jobStatus.status === 'PROCESSING'
                      ? 'bg-yellow-100 text-yellow-800'
                      : jobStatus.status === 'FAILED'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {jobStatus.status}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-600 mb-1">Progress</p>
                <p className="text-lg font-semibold text-blue-900">
                  {jobStatus.processedCount}/{jobStatus.totalResumes}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3 w-full h-2 bg-blue-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{
                  width: `${(jobStatus.processedCount / jobStatus.totalResumes) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mb-6 border-b border-gray-300">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-3 font-semibold rounded-t-lg transition-colors border-b-2 ${
                activeTab === 'upload'
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <svg
                className="inline-block w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              Upload Resumes
            </button>

            {currentScreeningJobId && (
              <>
                <button
                  onClick={() => setActiveTab('results')}
                  className={`px-4 py-3 font-semibold rounded-t-lg transition-colors border-b-2 ${
                    activeTab === 'results'
                      ? 'border-blue-600 text-blue-600 bg-white'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <svg
                    className="inline-block w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Results
                </button>

                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`px-4 py-3 font-semibold rounded-t-lg transition-colors border-b-2 ${
                    activeTab === 'analytics'
                      ? 'border-blue-600 text-blue-600 bg-white'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <svg
                    className="inline-block w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  Analytics
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {activeTab === 'upload' && (
            <ScreeningUpload
              availableJobs={availableJobs}
              onUploadComplete={handleUploadComplete}
            />
          )}

          {activeTab === 'results' && currentScreeningJobId && (
            <ScreeningResults screeningJobId={currentScreeningJobId} />
          )}

          {activeTab === 'analytics' && currentScreeningJobId && (
            <ScreeningAnalytics screeningJobId={currentScreeningJobId} />
          )}

          {!currentScreeningJobId && (activeTab === 'results' || activeTab === 'analytics') && (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 mx-auto text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                No screening job selected
              </h3>
              <p className="text-gray-600 mb-4">
                Upload resumes first or select a previous screening job to view results and analytics.
              </p>
              <button
                onClick={() => setActiveTab('upload')}
                className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload Resumes
              </button>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">ðŸ’¡ Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              â€¢ Upload 1-500 PDF resumes at a time for intelligent screening and ranking
            </li>
            <li>
              â€¢ View detailed results with match percentages, skill matching, and candidate rankings
            </li>
            <li>
              â€¢ Use analytics to understand candidate pool distribution and top matches
            </li>
            <li>
              â€¢ Shortlist candidates directly from the results table or bulk actions
            </li>
            <li>
              â€¢ Export results in CSV or JSON format for integration with your systems
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

