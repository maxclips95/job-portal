import { z } from 'zod';

// ============= REQUEST VALIDATORS =============

/**
 * Validate request for skill recommendations
 */
export const SkillRecommendationRequestSchema = z.object({
  userId: z
    .string()
    .uuid('Invalid user ID format')
    .describe('User ID for which to generate recommendations'),
  topN: z
    .number()
    .int()
    .min(1, 'Must request at least 1 skill')
    .max(50, 'Cannot request more than 50 skills')
    .optional()
    .default(10)
    .describe('Number of top recommendations to return'),
  industryFilter: z
    .array(z.string().min(1).max(100))
    .optional()
    .describe('Filter recommendations by industry preferences'),
  excludeCurrentSkills: z
    .boolean()
    .optional()
    .default(true)
    .describe('Exclude skills user already has'),
  minMarketDemand: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .default(40)
    .describe('Minimum market demand score (0-100)'),
});

/**
 * Validate request for skill gap analysis
 */
export const SkillGapsRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  targetRole: z
    .string()
    .min(2)
    .max(100)
    .optional()
    .describe('Target role for gap analysis'),
  includeResources: z
    .boolean()
    .optional()
    .default(true)
    .describe('Include learning resource recommendations'),
  sortBy: z
    .enum(['priority', 'gap_size', 'time_to_learn', 'market_demand'])
    .optional()
    .default('priority'),
});

/**
 * Validate request for career path prediction
 */
export const CareerPathRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  horizonYears: z
    .number()
    .int()
    .min(1, 'Minimum horizon is 1 year')
    .max(30, 'Maximum horizon is 30 years')
    .optional()
    .default(5)
    .describe('How many years ahead to predict'),
  includeCompensation: z
    .boolean()
    .optional()
    .default(true),
  includeSkillRequirements: z
    .boolean()
    .optional()
    .default(true),
});

/**
 * Validate request for career insights
 */
export const CareerInsightsRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  focusArea: z
    .enum(['skill_gaps', 'market_trends', 'growth_opportunities', 'salary', 'all'])
    .optional()
    .default('all'),
  confidenceThreshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.6)
    .describe('Only return insights with confidence above threshold'),
});

/**
 * Validate request for bias report generation
 */
export const BiasReportRequestSchema = z.object({
  includedMetrics: z
    .array(
      z.enum(['gender', 'age', 'ethnicity', 'education', 'experience', 'location'], {
        errorMap: () => ({ message: 'Invalid bias metric type' }),
      })
    )
    .optional()
    .default(['gender', 'age', 'ethnicity', 'education', 'experience', 'location']),
  includeActionItems: z
    .boolean()
    .optional()
    .default(true)
    .describe('Include specific action items to address detected biases'),
  sampleSize: z
    .number()
    .int()
    .min(100)
    .max(1000000)
    .optional()
    .default(10000)
    .describe('Number of users to sample for analysis'),
});

/**
 * Validate request for salary insights
 */
export const SalaryInsightsRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  includeNegotiationTips: z.boolean().optional().default(true),
  includeBenefitsAnalysis: z.boolean().optional().default(true),
  includeGeographicComparison: z.boolean().optional().default(false),
});

/**
 * Validate analytics dashboard request
 */
export const AnalyticsDashboardRequestSchema = z.object({
  includeUserMetrics: z.boolean().optional().default(true),
  includePredictionQuality: z.boolean().optional().default(true),
  includeRecommendationMetrics: z.boolean().optional().default(true),
  timeframeMonths: z
    .number()
    .int()
    .min(1)
    .max(36)
    .optional()
    .default(12)
    .describe('Historical data to include (in months)'),
});

/**
 * Validate prediction accuracy tracking request
 */
export const PredictionAccuracyTrackingSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  metricName: z
    .string()
    .min(1, 'Metric name required')
    .max(100, 'Metric name too long')
    .describe('Name of the metric being tracked'),
  predictedValue: z
    .number()
    .describe('The predicted value'),
  accuracy: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe('Optional accuracy percentage'),
  notes: z
    .string()
    .max(500)
    .optional()
    .describe('Optional notes about the prediction'),
});

/**
 * Validate recommendation feedback request
 */
