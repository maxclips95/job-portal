export interface AnalyticsFilter {
  startDate?: Date | string;
  endDate?: Date | string;
  location?: string;
  jobRole?: string;
  experience?: string;
  skills?: string[];
  [key: string]: unknown;
}

export interface TopSkill {
  skill: string;
  demand: number;
  jobCount: number;
  averageSalaryLift: number;
  trendDirection: 'increasing' | 'stable' | 'decreasing';
  marketSaturation: 'low' | 'medium' | 'high';
}

export interface TopLocation {
  location: string;
  jobCount: number;
  salaryAverage: number;
}

export interface TopJobRole {
  category: string;
  volume: number;
  growth: number;
}

export interface HiringMetrics {
  applicationRate: number;
  interviewRate: number;
  offerRate: number;
  acceptanceRate: number;
}

export interface AnalyticsSummary {
  totalJobs: number;
  totalApplications: number;
  averageSalary: number;
  medianSalary: number;
  uniqueSkills: number;
  uniqueLocations: number;
  period: string;
  marketSentiment: 'positive' | 'neutral' | 'negative' | string;
  topSkills: TopSkill[];
  topLocations: TopLocation[];
  topJobRoles: TopJobRole[];
  hiringMetrics: HiringMetrics;
  totalUsers?: number;
}

export interface MarketInsight {
  id: string;
  title: string;
  description: string;
  category: string;
  relevance: number;
  severity?: 'low' | 'medium' | 'high' | 'critical' | string;
  actionableItems?: string[];
  createdAt: string;
}

export interface AnalyticsDashboard {
  summary: AnalyticsSummary;
  insights: MarketInsight[];
}

export interface AggregatedAnalytics {
  totals: {
    totalJobs: number;
    totalApplications: number;
  };
  topSkills: TopSkill[];
  topLocations: TopLocation[];
  insights: MarketInsight[];
}

export interface SalaryRange {
  min: number;
  max: number;
  median: number;
  percentile25: number;
  percentile75: number;
}

export interface SalaryBenchmark {
  trend: 'up' | 'down' | 'stable' | string;
  trendPercentage: number;
  sampleSize: number;
  lastUpdated: string;
}

export interface SalaryPrediction {
  predictedSalary: number;
  confidence: number;
  factors: {
    experience: number;
    location: number;
    skillsMatch: number;
  };
}

export interface SkillTrend {
  skill: string;
  demand: number;
  timestamp: string;
  monthOverMonth: number;
}

export interface HiringTrend {
  month: string;
  openings: number;
  applications: number;
}

export interface LocationTrend {
  location: string;
  jobCount: number;
  salaryAverage: number;
}

export interface CompetitiveIntelligence {
  id: string;
  competitorName: string;
  salaryComparison: number;
  hiringPace: 'fast' | 'medium' | 'slow' | string;
  growthRate: number;
  employeeSatisfaction: number;
  turnoverRate: number;
  beneftisComparison?: string[];
}

export interface CustomReport {
  id: string;
  title: string;
  sections: Array<{
    title: string;
    type: string;
    visualizationType?: string;
  }>;
  createdAt: string;
  status: 'ready' | 'pending' | 'failed' | string;
}

export interface ReportExport {
  reportId: string;
  format: 'pdf' | 'csv' | 'json' | 'excel' | string;
  downloadUrl: string;
}

export interface MarketAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | string;
  title: string;
  description: string;
  affectedRoles?: string[];
  createdAt: string;
}
