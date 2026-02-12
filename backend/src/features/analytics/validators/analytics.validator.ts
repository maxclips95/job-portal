/**
 * Analytics Validators
 * Input validation schemas using Zod
 */

import { z } from 'zod';

// ============================================================================
// SALARY ANALYTICS VALIDATORS
// ============================================================================

export const SalaryRangeSchema = z.object({
  min: z.number().positive('Min salary must be positive'),
  max: z.number().positive('Max salary must be positive'),
  median: z.number().positive('Median salary must be positive'),
  percentile25: z.number().nonnegative(),
  percentile75: z.number().nonnegative(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'INR']),
});

export const SalaryBenchmarkSchema = z.object({
  jobRole: z.string().min(2).max(100),
  experience: z.enum(['junior', 'mid', 'senior', 'lead']),
  location: z.string().min(2).max(100),
  salaryRange: SalaryRangeSchema,
  sampleSize: z.number().positive(),
  trend: z.enum(['up', 'down', 'stable']),
  trendPercentage: z.number().min(-100).max(100),
});

export const SalaryPredictionRequestSchema = z.object({
  jobRole: z.string().min(2).max(100),
  experience: z.enum(['junior', 'mid', 'senior', 'lead']),
  location: z.string().min(2).max(100),
  skills: z.array(z.string()).optional(),
  education: z.string().optional(),
});

// ============================================================================
// SKILL DEMAND VALIDATORS
// ============================================================================

export const SkillMetricSchema = z.object({
  skill: z.string().min(2).max(100),
  demand: z.number().min(0).max(100),
  growth: z.number().min(-100).max(100),
  averageSalaryLift: z.number().nonnegative(),
  jobCount: z.number().nonnegative(),
  trendDirection: z.enum(['increasing', 'decreasing', 'stable']),
  marketSaturation: z.enum(['low', 'medium', 'high']),
});

export const SkillTrendRequestSchema = z.object({
  skill: z.string().min(2).max(100),
  timeframe: z.enum(['1month', '3months', '6months', '1year']).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

// ============================================================================
// HIRING TRENDS VALIDATORS
// ============================================================================

export const HiringTrendRequestSchema = z.object({
  jobRole: z.string().min(2).max(100).optional(),
  location: z.string().min(2).max(100).optional(),
  industry: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  limit: z.number().min(1).max(100).default(50),
});

// ============================================================================
// GEOGRAPHIC ANALYSIS VALIDATORS
// ============================================================================

export const LocationFilterSchema = z.object({
  location: z.string().min(2).max(100),
  remoteOnly: z.boolean().optional(),
  salaryRange: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
  }).optional(),
});

export const GeographicAnalysisRequestSchema = z.object({
  locations: z.array(z.string().min(2).max(100)).min(1),
  includeRemote: z.boolean().default(true),
  timeframe: z.enum(['1month', '3months', '6months', '1year']).default('3months'),
});

// ============================================================================
// MARKET INSIGHTS VALIDATORS
// ============================================================================

export const MarketInsightRequestSchema = z.object({
  category: z.enum(['skill', 'location', 'salary', 'hiring', 'trend']).optional(),
  relevanceThreshold: z.number().min(0).max(100).default(70),
  limit: z.number().min(1).max(50).default(10),
});

export const CompetitiveIntelligenceRequestSchema = z.object({
  competitors: z.array(z.string().min(2)).min(1).max(10),
  metrics: z.array(z.enum(['salary', 'benefits', 'hiringPace', 'growth', 'satisfaction', 'turnover'])).optional(),
});

// ============================================================================
// CUSTOM REPORT VALIDATORS
// ============================================================================

export const ReportSectionSchema = z.object({
  title: z.string().min(2).max(200),
  type: z.enum(['salary', 'skills', 'trends', 'locations', 'insights']),
  visualizationType: z.enum(['chart', 'table', 'map', 'text']),
  filters: z.object({
    jobRole: z.string().optional(),
    location: z.string().optional(),
    timeframe: z.enum(['1month', '3months', '6months', '1year']).optional(),
  }).optional(),
});