export const RecommendationFeedbackSchema = z.object({
  recommendationId: z
    .string()
    .uuid('Invalid recommendation ID format')
    .describe('ID of the recommendation being rated'),
  userId: z.string().uuid('Invalid user ID format'),
  skillName: z
    .string()
    .min(1)
    .max(100)
    .describe('Skill being recommended'),
  satisfaction: z
    .number()
    .min(1, 'Rating must be 1-5')
    .max(5, 'Rating must be 1-5')
    .int('Rating must be an integer')
    .describe('Satisfaction rating (1-5)'),
  adopted: z
    .boolean()
    .optional()
    .describe('Whether user is pursuing this skill'),
  daysToAdoption: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Days until user started learning the skill'),
  feedback: z
    .string()
    .max(1000)
    .optional()
    .describe('Detailed feedback text'),
});

/**
 * Validate learning path creation request
 */
export const LearningPathRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  targetSkills: z
    .array(z.string().min(1).max(100))
    .min(1, 'At least one target skill required')
    .max(20, 'Maximum 20 target skills'),
  currentLevel: z
    .number()
    .min(0, 'Level must be 0-5')
    .max(5, 'Level must be 0-5')
    .optional()
    .default(1)
    .describe('Current skill level (0-5)'),
  targetLevel: z
    .number()
    .min(1, 'Target level must be 1-5')
    .max(5, 'Target level must be 1-5')
    .optional()
    .default(5),
  timeCommitmentHoursPerWeek: z
    .number()
    .min(1)
    .max(60)
    .optional()
    .default(10)
    .describe('Hours per week available for learning'),
  learningStyle: z
    .enum(['visual', 'auditory', 'reading_writing', 'kinesthetic', 'mixed'])
    .optional()
    .default('mixed'),
  preferredResourceTypes: z
    .array(z.enum(['course', 'book', 'tutorial', 'certification', 'project', 'mentorship']))
    .optional()
    .describe('Preferred learning resource types'),
});

/**
 * Validate comparison request
 */
export const ComparisonRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  compareToRole: z.string().min(1).max(100),
  compareToIndustry: z.string().optional(),
  compareToLocation: z.string().optional(),
});

// ============= VALIDATION HELPERS =============

export class PredictiveValidator {
  /**
   * Validate and parse skill recommendation request
   */
  static validateSkillRecommendationRequest(data: unknown) {
    return SkillRecommendationRequestSchema.parse(data);
  }

  /**
   * Validate and parse skill gaps request
   */
  static validateSkillGapsRequest(data: unknown) {
    return SkillGapsRequestSchema.parse(data);
  }

  /**
   * Validate and parse career path request
   */
  static validateCareerPathRequest(data: unknown) {
    return CareerPathRequestSchema.parse(data);
  }

  /**
   * Validate and parse bias report request
   */
  static validateBiasReportRequest(data: unknown) {
    return BiasReportRequestSchema.parse(data);
  }

  /**
   * Validate feedback submission
   */
  static validateRecommendationFeedback(data: unknown) {
    return RecommendationFeedbackSchema.parse(data);
  }

  /**
   * Validate learning path request
   */
  static validateLearningPathRequest(data: unknown) {
    return LearningPathRequestSchema.parse(data);
  }

  /**
   * Validate prediction accuracy tracking
   */
  static validatePredictionAccuracy(data: unknown) {
    return PredictionAccuracyTrackingSchema.parse(data);
  }

  /**
   * Safe validation with error handling
   */
  static safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; error?: string } {
    try {
      const validated = schema.parse(data);
      return { success: true, data: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: error.errors[0].message };
      }
      return { success: false, error: 'Validation failed' };
    }
  }
}

// ============= TYPE EXPORTS =============

export type SkillRecommendationRequest = z.infer<typeof SkillRecommendationRequestSchema>;
export type SkillGapsRequest = z.infer<typeof SkillGapsRequestSchema>;
export type CareerPathRequest = z.infer<typeof CareerPathRequestSchema>;
export type CareerInsightsRequest = z.infer<typeof CareerInsightsRequestSchema>;
export type BiasReportRequest = z.infer<typeof BiasReportRequestSchema>;
export type SalaryInsightsRequest = z.infer<typeof SalaryInsightsRequestSchema>;
export type PredictionAccuracyTrackingRequest = z.infer<typeof PredictionAccuracyTrackingSchema>;
export type RecommendationFeedbackRequest = z.infer<typeof RecommendationFeedbackSchema>;
export type LearningPathRequest = z.infer<typeof LearningPathRequestSchema>;
export type ComparisonRequest = z.infer<typeof ComparisonRequestSchema>;
export type AnalyticsDashboardRequest = z.infer<typeof AnalyticsDashboardRequestSchema>;
