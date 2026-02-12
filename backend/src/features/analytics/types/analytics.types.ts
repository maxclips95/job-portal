/**
 * Analytics Types & Interfaces
 * Comprehensive type definitions for market analytics features
 */

// ============================================================================
// 1. SALARY ANALYTICS TYPES
// ============================================================================

export interface SalaryRange {
  min: number;
  max: number;
  median: number;
  percentile25: number;
  percentile75: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'INR';
}

export interface SalaryBenchmark {
  id: string;
  jobRole: string;
  experience: string; // junior, mid, senior, lead
  location: string;
  salaryRange: SalaryRange;
  sampleSize: number;
  lastUpdated: Date;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export interface SalaryTrend {
  jobRole: string;
  timestamp: Date;
  average: number;
  median: number;
  dataPoints: number;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  changePercentage: number;
}

export interface SalaryPrediction {
  jobRole: string;
  experience: string;
  location: string;
  predictedSalary: number;
  confidence: number; // 0-100
  factors: {
    experience: number;
    location: number;
    skillsMatch: number;
  };
}

// ============================================================================
// 2. SKILL DEMAND TYPES
// ============================================================================

export interface SkillMetric {
  skill: string;
  demand: number; // 0-100
  growth: number; // percentage
  averageSalaryLift: number; // how much extra salary this skill adds
  jobCount: number;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  marketSaturation: 'low' | 'medium' | 'high';
}

export interface SkillTrend {
  skill: string;
  timestamp: Date;
  demand: number;
  monthOverMonth: number; // percentage change
  yearOverYear: number;
  jobPostings: number;
  averageSalaryImpact: number;
}

export interface SkillCluster {
  primarySkill: string;
  relatedSkills: string[];
  clusterName: string;
  demandLevel: number;
  jobsRequired: number;
}

// ============================================================================
// 3. HIRING TRENDS TYPES
// ============================================================================

export interface HiringTrend {
  jobRole: string;
  location: string;
  timestamp: Date;
  hiringVolume: number;
  monthOverMonth: number;
  yearOverYear: number;
  topCompanies: string[];
  averageTimeToHire: number; // in days
  acceptanceRate: number; // percentage
}

export interface HiringMetrics {
  totalJobPostings: number;
  activeJobsCount: number;
  closedJobsCount: number;
  averageTimeToFill: number;
  applicationRate: number;
  interviewRate: number;
  offerRate: number;
  acceptanceRate: number;
}

export interface JobCategoryTrend {
  category: string;
  volume: number;
  growth: number;
  avgSalary: number;
  avgTimeToHire: number;
  demandScore: number; // 0-100
}

// ============================================================================
// 4. GEOGRAPHIC ANALYSIS TYPES
// ============================================================================

export interface GeographicData {
  location: string;
  salaryAverage: number;
  jobCount: number;
  demandIndex: number; // 0-100
  costOfLiving: number;
  salaryToCoLRatio: number;
  remoteJobPercentage: number;
  relocationIncentives: string[];
}

export interface LocationTrend {
  location: string;
  timestamp: Date;
  jobVolume: number;
  salaryAverage: number;
  demandGrowth: number;
  talentAvailability: number; // 0-100
  competitionLevel: 'low' | 'medium' | 'high';
}

export interface RemoteOpportunities {
  jobRole: string;
  remotePercentage: number;
  hybridPercentage: number;
  onSitePercentage: number;
  salaryDifferential: number; // percentage difference for remote
}

// ============================================================================
// 5. MARKET INSIGHTS TYPES
// ============================================================================

export interface MarketInsight {
  id: string;
  title: string;
  category: 'skill' | 'location' | 'salary' | 'hiring' | 'trend';
  description: string;
  relevance: number; // 0-100
  timeframe: string;
  actionableItems: string[];
  createdAt: Date;
  expiresAt: Date;
}

export interface CompetitiveIntelligence {
  id: string;
  competitorName: string;
  salaryComparison: number; // percentage difference
  beneftisComparison: string[];
  hiringPace: 'fast' | 'medium' | 'slow';
  growthRate: number;
  employeeSatisfaction: number; // 0-100
  turnoverRate: number;
}

export interface MarketAlert {
  id: string;
  type: 'skill_emerging' | 'location_hot' | 'salary_surge' | 'market_shift';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedRoles: string[];
  recommendation: string;
  createdAt: Date;
  expiresAt: Date;
}

// ============================================================================
// 6. ANALYTICS AGGREGATION TYPES
// ============================================================================

export interface AggregatedAnalytics {
  period: string;
  totalJobs: number;
  totalApplications: number;
  uniqueSkills: number;
  uniqueLocations: number;
  averageSalary: number;
  medianSalary: number;
  topSkills: SkillMetric[];
  topLocations: GeographicData[];
  topJobRoles: JobCategoryTrend[];
  hiringMetrics: HiringMetrics;
  marketSentiment: 'positive' | 'neutral' | 'negative';
}

export interface AnalyticsDashboard {
  summary: AggregatedAnalytics;
  salaryTrends: SalaryTrend[];
  skillTrends: SkillTrend[];
  hiringTrends: HiringTrend[];
  locationTrends: LocationTrend[];
  insights: MarketInsight[];
  alerts: MarketAlert[];
  generatedAt: Date;
}

// ============================================================================
// 7. PREDICTION TYPES
// ============================================================================

export interface PredictionModel {
  id: string;
  name: string;
  type: 'salary' | 'demand' | 'trend' | 'trend_forecast';
  accuracy: number; // 0-100
  lastTrained: Date;
  version: string;
  parameters: Record<string, unknown>;
}

export interface TrendForecast {
  skill?: string;
  location?: string;
  jobRole?: string;
  forecastPeriod: string; // next_3_months, next_6_months, next_year
  predictedDemand: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  factors: Record<string, number>;
}

// ============================================================================
// 8. ANALYTICS FILTERS & PARAMS
// ============================================================================

export interface AnalyticsFilter {
  jobRole?: string;
  location?: string;
  experience?: string;
  industry?: string;
  startDate?: Date;
  endDate?: Date;
  minSalary?: number;
  maxSalary?: number;
  remoteOnly?: boolean;
  sortBy?: 'salary' | 'demand' | 'growth' | 'recent';
}

export interface AnalyticsQuery {
  filter: AnalyticsFilter;
  pagination: {
    page: number;
    limit: number;
  };
  aggregationType?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

// ============================================================================
// 9. CUSTOM REPORT TYPES
// ============================================================================

export interface CustomReport {
  id: string;
  userId: string;
  title: string;
  description: string;
  sections: ReportSection[];
  generatedAt: Date;
  expiresAt: Date;
  isPublic: boolean;
  shareToken?: string;
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'salary' | 'skills' | 'trends' | 'locations' | 'insights';
  data: unknown;
  visualizationType: 'chart' | 'table' | 'map' | 'text';
}

export interface ReportExport {
  format: 'pdf' | 'csv' | 'json' | 'excel';
  sections: string[];
  fileName: string;
  url: string;
}

// ============================================================================
// 10. EXPORT & RESPONSE TYPES
// ============================================================================

export interface ExportData {
  type: 'salary' | 'skills' | 'trends' | 'locations' | 'all';
  format: 'csv' | 'json' | 'excel';
  filters: AnalyticsFilter;
  data: unknown[];
}

export interface AnalyticsResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
  metadata?: {
    dataPoints: number;
    generationTime: number;
    cacheStatus: 'hit' | 'miss';
  };
}

// ============================================================================
// 11. SUBSCRIPTION & ALERT TYPES
// ============================================================================

export interface AlertSubscription {
  id: string;
  userId: string;
  type: MarketAlert['type'];
  jobRoles: string[];
  locations: string[];
  severity: MarketAlert['severity'][];
  email: string;
  notificationMethod: 'email' | 'in-app' | 'both';
  isActive: boolean;
  createdAt: Date;
}

export interface AlertNotification {
  id: string;
  subscriptionId: string;
  alert: MarketAlert;
  sentAt: Date;
  readAt?: Date;
  actionTaken?: string;
}
