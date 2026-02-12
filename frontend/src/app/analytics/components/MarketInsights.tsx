'use client';

/**
 * Market Insights Component
 * Displays market insights and competitive intelligence
 */

import React, { useEffect, useState } from 'react';
import { analyticsService } from '../../../services/analytics/analyticsService';
import {
  MarketInsight,
  CompetitiveIntelligence,
  MarketAlert,
} from '../../../types/analytics.types';

type FilterTab = 'insights' | 'alerts' | 'competitors';

export const MarketInsights: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FilterTab>('insights');
  const [insights, setInsights] = useState<MarketInsight[]>([]);
  const [alerts, setAlerts] = useState<MarketAlert[]>([]);
  const [competitors, setCompetitors] = useState<CompetitiveIntelligence[]>([]);
  const [competitorList, setCompetitorList] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const DEMO_COMPETITORS = ['Google', 'LinkedIn', 'Indeed', 'Glassdoor'];

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const [insightsData] = await Promise.all([
        analyticsService.getMarketInsights(10),
      ]);
      setInsights(insightsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      setLoading(true);
      // Mock alerts - would come from API
      setAlerts([
        {
          id: '1',
          type: 'skill_emerging',
          severity: 'high',
          title: 'Rust Programming Language Surging',
          description: 'Demand for Rust has increased 45% in the last 3 months',
          affectedRoles: ['Backend Engineer', 'Systems Engineer'],
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          type: 'location_hot',
          severity: 'medium',
          title: 'Austin Tech Hub Growing',
          description: 'Tech job openings in Austin increased by 28% YoY',
          affectedRoles: ['Software Engineer', 'Data Scientist', 'Product Manager'],
          createdAt: new Date().toISOString(),
        },
      ]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const loadCompetitors = async () => {
    try {
      setLoading(true);
      const comps = competitorList
        ? competitorList.split(',').map((c) => c.trim())
        : DEMO_COMPETITORS;
      const competitorData = await analyticsService.getCompetitiveIntelligence(comps);
      setCompetitors(competitorData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load competitor data');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    if (tab === 'alerts' && alerts.length === 0) {
      loadAlerts();
    } else if (tab === 'competitors' && competitors.length === 0) {
      loadCompetitors();
    }
  };

  if (loading && insights.length === 0 && alerts.length === 0 && competitors.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Market Insights</h1>
        <p className="text-gray-600 mt-1">Stay informed about market trends and opportunities</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['insights', 'alerts', 'competitors'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="space-y-4">
          {insights.length === 0 ? (
            <p className="text-gray-500 py-8">No insights available</p>
          ) : (
            insights.map((insight) => (
              <div key={insight.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{insight.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                      {insight.category}
                    </span>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                      {Math.round(insight.relevance)}%
                    </span>
                  </div>
                </div>

                {insight.actionableItems && insight.actionableItems.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Action Items:</p>
                    <ul className="space-y-1">
                      {insight.actionableItems.map((item, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-start">
                          <span className="text-blue-600 mr-2">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-4">
                  {new Date(insight.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.length === 0 && !loading ? (
            <p className="text-gray-500 py-8">No market alerts</p>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg shadow p-6 border-l-4 ${
                  alert.severity === 'critical'
                    ? 'bg-red-50 border-red-500'
                    : alert.severity === 'high'
                      ? 'bg-orange-50 border-orange-500'
                      : 'bg-yellow-50 border-yellow-500'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900">{alert.title}</h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      alert.severity === 'critical'
                        ? 'bg-red-200 text-red-800'
                        : alert.severity === 'high'
                          ? 'bg-orange-200 text-orange-800'
                          : 'bg-yellow-200 text-yellow-800'
                    }`}
                  >
                    {alert.severity.toUpperCase()}
                  </span>
                </div>

                <p className="text-gray-700 mb-3">{alert.description}</p>

                {alert.affectedRoles && alert.affectedRoles.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Affected Roles:</p>
                    <div className="flex flex-wrap gap-2">
                      {alert.affectedRoles.map((role) => (
                        <span key={role} className="px-3 py-1 rounded-full text-sm bg-white bg-opacity-60">
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Competitors Tab */}
      {activeTab === 'competitors' && (
        <div className="space-y-6">
          {/* Competitor Input */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Analyze Competitors</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={competitorList}
                onChange={(e) => setCompetitorList(e.target.value)}
                placeholder="Enter competitor names (comma-separated)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={loadCompetitors}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
              >
                {loading ? 'Loading...' : 'Analyze'}
              </button>
            </div>
          </div>

          {/* Competitors Grid */}
          {competitors.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {competitors.map((comp) => (
                <div key={comp.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">{comp.competitorName}</h3>

                  <div className="space-y-3">
                    {/* Salary Comparison */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                      <p className="text-gray-700">Salary Comparison</p>
                      <span
                        className={`font-semibold ${
                          comp.salaryComparison > 0 ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {comp.salaryComparison > 0 ? '+' : ''}{comp.salaryComparison.toFixed(1)}%
                      </span>
                    </div>

                    {/* Hiring Pace */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                      <p className="text-gray-700">Hiring Pace</p>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          comp.hiringPace === 'fast'
                            ? 'bg-red-100 text-red-800'
                            : comp.hiringPace === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {comp.hiringPace.toUpperCase()}
                      </span>
                    </div>

                    {/* Growth Rate */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                      <p className="text-gray-700">Growth Rate</p>
                      <span className="font-semibold text-blue-600">+{comp.growthRate.toFixed(1)}%</span>
                    </div>

                    {/* Employee Satisfaction */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                      <p className="text-gray-700">Employee Satisfaction</p>
                      <span className="font-semibold text-gray-900">{comp.employeeSatisfaction.toFixed(1)}/5</span>
                    </div>

                    {/* Turnover Rate */}
                    <div className="flex items-center justify-between">
                      <p className="text-gray-700">Turnover Rate</p>
                      <span className="font-semibold text-gray-900">{comp.turnoverRate.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Benefits */}
                  {comp.beneftisComparison && comp.beneftisComparison.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Benefits:</p>
                      <div className="flex flex-wrap gap-2">
                        {comp.beneftisComparison.slice(0, 3).map((benefit, idx) => (
                          <span key={idx} className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            {benefit}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
