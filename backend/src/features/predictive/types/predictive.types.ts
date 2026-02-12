import { z } from 'zod';

// ============= ENUMS =============

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export enum ResourceType {
  COURSE = 'course',
  BOOK = 'book',
  TUTORIAL = 'tutorial',
  CERTIFICATION = 'certification',
  PROJECT = 'project',
  MENTORSHIP = 'mentorship',
}

export enum BiasType {
  GENDER = 'gender',
  AGE = 'age',
  ETHNICITY = 'ethnicity',
  EDUCATION = 'education',
  EXPERIENCE = 'experience',
  LOCATION = 'location',
}

export enum PriorityLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum TrendDirection {
  UP = 'up',
  DOWN = 'down',
  STABLE = 'stable',
}

// ============= INTERFACES =============

export interface MLFeatures {
  userSkills: string[];
  experienceLevel: number;
  yearsOfExperience: number;
  targetRole: string;
  industryPreferences: string[];
  salaryExpectation: number;
  workStyle: string;
  learningStyle: string;
  certifications: string[];
  projectExperience: Record<string, number>;
}

export interface SkillGap {
  skill: string;
  currentLevel: number;
  requiredLevel: number;
  gap: number;
  priority: PriorityLevel;
  recommendedResources: string[];
  estimatedTimeToLearn: number;
}

export interface LearningResource {
  type: ResourceType;
  title: string;
  provider: string;
  duration: number;
  cost: number;
  rating: number;
  url?: string;
}

export interface SkillRecommendation {
  skill: string;
  relevanceScore: number;
  difficulty: DifficultyLevel;
  marketDemand: number;
  salaryBoost: number;
  learningResources: LearningResource[];
  prerequisiteSkills: string[];
  timeToMastery: number;
}

export interface CareerPathStep {
  step: number;
  role: string;
  duration: number;
  skillsToLearn: string[];
  salary: number;
}

export interface RolePrediction {
  role: string;
  probability: number;
  yearToAchieve: number;
  requiredSkills: string[];
  salary: number;
}

export interface CareerPrediction {
  userId: string;
  currentRole: string;
  predictedRoles: RolePrediction[];
  careerPath: CareerPathStep[];
  confidenceScore: number;
  generatedAt: string;
}

export interface CareerInsight {
  userId: string;
  insight: string;
  confidence: number;
  actionItems: string[];
  expectedOutcome: string;
}

export interface SalaryInsight {
  currentSalary: number;
  marketMedian: number;
  percentile: number;
  potentialIncrease: number;
  benchmarks: Array<{
    role: string;
    salary: number;
    yearsExperience: number;
  }>;
}

export interface AffectedGroup {
  group: string;
  percentage: number;
  impact: number;
}

export interface MetricBias {
  metricName: string;
  biasType: BiasType;
  detectedBias: boolean;
  biasScore: number;
  affectedGroups: AffectedGroup[];
  recommendations: string[];
}

export interface BiasRecommendation {
  priority: PriorityLevel;
  action: string;
  expectedImpact: string;
  implementationEffort: 'low' | 'medium' | 'high';
}

export interface BiasReport {
  reportId: string;
  generatedAt: string;
  totalMetricsAnalyzed: number;
  biasesDetected: number;
  overallBiasScore: number;
  recommendations: string[];
  actionItems: BiasRecommendation[];
}

export interface AnalyticsMetric {
  name: string;
  value: number;
  trend: TrendDirection;
  trendPercentage: number;
  lastUpdated: string;
}

export interface PredictionAccuracy {
  metricName: string;
  predictedValue: number;
  actualValue: number;
  accuracy: number;
  timeframe: string;
}

export interface RecommendationMetrics {
  skill: string;
  recommendationFrequency: number;
  adoptionRate: number;
  learnerSatisfaction: number;
  salaryImpact: number;
  timeToAdoption: number;
}

export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  usersWithPredictions: number;
  averageConfidenceScore: number;
  topRecommendedSkills: string[];
  predictionAccuracy: number;
  userSatisfactionScore: number;
  avgTimeToUpskill: number;
}

export interface UserAnalytics {
  predictions: CareerPrediction | null;
  skillRecommendations: SkillRecommendation[];
  skillGaps: SkillGap[];
  progressMetrics: AnalyticsMetric[];
}

// ============= REQUEST/RESPONSE DTOs =============

export interface GetRecommendationsRequest {
  userId: string;
  topN?: number;
  industryFilter?: string[];
}

export interface SkillGapsRequest {
  userId: string;
  targetRole?: string;
}

export interface CareerPathRequest {
  userId: string;
  horizonYears?: number;
}

export interface BiasReportRequest {
  includedMetrics?: BiasType[];
  includeActionItems?: boolean;
}

export interface PredictionAccuracyRequest {
  userId: string;
  metricName: string;
  predictedValue: number;
}

// ============= ZOD SCHEMAS =============

export const GetRecommendationsSchema = z.object({
  userId: z.string().uuid(),
  topN: z.number().int().min(1).max(50).optional().default(10),
  industryFilter: z.array(z.string()).optional(),
});

export const SkillGapsSchema = z.object({
  userId: z.string().uuid(),
  targetRole: z.string().optional(),
});

export const CareerPathSchema = z.object({
  userId: z.string().uuid(),
  horizonYears: z.number().int().min(1).max(30).optional().default(10),
});

export const BiasReportSchema = z.object({
  includedMetrics: z
    .array(z.enum(['gender', 'age', 'ethnicity', 'education', 'experience', 'location']))
    .optional(),
  includeActionItems: z.boolean().optional().default(true),
});

export const PredictionAccuracySchema = z.object({
  userId: z.string().uuid(),
  metricName: z.string().min(1).max(100),
  predictedValue: z.number(),
});

export const AnalyticsFilterSchema = z.object({
  userId: z.string().uuid().optional(),
  timeframe: z.enum(['day', 'week', 'month', 'quarter', 'year']).optional(),
  metric: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// ============= TYPE EXPORTS =============

export type GetRecommendationsRequest = z.infer<typeof GetRecommendationsSchema>;
export type SkillGapsRequest = z.infer<typeof SkillGapsSchema>;
export type CareerPathRequest = z.infer<typeof CareerPathSchema>;
export type BiasReportRequest = z.infer<typeof BiasReportSchema>;
export type PredictionAccuracyRequest = z.infer<typeof PredictionAccuracySchema>;
export type AnalyticsFilter = z.infer<typeof AnalyticsFilterSchema>;
