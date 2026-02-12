'use client';

import { useState, useEffect } from 'react';
import { predictiveService } from '@/services/predictive.service';
import {
  TrendingUp,
  Users,
  Target,
  Zap,
  BarChart3,
  Calendar,
  Award,
  Brain,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface MetricCard {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  icon: React.ReactNode;
  bgColor: string;
}

export const PredictiveAnalyticsDashboard: React.FC<{ userId: string }> = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [userAnalytics, setUserAnalytics] = useState<any>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('12');

  useEffect(() => {
    loadMetrics();
  }, [userId, selectedTimeframe]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const [dashboard, user] = await Promise.all([
        predictiveService.getDashboardMetrics({ timeframeMonths: parseInt(selectedTimeframe) }),
        predictiveService.getUserAnalytics(userId),
      ]);

      setDashboardMetrics(dashboard);
      setUserAnalytics(user);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const metricCards: MetricCard[] = [
    {
      label: 'Total Users',
      value: dashboardMetrics?.totalUsers || 0,
      trend: 'up',
      trendValue: 12,
      icon: <Users size={24} />,
      bgColor: 'from-blue-400 to-blue-600',
    },
    {
      label: 'Active Users',
      value: dashboardMetrics?.activeUsers || 0,
      trend: 'up',
      trendValue: 8,
      icon: <Zap size={24} />,
      bgColor: 'from-green-400 to-green-600',
    },
    {
      label: 'Prediction Accuracy',
      value: `${dashboardMetrics?.predictionAccuracy || 0}%`,
      trend: 'up',
      trendValue: 5,
      icon: <Target size={24} />,
      bgColor: 'from-purple-400 to-purple-600',
    },
    {
      label: 'Avg Confidence',
      value: dashboardMetrics?.averageConfidenceScore || 0,
      trend: 'stable',
      icon: <Brain size={24} />,
      bgColor: 'from-orange-400 to-orange-600',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Predictive Analytics</h2>
        <div className="flex gap-2">
          {['30', '90', '180', '365'].map((months) => (
            <button
              key={months}
              onClick={() => setSelectedTimeframe(months)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedTimeframe === months
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {months === '30' ? '1mo' : months === '90' ? '3mo' : months === '180' ? '6mo' : '1yr'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((metric, idx) => (
          <div key={idx} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className={`bg-gradient-to-br ${metric.bgColor} p-4 text-white`}>
              <div className="flex items-center justify-between">
                <div>{metric.icon}</div>
                {metric.trend && (
                  <div className="flex items-center gap-1 text-sm">
                    {metric.trend === 'up' && <ArrowUp size={16} />}
                    {metric.trend === 'down' && <ArrowDown size={16} />}
                    {metric.trendValue && <span>+{metric.trendValue}%</span>}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4">
              <p className="text-gray-600 text-sm font-medium">{metric.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{metric.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Top Recommended Skills */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Award size={20} />
          Top In-Demand Skills
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dashboardMetrics?.topRecommendedSkills?.slice(0, 10)?.map((skill: string, idx: number) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {idx + 1}
                </div>
                <span className="font-medium text-gray-900">{skill}</span>
              </div>
              <TrendingUp size={18} className="text-green-600" />
            </div>
          ))}
        </div>
      </div>

      {/* User Personal Metrics */}
      {userAnalytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Skill Recommendations */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target size={20} />
              Recommended Skills
            </h3>

            <div className="space-y-3">
              {userAnalytics.skillRecommendations?.slice(0, 5)?.map((rec: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{rec.skill}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-full max-w-xs h-2 bg-gray-300 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                          style={{ width: `${rec.relevanceScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-600">{rec.relevanceScore.toFixed(0)}%</span>
                    </div>
                  </div>

                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                    {rec.difficulty}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Skill Gaps */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Zap size={20} />
              Critical Skill Gaps
            </h3>

            <div className="space-y-3">
              {userAnalytics.skillGaps?.filter((gap: any) => gap.priority === 'critical')?.slice(0, 5)?.map((gap: any, idx: number) => (
                <div key={idx} className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-900">{gap.skill}</p>
                    <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">CRITICAL</span>
                  </div>

                  <div className="space-y-1 text-xs text-gray-600">
                    <p>Current: {gap.currentLevel}/5 → Required: {gap.requiredLevel}/5</p>
                    <p>⏱ Est. time: {gap.estimatedTimeToLearn} hours</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Progress Metrics */}
      {userAnalytics?.progressMetrics?.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 size={20} />
            Learning Progress
          </h3>

          <div className="space-y-4">
            {userAnalytics.progressMetrics?.slice(0, 5)?.map((metric: any, idx: number) => (
              <div key={idx} className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700 min-w-40">{metric.name}</span>
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      metric.value >= 80
                        ? 'bg-green-500'
                        : metric.value >= 50
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${metric.value}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-gray-900">{metric.value.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Footer */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
          <p className="text-3xl font-bold text-blue-600">{dashboardMetrics?.usersWithPredictions || 0}</p>
          <p className="text-sm text-gray-600 mt-1">Users with Predictions</p>
        </div>

        <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
          <p className="text-3xl font-bold text-green-600">{dashboardMetrics?.avgTimeToUpskill || 0} mo</p>
          <p className="text-sm text-gray-600 mt-1">Avg Upskill Time</p>
        </div>

        <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
          <p className="text-3xl font-bold text-purple-600">{dashboardMetrics?.userSatisfactionScore || 0}/5</p>
          <p className="text-sm text-gray-600 mt-1">User Satisfaction</p>
        </div>
      </div>
    </div>
  );
};
