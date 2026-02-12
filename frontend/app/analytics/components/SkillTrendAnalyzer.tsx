'use client';

/**
 * Skill Trend Analyzer Component
 * Analyzes skill trends and market demand over time
 */

import React, { useEffect, useState } from 'react';
import { analyticsService } from '@/services/analytics/analyticsService';
import { SkillTrend, AnalyticsFilter } from '@/types/analytics.types';

export const SkillTrendAnalyzer: React.FC = () => {
  const [skills, setSkills] = useState<any[]>([]);
  const [trends, setTrends] = useState<SkillTrend[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'1month' | '3months' | '6months' | '1year'>('3months');

  useEffect(() => {
    loadSkills();
  }, []);

  useEffect(() => {
    if (selectedSkill) {
      loadTrends();
    }
  }, [selectedSkill, timeframe]);

  const loadSkills = async () => {
    try {
      setLoading(true);
      const topSkills = await analyticsService.getTopSkills(30);
      setSkills(topSkills);
      if (topSkills.length > 0) {
        setSelectedSkill(topSkills[0].skill);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skills');
    } finally {
      setLoading(false);
    }
  };

  const loadTrends = async () => {
    try {
      setLoading(true);
      const filter: AnalyticsFilter = {
        startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      };
      const trendData = await analyticsService.getSkillTrends(filter);
      const filtered = trendData.filter((t) => t.skill === selectedSkill);
      setTrends(filtered);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trends');
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

  const selectedSkillData = skills.find((s) => s.skill === selectedSkill);

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Skill Trend Analyzer</h1>
        <p className="text-gray-600 mt-1">Track skill demand and market trends over time</p>
      </div>

      {/* Skill Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Select a Skill</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {skills.map((skill) => (
            <button
              key={skill.skill}
              onClick={() => setSelectedSkill(skill.skill)}
              className={`p-3 rounded-lg font-medium text-sm transition-all ${
                selectedSkill === skill.skill
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <p className="font-semibold">{skill.skill}</p>
              <p className="text-xs">{skill.demand}% demand</p>
            </button>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>}

      {selectedSkillData && (
        <>
          {/* Skill Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium">Current Demand</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{selectedSkillData.demand}%</p>
              <div className="mt-3 flex items-center text-sm">
                {selectedSkillData.trendDirection === 'increasing' && (
                  <>
                    <span className="text-green-600 font-semibold">↑ Increasing</span>
                  </>
                )}
                {selectedSkillData.trendDirection === 'decreasing' && (
                  <span className="text-red-600 font-semibold">↓ Decreasing</span>
                )}
                {selectedSkillData.trendDirection === 'stable' && (
                  <span className="text-gray-600 font-semibold">→ Stable</span>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium">Job Openings</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {selectedSkillData.jobCount.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 mt-2">Active positions</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium">Salary Lift</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                +{selectedSkillData.averageSalaryLift}%
              </p>
              <p className="text-sm text-gray-600 mt-2">Average boost</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium">Market Saturation</p>
              <p
                className={`text-2xl font-bold mt-2 ${
                  selectedSkillData.marketSaturation === 'low'
                    ? 'text-green-600'
                    : selectedSkillData.marketSaturation === 'medium'
                      ? 'text-yellow-600'
                      : 'text-red-600'
                }`}
              >
                {selectedSkillData.marketSaturation.toUpperCase()}
              </p>
              <p className="text-sm text-gray-600 mt-2">Talent availability</p>
            </div>
          </div>

          {/* Trend Chart */}
          {trends.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Demand Trend</h2>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value as any)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="1month">Last Month</option>
                  <option value="3months">Last 3 Months</option>
                  <option value="6months">Last 6 Months</option>
                  <option value="1year">Last Year</option>
                </select>
              </div>

              {/* Mini Chart */}
              <div className="h-64 flex items-end gap-1 bg-gray-50 p-4 rounded">
                {trends.length > 0 ? (
                  trends.map((trend, index) => {
                    const maxDemand = Math.max(...trends.map((t) => t.demand));
                    const height = (trend.demand / maxDemand) * 100;

                    return (
                      <div key={index} className="flex-1 flex flex-col items-center group">
                        <div
                          className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all hover:opacity-80"
                          style={{ height: `${height}%` }}
                          title={`${trend.demand}% - ${new Date(trend.timestamp).toLocaleDateString()}`}
                        />
                        <p className="text-xs text-gray-600 mt-2 text-center">
                          {new Date(trend.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                          })}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500">No trend data available</p>
                )}
              </div>

              {/* Trend Details */}
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 font-medium">MONTH OVER MONTH</p>
                  <p className={`text-2xl font-bold mt-1 ${trends[trends.length - 1]?.monthOverMonth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {trends[trends.length - 1]?.monthOverMonth > 0 ? '+' : ''}
                    {trends[trends.length - 1]?.monthOverMonth.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 font-medium">YEAR OVER YEAR</p>
                  <p className="text-2xl font-bold mt-1 text-purple-600">
                    {trends[0] && trends[trends.length - 1] ? (((trends[trends.length - 1].demand - trends[0].demand) / trends[0].demand) * 100).toFixed(1) : '0'}%
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 font-medium">CURRENT DEMAND</p>
                  <p className="text-2xl font-bold mt-1 text-green-600">
                    {trends[trends.length - 1]?.demand}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow p-6 border border-blue-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Recommendations</h2>
            <ul className="space-y-3">
              {selectedSkillData.marketSaturation === 'low' && (
                <li className="flex items-start">
                  <span className="text-green-600 font-bold mr-3">✓</span>
                  <p className="text-gray-700">
                    <strong>High opportunity:</strong> This skill has low competition. Consider adding it to your profile.
                  </p>
                </li>
              )}
              {selectedSkillData.trendDirection === 'increasing' && (
                <li className="flex items-start">
                  <span className="text-green-600 font-bold mr-3">↑</span>
                  <p className="text-gray-700">
                    <strong>Growing demand:</strong> Demand is increasing. Investing in this skill now will pay off.
                  </p>
                </li>
              )}
              {selectedSkillData.averageSalaryLift > 15 && (
                <li className="flex items-start">
                  <span className="text-green-600 font-bold mr-3">💰</span>
                  <p className="text-gray-700">
                    <strong>High salary impact:</strong> Candidates with this skill earn {selectedSkillData.averageSalaryLift}% more.
                  </p>
                </li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};
