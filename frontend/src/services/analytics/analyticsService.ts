/**
 * Analytics API Service
 * Client-side service for analytics API integration
 */

import {
  AggregatedAnalytics,
  AnalyticsDashboard,
  SalaryRange,
  SalaryBenchmark,
  SalaryPrediction,
  SkillTrend,
  HiringTrend,
  LocationTrend,
  MarketInsight,
  CompetitiveIntelligence,
  CustomReport,
  ReportExport,
  AnalyticsFilter,
} from '../../../types/analytics.types';

export interface AnalyticsServiceType {
  // Dashboard
  getDashboard(filter?: AnalyticsFilter): Promise<AnalyticsDashboard>;
  aggregateMarketData(filter?: AnalyticsFilter): Promise<AggregatedAnalytics>;

  // Salary Analytics
  getSalaryRange(jobRole: string, experience: string, location: string): Promise<SalaryRange>;
  getSalaryBenchmark(jobRole: string, experience: string, location: string): Promise<SalaryBenchmark>;
  predictSalary(jobRole: string, experience: string, location: string, skills?: string[]): Promise<SalaryPrediction>;
  getSalaryTrends(filter?: AnalyticsFilter): Promise<SkillTrend[]>;

  // Skill Analytics
  getTopSkills(limit?: number): Promise<any[]>;
  getSkillTrends(filter?: AnalyticsFilter): Promise<SkillTrend[]>;

  // Hiring Analytics
  getHiringTrends(filter?: AnalyticsFilter): Promise<HiringTrend[]>;

  // Location Analytics
  getLocationTrends(filter?: AnalyticsFilter): Promise<LocationTrend[]>;
  getTopLocations(limit?: number): Promise<any[]>;

  // Insights
  getMarketInsights(limit?: number): Promise<MarketInsight[]>;
  getCompetitiveIntelligence(competitors: string[]): Promise<CompetitiveIntelligence[]>;

  // Reports
  generateCustomReport(title: string, sections: any[]): Promise<CustomReport>;
  exportReport(reportId: string, format: 'pdf' | 'csv' | 'json' | 'excel'): Promise<ReportExport>;
  exportAnalytics(type: string, format: string, filter?: AnalyticsFilter): Promise<Blob>;
}

const API_BASE = '/api/analytics';

/**
 * Analytics Service Implementation
 */
export const analyticsService: AnalyticsServiceType = {
  async getDashboard(filter?: AnalyticsFilter) {
    const response = await fetch(`${API_BASE}/dashboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filter || {}),
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to fetch dashboard');
    return response.json();
  },

  async aggregateMarketData(filter?: AnalyticsFilter) {
    const response = await fetch(`${API_BASE}/aggregate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filter || {}),
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to aggregate market data');
    return response.json();
  },

  async getSalaryRange(jobRole: string, experience: string, location: string) {
    const response = await fetch(
      `${API_BASE}/salary-range?jobRole=${jobRole}&experience=${experience}&location=${location}`,
      { credentials: 'include' },
    );

    if (!response.ok) throw new Error('Failed to fetch salary range');
    return response.json();
  },

  async getSalaryBenchmark(jobRole: string, experience: string, location: string) {
    const response = await fetch(
      `${API_BASE}/salary-benchmark?jobRole=${jobRole}&experience=${experience}&location=${location}`,
      { credentials: 'include' },
    );

    if (!response.ok) throw new Error('Failed to fetch salary benchmark');
    return response.json();
  },

  async predictSalary(jobRole: string, experience: string, location: string, skills?: string[]) {
    const response = await fetch(`${API_BASE}/predict-salary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobRole, experience, location, skills }),
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to predict salary');
    return response.json();
  },

  async getSalaryTrends(filter?: AnalyticsFilter) {
    const response = await fetch(`${API_BASE}/salary-trends`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filter || {}),
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to fetch salary trends');
    return response.json();
  },

  async getTopSkills(limit = 20) {
    const response = await fetch(`${API_BASE}/top-skills?limit=${limit}`, {
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to fetch top skills');
    return response.json();
  },

  async getSkillTrends(filter?: AnalyticsFilter) {
    const response = await fetch(`${API_BASE}/skill-trends`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filter || {}),
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to fetch skill trends');
    return response.json();
  },

  async getHiringTrends(filter?: AnalyticsFilter) {
    const response = await fetch(`${API_BASE}/hiring-trends`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filter || {}),
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to fetch hiring trends');
    return response.json();
  },

  async getLocationTrends(filter?: AnalyticsFilter) {
    const response = await fetch(`${API_BASE}/location-trends`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filter || {}),
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to fetch location trends');
    return response.json();
  },

  async getTopLocations(limit = 20) {
    const response = await fetch(`${API_BASE}/top-locations?limit=${limit}`, {
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to fetch top locations');
    return response.json();
  },

  async getMarketInsights(limit = 10) {
    const response = await fetch(`${API_BASE}/insights?limit=${limit}`, {
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to fetch market insights');
    return response.json();
  },

  async getCompetitiveIntelligence(competitors: string[]) {
    const response = await fetch(`${API_BASE}/competitive-intelligence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competitors }),
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to fetch competitive intelligence');
    return response.json();
  },

  async generateCustomReport(title: string, sections: any[]) {
    const response = await fetch(`${API_BASE}/report/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, sections }),
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to generate report');
    return response.json();
  },

  async exportReport(reportId: string, format: 'pdf' | 'csv' | 'json' | 'excel') {
    const response = await fetch(`${API_BASE}/report/export?reportId=${reportId}&format=${format}`, {
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to export report');
    return response.json();
  },

  async exportAnalytics(type: string, format: string, filter?: AnalyticsFilter) {
    const response = await fetch(`${API_BASE}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, format, filter: filter || {} }),
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to export analytics');
    return response.blob();
  },
};