export const CustomReportRequestSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().max(1000).optional(),
  sections: z.array(ReportSectionSchema).min(1).max(10),
  isPublic: z.boolean().default(false),
});

export const ReportExportRequestSchema = z.object({
  reportId: z.string().uuid('Invalid report ID'),
  format: z.enum(['pdf', 'csv', 'json', 'excel']),
  sections: z.array(z.string()).min(1).optional(),
});

// ============================================================================
// ANALYTICS EXPORT VALIDATORS
// ============================================================================

export const AnalyticsExportRequestSchema = z.object({
  type: z.enum(['salary', 'skills', 'trends', 'locations', 'all']),
  format: z.enum(['csv', 'json', 'excel']),
  filters: z.object({
    jobRole: z.string().optional(),
    location: z.string().optional(),
    experience: z.string().optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    minSalary: z.number().optional(),
    maxSalary: z.number().optional(),
  }).optional(),
});

// ============================================================================
// ALERT SUBSCRIPTION VALIDATORS
// ============================================================================

export const AlertSubscriptionSchema = z.object({
  type: z.enum(['skill_emerging', 'location_hot', 'salary_surge', 'market_shift']),
  jobRoles: z.array(z.string().min(2)).min(1).max(10),
  locations: z.array(z.string().min(2)).min(1).max(10),
  severity: z.array(z.enum(['low', 'medium', 'high', 'critical'])).optional(),
  email: z.string().email('Invalid email'),
  notificationMethod: z.enum(['email', 'in-app', 'both']).default('email'),
});

export const UpdateAlertSubscriptionSchema = AlertSubscriptionSchema.partial();

// ============================================================================
// PAGINATION & SORTING VALIDATORS
// ============================================================================

export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const SortingSchema = z.object({
  sortBy: z.enum(['salary', 'demand', 'growth', 'recent']).default('recent'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================================
// COMBINED FILTERS
// ============================================================================

export const AnalyticsFilterSchema = z.object({
  jobRole: z.string().optional(),
  location: z.string().optional(),
  experience: z.enum(['junior', 'mid', 'senior', 'lead']).optional(),
  industry: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  minSalary: z.number().nonnegative().optional(),
  maxSalary: z.number().positive().optional(),
  remoteOnly: z.boolean().optional(),
  ...PaginationSchema.shape,
  ...SortingSchema.shape,
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type SalaryRangeInput = z.infer<typeof SalaryRangeSchema>;
export type SalaryBenchmarkInput = z.infer<typeof SalaryBenchmarkSchema>;
export type SalaryPredictionRequest = z.infer<typeof SalaryPredictionRequestSchema>;
export type SkillMetricInput = z.infer<typeof SkillMetricSchema>;
export type SkillTrendRequest = z.infer<typeof SkillTrendRequestSchema>;
export type HiringTrendRequest = z.infer<typeof HiringTrendRequestSchema>;
export type LocationFilter = z.infer<typeof LocationFilterSchema>;
export type GeographicAnalysisRequest = z.infer<typeof GeographicAnalysisRequestSchema>;
export type MarketInsightRequest = z.infer<typeof MarketInsightRequestSchema>;
export type CompetitiveIntelligenceRequest = z.infer<typeof CompetitiveIntelligenceRequestSchema>;
export type ReportSection = z.infer<typeof ReportSectionSchema>;
export type CustomReportRequest = z.infer<typeof CustomReportRequestSchema>;
export type ReportExportRequest = z.infer<typeof ReportExportRequestSchema>;
export type AnalyticsExportRequest = z.infer<typeof AnalyticsExportRequestSchema>;
export type AlertSubscriptionInput = z.infer<typeof AlertSubscriptionSchema>;
export type UpdateAlertSubscription = z.infer<typeof UpdateAlertSubscriptionSchema>;
export type AnalyticsFilter = z.infer<typeof AnalyticsFilterSchema>;
