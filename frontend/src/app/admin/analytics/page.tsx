'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertCircle, Loader, Download, BarChart3, TrendingUp } from 'lucide-react';

interface AnalyticsData {
  dashboard: {
    totalUsers: number;
    totalJobs: number;
    totalApplications: number;
    activeUsers: number;
    pendingApprovals: number;
    totalRevenue: number;
  };
  jobAnalytics: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    active: number;
    expired: number;
  };
  userAnalytics: {
    totalCandidates: number;
    totalEmployers: number;
    activeToday: number;
    newThisMonth: number;
    suspendedCount: number;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('month');

  const safePercent = (part: number, total: number): number => {
    if (!total || total <= 0) return 0;
    return (part / total) * 100;
  };

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const [dashboard, jobs, users] = await Promise.all([
          axios.get('/api/admin/dashboard', { withCredentials: true }),
          axios.get('/api/admin/analytics/jobs', { withCredentials: true }),
          axios.get('/api/admin/analytics/users', { withCredentials: true }),
        ]);

        setData({
          dashboard: dashboard.data,
          jobAnalytics: jobs.data,
          userAnalytics: users.data,
        });
        setError('');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const handleDownloadReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      timeRange,
      data,
    };

    const element = document.createElement('a');
    element.setAttribute(
      'href',
      'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2))
    );
    element.setAttribute('download', `analytics-report-${new Date().toISOString().split('T')[0]}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Analytics & Reports
            </h1>
            <p className="text-gray-600">
              Comprehensive platform metrics and insights
            </p>
          </div>
          <button
            onClick={handleDownloadReport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 font-medium"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
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

        {data && (
          <div className="space-y-6">
            {/* Time Range Filter */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-gray-700">Time Range:</span>
                <div className="flex gap-2">
                  {(['day', 'week', 'month', 'year'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        timeRange === range
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {range.charAt(0).toUpperCase() + range.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dashboard Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                {
                  label: 'Total Users',
                  value: data.dashboard.totalUsers,
                  icon: '👥',
                  borderClass: 'border-blue-500',
                },
                {
                  label: 'Total Jobs',
                  value: data.dashboard.totalJobs,
                  icon: '💼',
                  borderClass: 'border-green-500',
                },
                {
                  label: 'Applications',
                  value: data.dashboard.totalApplications,
                  icon: '📝',
                  borderClass: 'border-purple-500',
                },
                {
                  label: 'Active Today',
                  value: data.dashboard.activeUsers,
                  icon: '🟢',
                  borderClass: 'border-yellow-500',
                },
                {
                  label: 'Pending',
                  value: data.dashboard.pendingApprovals,
                  icon: '⏳',
                  borderClass: 'border-red-500',
                },
                {
                  label: 'Revenue',
                  value: '$' + data.dashboard.totalRevenue.toLocaleString(),
                  icon: '💰',
                  borderClass: 'border-indigo-500',
                },
              ].map((metric, idx) => (
                <div
                  key={idx}
                  className={`bg-white rounded-lg shadow-md p-4 border-t-4 ${metric.borderClass}`}
                >
                  <div className="text-2xl mb-2">{metric.icon}</div>
                  <div className="text-sm text-gray-600 mb-1">{metric.label}</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {typeof metric.value === 'number'
                      ? metric.value.toLocaleString()
                      : metric.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Job Analytics */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Job Analytics</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  {
                    label: 'Total Jobs',
                    value: data.jobAnalytics.total,
                    percentage: 100,
                  },
                  {
                    label: 'Approved',
                    value: data.jobAnalytics.approved,
                    percentage: safePercent(data.jobAnalytics.approved, data.jobAnalytics.total),
                    color: 'green',
                  },
                  {
                    label: 'Pending',
                    value: data.jobAnalytics.pending,
                    percentage: safePercent(data.jobAnalytics.pending, data.jobAnalytics.total),
                    color: 'yellow',
                  },
                  {
                    label: 'Rejected',
                    value: data.jobAnalytics.rejected,
                    percentage: safePercent(data.jobAnalytics.rejected, data.jobAnalytics.total),
                    color: 'red',
                  },
                  {
                    label: 'Active',
                    value: data.jobAnalytics.active,
                    percentage: safePercent(data.jobAnalytics.active, data.jobAnalytics.total),
                    color: 'blue',
                  },
                  {
                    label: 'Expired',
                    value: data.jobAnalytics.expired,
                    percentage: safePercent(data.jobAnalytics.expired, data.jobAnalytics.total),
                    color: 'gray',
                  },
                ].map((stat, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2 font-medium">
                      {stat.label}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-2">
                      {stat.value}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          stat.color === 'green'
                            ? 'bg-green-500'
                            : stat.color === 'yellow'
                            ? 'bg-yellow-500'
                            : stat.color === 'red'
                            ? 'bg-red-500'
                            : stat.color === 'blue'
                            ? 'bg-blue-500'
                            : 'bg-gray-500'
                        }`}
                        style={{ width: `${stat.percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {stat.percentage.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* User Analytics */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h2 className="text-xl font-bold text-gray-900">User Analytics</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  {
                    label: 'Total Candidates',
                    value: data.userAnalytics.totalCandidates,
                    icon: '🎯',
                    color: 'blue',
                  },
                  {
                    label: 'Total Employers',
                    value: data.userAnalytics.totalEmployers,
                    icon: '🏢',
                    color: 'green',
                  },
                  {
                    label: 'Active Today',
                    value: data.userAnalytics.activeToday,
                    icon: '🟢',
                    color: 'yellow',
                  },
                  {
                    label: 'New This Month',
                    value: data.userAnalytics.newThisMonth,
                    icon: '⭐',
                    color: 'purple',
                  },
                  {
                    label: 'Suspended',
                    value: data.userAnalytics.suspendedCount,
                    icon: '⛔',
                    color: 'red',
                  },
                ].map((stat, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl mb-2">{stat.icon}</div>
                    <div className="text-sm text-gray-600 mb-2 font-medium">
                      {stat.label}
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {stat.value.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Insights & Trends */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Key Insights</h2>

              <div className="space-y-3">
                <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                  <p className="text-sm text-blue-900">
                    <strong>Platform Health:</strong> {data.dashboard.totalUsers > 100 ? '✓ Healthy' : '⚠ Growing'} - Platform has{' '}
                    {data.dashboard.totalUsers.toLocaleString()} registered users
                  </p>
                </div>

                <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded">
                  <p className="text-sm text-green-900">
                    <strong>Job Activity:</strong> {data.jobAnalytics.active} active jobs
                    posted by{' '}
                    {data.userAnalytics.totalEmployers.toLocaleString()} employers
                  </p>
                </div>

                <div className="p-4 bg-purple-50 border-l-4 border-purple-500 rounded">
                  <p className="text-sm text-purple-900">
                    <strong>Application Rate:</strong>{' '}
                    {data.dashboard.totalApplications > 0
                      ? (
                          (data.dashboard.totalApplications /
                            data.dashboard.totalJobs) *
                          100
                        ).toFixed(1)
                      : 0}
                    % average applications per job
                  </p>
                </div>

                <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                  <p className="text-sm text-yellow-900">
                    <strong>Pending Review:</strong>{' '}
                    {data.dashboard.pendingApprovals} jobs and{' '}
                    {data.jobAnalytics.pending} company verifications awaiting
                    review
                  </p>
                </div>

                <div className="p-4 bg-indigo-50 border-l-4 border-indigo-500 rounded">
                  <p className="text-sm text-indigo-900">
                    <strong>User Engagement:</strong>{' '}
                    {data.userAnalytics.activeToday} users active in the last 24
                    hours ({
                      safePercent(data.userAnalytics.activeToday, data.dashboard.totalUsers).toFixed(1)
                    }% of total)
                  </p>
                </div>
              </div>
            </div>

            {/* Report Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Report Summary
              </h2>

              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  <strong>Report Generated:</strong>{' '}
                  {new Date().toLocaleString()}
                </p>
                <p>
                  <strong>Time Range:</strong>{' '}
                  {timeRange === 'day'
                    ? 'Last 24 Hours'
                    : timeRange === 'week'
                    ? 'Last 7 Days'
                    : timeRange === 'month'
                    ? 'Last 30 Days'
                    : 'Last Year'}
                </p>
                <p>
                  <strong>Data Points Collected:</strong> Dashboard metrics,
                  job analytics, user analytics
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
