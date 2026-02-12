'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import applicationService from '@/services/application.service';

interface ApplicationFormData {
  coverLetter: string;
  resumeUrl: string;
}

export default function JobApplicationPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [formData, setFormData] = useState<ApplicationFormData>({
    coverLetter: '',
    resumeUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // TODO: Implement file upload service
    // For now, just store the file name
    setFormData(prev => ({ ...prev, resumeUrl: file.name }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await applicationService.applyForJob(jobId, {
        coverLetter: formData.coverLetter,
        resumeUrl: formData.resumeUrl,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push('/candidate/applications');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/jobs" className="text-blue-600 hover:underline mb-6 inline-block">
          ← Back to Jobs
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Apply for Position</h1>
          <p className="text-gray-600 mb-6">
            Complete the form below to submit your application.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded mb-6">
              ✓ Application submitted successfully! Redirecting...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Resume Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resume/CV *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="resume-upload"
                />
                <label htmlFor="resume-upload" className="cursor-pointer">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20a4 4 0 004 4h24a4 4 0 004-4V20m-4-12l-8-8m0 0l-8 8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    {formData.resumeUrl ? (
                      <>
                        ✓ {formData.resumeUrl}
                        <br />
                        <span className="text-xs text-gray-600">Click to change</span>
                      </>
                    ) : (
                      <>
                        Click to upload or drag and drop
                        <br />
                        <span className="text-xs text-gray-600">PDF, DOC, DOCX up to 5MB</span>
                      </>
                    )}
                  </p>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Make sure your resume is up to date and relevant to the position.
              </p>
            </div>

            {/* Cover Letter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cover Letter
              </label>
              <textarea
                name="coverLetter"
                value={formData.coverLetter}
                onChange={handleInputChange}
                placeholder="Tell us why you're interested in this position and what makes you a great fit..."
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-2">
                Optional, but a personalized cover letter can increase your chances.
              </p>
            </div>

            {/* Additional Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Application Tips</h3>
              <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                <li>Use a professional resume with up-to-date information</li>
                <li>Write a personalized cover letter if you have time</li>
                <li>Highlight relevant skills and experience</li>
                <li>Check for spelling and grammar mistakes</li>
              </ul>
            </div>

            {/* Confirmation */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> By submitting this application, you agree to our{' '}
                <Link href="/terms" className="text-yellow-700 underline hover:text-yellow-900">
                  terms and conditions
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-yellow-700 underline hover:text-yellow-900">
                  privacy policy
                </Link>
                .
              </p>
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading || !formData.resumeUrl}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
