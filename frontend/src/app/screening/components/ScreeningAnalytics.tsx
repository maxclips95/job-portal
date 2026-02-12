'use client';

/**
 * ScreeningAnalytics Component
 * Displays analytics and insights from screening results:
 * - Match distribution charts
 * - Score distribution histogram
 * - Top matched skills
 * - Top candidates
 * - Processing metrics
 */

import React, { useState, useEffect } from 'react';
import { screeningService, ScreeningAnalyticsResponse } from '@/services/screening/screeningService';

interface ScreeningAnalyticsProps {
  screeningJobId: string;
  onRefresh?: () => void;
}

export function ScreeningAnalytics({ screeningJobId, onRefresh }: ScreeningAnalyticsProps) {
  const [analytics, setAnalytics] = useState<ScreeningAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [screeningJobId]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await screeningService.getAnalytics(screeningJobId);
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
    if (onRefresh) {
      onRefresh();
    }
  };

  if (isLoading) {
    return (
      <div className="w-full p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center py-8">
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-6 bg-white rounded-lg shadow-lg">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Screening Analytics</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-gray-600 mb-1">Total Candidates</p>
          <p className="text-3xl font-bold text-blue-600">
            {analytics.totalCandidates.toLocaleString()}
          </p>
        </div>

        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-xs text-gray-600 mb-1">Average Score</p>
          <p className="text-3xl font-bold text-green-600">
            {(
              (analytics.matchDistribution.STRONG +
                analytics.matchDistribution.MODERATE +
                analytics.matchDistribution.WEAK) /
              analytics.totalCandidates
            ).toFixed(1)}
            %
          </p>
        </div>

        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-xs text-gray-600 mb-1">Processing Time</p>
          <p className="text-3xl font-bold text-purple-600">
            {analytics.processingMetrics.totalProcessingTime}s
          </p>
        </div>

        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
          <p className="text-xs text-gray-600 mb-1">Avg Time/Resume</p>
          <p className="text-3xl font-bold text-orange-600">
            {analytics.processingMetrics.averageTimePerResume.toFixed(0)}ms
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Match Distribution Pie Chart */}
        <div className="p-6 bg-white rounded-lg shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Match Distribution</h3>

          <div className="flex items-center justify-center">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                {/* Pie slices */}
                <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="20"
                  strokeDasharray={`${(analytics.matchDistribution.STRONG / analytics.totalCandidates) * 251.2} 251.2`}
                  strokeDashoffset="0"
                  transform="rotate(-90 50 50)"
                />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="20"
                  strokeDasharray={`${(analytics.matchDistribution.MODERATE / analytics.totalCandidates) * 251.2} 251.2`}
                  strokeDashoffset={`-${(analytics.matchDistribution.STRONG / analytics.totalCandidates) * 251.2}`}
                  transform="rotate(-90 50 50)"
                />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="20"
                  strokeDasharray={`${(analytics.matchDistribution.WEAK / analytics.totalCandidates) * 251.2} 251.2`}
                  strokeDashoffset={`-${((analytics.matchDistribution.STRONG + analytics.matchDistribution.MODERATE) / analytics.totalCandidates) * 251.2}`}
                  transform="rotate(-90 50 50)"
                />
              </svg>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span className="text-sm text-gray-700">Strong Matches</span>
              </div>
              <span className="font-semibold text-green-600">
                {analytics.matchDistribution.STRONG}
                <span className="text-gray-600 font-normal text-xs ml-1">
                  ({((analytics.matchDistribution.STRONG / analytics.totalCandidates) * 100).toFixed(1)}%)
                </span>
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-500"></div>
                <span className="text-sm text-gray-700">Moderate Matches</span>
              </div>
              <span className="font-semibold text-yellow-600">
                {analytics.matchDistribution.MODERATE}
                <span className="text-gray-600 font-normal text-xs ml-1">
                  ({((analytics.matchDistribution.MODERATE / analytics.totalCandidates) * 100).toFixed(1)}%)
                </span>
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500"></div>
                <span className="text-sm text-gray-700">Weak Matches</span>
              </div>
              <span className="font-semibold text-red-600">
                {analytics.matchDistribution.WEAK}
                <span className="text-gray-600 font-normal text-xs ml-1">
                  ({((analytics.matchDistribution.WEAK / analytics.totalCandidates) * 100).toFixed(1)}%)
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Score Distribution Histogram */}
        <div className="p-6 bg-white rounded-lg shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Score Distribution</h3>

          <div className="space-y-3">
            {analytics.scoreDistribution.bins.map((bin, idx) => (
              <div key={idx}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-700 font-medium">{bin.range}</span>
                  <span className="text-sm text-gray-600">
                    {bin.count} ({bin.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${bin.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Skills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="p-6 bg-white rounded-lg shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Matched Skills</h3>

          <div className="space-y-3">
            {analytics.topMatchedSkills.slice(0, 8).map((skill, idx) => (
              <div key={idx}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-700 font-medium">{skill.skill}</span>
                  <span className="text-sm text-gray-600">
                    {skill.count}
                    <span className="text-xs ml-1">({skill.percentage.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="w-full h-5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all"
                    style={{ width: `${skill.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Processing Metrics */}
        <div className="p-6 bg-white rounded-lg shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Processing Metrics</h3>

          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-700 mb-2">Total Processing Time</p>
              <p className="text-3xl font-bold text-blue-600">
                {analytics.processingMetrics.totalProcessingTime}
                <span className="text-lg ml-1">seconds</span>
              </p>
            </div>

            <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
              <p className="text-sm text-gray-700 mb-2">Average Time Per Resume</p>
              <p className="text-3xl font-bold text-purple-600">
                {analytics.processingMetrics.averageTimePerResume.toFixed(2)}
                <span className="text-lg ml-1">ms</span>
              </p>
            </div>

            <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
              <p className="text-sm text-gray-700 mb-2">Avg Score Calculation Time</p>
              <p className="text-3xl font-bold text-green-600">
                {analytics.processingMetrics.averageScoreCalculationTime.toFixed(2)}
                <span className="text-lg ml-1">ms</span>
              </p>
            </div>

            <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
              <p className="text-sm text-gray-700 mb-2">Throughput</p>
              <p className="text-3xl font-bold text-orange-600">
                {(
                  analytics.totalCandidates /
                  (analytics.processingMetrics.totalProcessingTime / 60)
                ).toFixed(0)}
                <span className="text-lg ml-1">candidates/min</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Candidates */}
      <div className="p-6 bg-white rounded-lg shadow-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Top 5 Candidates</h3>

        <div className="space-y-3">
          {analytics.topCandidates.slice(0, 5).map((candidate, idx) => (
            <div key={candidate.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-800">
                    #{idx + 1} - {candidate.candidateName}
                  </p>
                  {candidate.candidateEmail && (
                    <p className="text-sm text-gray-600">{candidate.candidateEmail}</p>
                  )}
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    candidate.matchCategory === 'STRONG'
                      ? 'bg-green-100 text-green-800'
                      : candidate.matchCategory === 'MODERATE'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {candidate.matchPercentage.toFixed(1)}%
                </span>
              </div>

              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${candidate.matchPercentage}%` }}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {candidate.matchedSkills.slice(0, 4).map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                  >
                    {skill}
                  </span>
                ))}
                {candidate.matchedSkills.length > 4 && (
                  <span className="px-2 py-1 text-gray-600 text-xs">
                    +{candidate.matchedSkills.length - 4} more
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ScreeningAnalytics;
