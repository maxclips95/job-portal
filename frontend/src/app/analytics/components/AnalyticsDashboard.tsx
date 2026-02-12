'use client';

/**
 * Analytics Dashboard Component
 * Main dashboard showing market analytics overview with charts and metrics
 */

import React, { useEffect, useState } from 'react';
import { analyticsService } from '../../../services/analytics/analyticsService';
import { AnalyticsDashboard as IAnalyticsDashboard } from '../../../types/analytics.types';

interface MetricCard {
  label: string;
  value: string | number;
  change?: number;
  unit?: string;
}

export const AnalyticsDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<IAnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await analyticsService.getDashboard();
      setDashboard(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="font-semibold">Error loading dashboard</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={loadDashboard}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!dashboard) {
    return <div className="text-gray-500">No data available</div>;
  }

  const metrics: MetricCard[] = [
    {
      label: 'Total Jobs',
      value: dashboard.summary.totalJobs.toLocaleString(),
    },
    {
      label: 'Applications',
      value: dashboard.summary.totalApplications.toLocaleString(),
    },
    {
      label: 'Average Salary',
      value: `$${Math.round(dashboard.summary.averageSalary / 1000)}K`,
    },
    {
      label: 'Median Salary',
      value: `$${Math.round(dashboard.summary.medianSalary / 1000)}K`,
    },
    {
      label: 'Unique Skills',
      value: dashboard.summary.uniqueSkills,
    },
    {
      label: 'Locations',
      value: dashboard.summary.uniqueLocations,
    },
  ];

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Market Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Period: {dashboard.summary.period}
          </p>
        </div>
        <div className="flex gap-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${
              dashboard.summary.marketSentiment === 'positive'
                ? 'bg-green-100 text-green-800'
                : dashboard.summary.marketSentiment === 'neutral'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
            }`}
          >
            {dashboard.summary.marketSentiment.toUpperCase()} SENTIMENT
          </span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">{metric.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{metric.value}</p>
            {metric.change && (
              <p
                className={`text-sm mt-2 ${
                  metric.change > 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {metric.change > 0 ? '↑' : '↓'} {Math.abs(metric.change)}%
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Hiring Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Hiring Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-gray-600 text-sm">Application Rate</p>
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(dashboard.summary.hiringMetrics.applicationRate)}%
            </p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Interview Rate</p>
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(dashboard.summary.hiringMetrics.interviewRate)}%
            </p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Offer Rate</p>
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(dashboard.summary.hiringMetrics.offerRate)}%
            </p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Acceptance Rate</p>
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(dashboard.summary.hiringMetrics.acceptanceRate)}%
            </p>
          </div>
        </div>
      </div>

      {/* Top Skills */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Top In-Demand Skills</h2>
        <div className="space-y-3">
          {dashboard.summary.topSkills.slice(0, 8).map((skill) => (
            <div key={skill.skill} className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{skill.skill}</p>
                <p className="text-xs text-gray-500">{skill.jobCount} jobs available</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-48 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${skill.demand}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                  {skill.demand}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Top Job Markets</h2>
          <div className="space-y-3">
            {dashboard.summary.topLocations.slice(0, 5).map((location) => (
              <div key={location.location} className="flex items-center justify-between pb-3 border-b border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">{location.location}</p>
                  <p className="text-xs text-gray-500">{location.jobCount} jobs</p>
                </div>
                <p className="text-lg font-semibold text-blue-600">
                  ${Math.round(location.salaryAverage / 1000)}K
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Top Job Roles</h2>
          <div className="space-y-3">
            {dashboard.summary.topJobRoles.slice(0, 5).map((role) => (
              <div key={role.category} className="flex items-center justify-between pb-3 border-b border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">{role.category}</p>
                  <p className="text-xs text-gray-500">{role.volume} jobs</p>
                </div>
                <p className="text-lg font-semibold text-green-600">
                  +{role.growth}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Market Insights */}
      {dashboard.insights.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Market Insights</h2>
          <div className="space-y-3">
            {dashboard.insights.slice(0, 4).map((insight) => (
              <div
                key={insight.id}
                className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{insight.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 text-blue-800 ml-4">
                    {Math.round(insight.relevance)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={loadDashboard}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Refresh Data
        </button>
      </div>
    </div>
  );
};
