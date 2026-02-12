'use client';

import React, { useEffect, useState } from 'react';
import { useApplicationStore } from '@/stores/applicationStore';
import { Calendar, MapPin, User, MessageSquare, X } from 'lucide-react';

export default function InterviewsPage() {
  const [rescheduleId, setRescheduleId] = useState<string | number | null>(null);
  const [newDate, setNewDate] = useState('');
  const [feedbackId, setFeedbackId] = useState<string | number | null>(null);
  const [feedback, setFeedback] = useState('');

  const {
    interviews,
    interviewLoading,
    interviewError,
    fetchInterviews,
    rescheduleInterview,
    submitInterviewFeedback,
  } = useApplicationStore();

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  const handleReschedule = async (id: string | number) => {
    if (newDate) {
      await rescheduleInterview(id, newDate);
      setRescheduleId(null);
      setNewDate('');
    }
  };

  const handleSubmitFeedback = async (id: string | number) => {
    if (feedback.trim()) {
      await submitInterviewFeedback(id, feedback);
      setFeedbackId(null);
      setFeedback('');
    }
  };

  if (interviewLoading && interviews.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading interviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">My Interviews</h1>
        <p className="text-gray-600 mb-8">Manage and prepare for your scheduled interviews</p>

        {interviewError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{interviewError}</p>
          </div>
        )}

        {interviews.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center shadow">
            <p className="text-gray-600 text-lg mb-4">No interviews scheduled yet</p>
            <p className="text-gray-500">Interviews will appear here once they're scheduled</p>
          </div>
        ) : (
          <div className="space-y-4">
            {interviews.map((interview) => (
              <div
                key={interview.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Interview - Round</h3>
                    <p className="text-gray-600">{interview.interviewType}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      interview.status === 'scheduled'
                        ? 'bg-yellow-100 text-yellow-700'
                        : interview.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-3 text-gray-600">
                    <Calendar size={20} className="text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-500">Scheduled Date</p>
                      <p className="font-semibold">
                        {new Date(interview.scheduledDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {interview.interviewer && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <User size={20} className="text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-500">Interviewer</p>
                        <p className="font-semibold">{interview.interviewer}</p>
                      </div>
                    </div>
                  )}

                  {interview.meetingLink && (
                    <div className="flex items-center gap-3 text-gray-600 col-span-2">
                      <MapPin size={20} className="text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-500">Meeting Link</p>
                        <a
                          href={interview.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-blue-600 hover:underline"
                        >
                          Join Interview
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {interview.status === 'completed' && interview.feedback && (
                  <div className="p-4 bg-gray-50 rounded-lg mb-6 border border-gray-200">
                    <p className="text-sm text-gray-600 font-semibold mb-2">Feedback</p>
                    <p className="text-gray-700">{interview.feedback}</p>
                  </div>
                )}

                {feedbackId === interview.id ? (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                    <label className="block mb-2 font-semibold text-gray-900">
                      Submit Your Feedback
                    </label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Share your feedback about the interview..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSubmitFeedback(interview.id)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors"
                      >
                        Submit Feedback
                      </button>
                      <button
                        onClick={() => {
                          setFeedbackId(null);
                          setFeedback('');
                        }}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                {rescheduleId === interview.id ? (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                    <label className="block mb-2 font-semibold text-gray-900">
                      New Interview Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReschedule(interview.id)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors"
                      >
                        Confirm New Date
                      </button>
                      <button
                        onClick={() => {
                          setRescheduleId(null);
                          setNewDate('');
                        }}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                {interview.status === 'scheduled' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRescheduleId(interview.id)}
                      className="flex-1 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-semibold transition-colors"
                    >
                      Reschedule
                    </button>
                    {interview.meetingLink && (
                      <a
                        href={interview.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors text-center"
                      >
                        Join Interview
                      </a>
                    )}
                  </div>
                )}

                {interview.status === 'completed' && !interview.feedback && (
                  <button
                    onClick={() => setFeedbackId(interview.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-semibold transition-colors"
                  >
                    <MessageSquare size={18} />
                    Share Feedback
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
