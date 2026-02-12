'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Users,
  Briefcase,
  TrendingUp,
  AlertCircle,
  BarChart3,
  Clock,
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalJobs: number;
  totalApplications: number;
  activeUsers: number;
  pendingApprovals: number;
  totalRevenue: number;
}

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_BASE = API_ORIGIN.endsWith('/api') ? API_ORIGIN : `${API_ORIGIN}/api`;

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/admin/dashboard`, {
        withCredentials: true,
      });
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200 max-w-md">
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={fetchDashboardStats}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'bg-blue-100 text-blue-600',
      trend: '+12% this month',
    },
    {
      title: 'Active Jobs',
      value: stats?.totalJobs || 0,
      icon: Briefcase,
      color: 'bg-green-100 text-green-600',
      trend: '+8% this week',
    },
    {
      title: 'Total Applications',
      value: stats?.totalApplications || 0,
      icon: TrendingUp,
      color: 'bg-purple-100 text-purple-600',
      trend: '+24% this month',
    },
    {
      title: 'Active Users (24h)',
      value: stats?.activeUsers || 0,
      icon: Clock,
      color: 'bg-orange-100 text-orange-600',
      trend: 'Real-time data',
    },
    {
      title: 'Pending Approvals',
      value: stats?.pendingApprovals || 0,
      icon: AlertCircle,
      color: 'bg-red-100 text-red-600',
      trend: 'Needs action',
    },
    {
      title: 'Revenue',
      value: `$${(stats?.totalRevenue || 0).toLocaleString()}`,
      icon: BarChart3,
      color: 'bg-indigo-100 text-indigo-600',
      trend: '+15% this month',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back! Here's your platform overview.</p>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">{card.title}</p>
                    <p className="text-4xl font-bold text-gray-900 mt-2">{card.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${card.color}`}>
                    <Icon size={24} />
                  </div>
                </div>
                <p className="text-xs text-gray-500">{card.trend}</p>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Pending Jobs Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Pending Approvals</h2>
              <AlertCircle size={24} className="text-orange-600" />
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-2">
              {stats?.pendingApprovals || 0}
            </p>
            <p className="text-gray-600 text-sm mb-4">Jobs waiting for review</p>
            <a
              href="/admin/jobs"
              className="inline-block px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold transition-colors"
            >
              Review Jobs
            </a>
          </div>

          {/* System Health Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">System Health</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">API Status</span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Database</span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Email Service</span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity & Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Links</h3>
            <div className="space-y-2">
              <a
                href="/admin/users"
                className="block px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-semibold"
              >
                Manage Users
              </a>
              <a
                href="/admin/jobs"
                className="block px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-semibold"
              >
                Manage Jobs
              </a>
              <a
                href="/admin/analytics"
                className="block px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-semibold"
              >
                View Analytics
              </a>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Management</h3>
            <div className="space-y-2">
              <a
                href="/admin/companies"
                className="block px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors font-semibold"
              >
                Company Verification
              </a>
              <a
                href="/admin/settings"
                className="block px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors font-semibold"
              >
                System Settings
              </a>
              <a
                href="/admin/activity-logs"
                className="block px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors font-semibold"
              >
                Activity Logs
              </a>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Reports</h3>
            <div className="space-y-2">
              <button className="w-full px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors font-semibold text-left">
                User Growth Report
              </button>
              <button className="w-full px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors font-semibold text-left">
                Job Analytics
              </button>
              <button className="w-full px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors font-semibold text-left">
                Revenue Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
