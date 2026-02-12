import { Knex } from 'knex';
import { knex as db } from '@/config/database';
import { redis } from '@/config/redis';
import { mlService } from './ml.service';

export interface AnalyticsMetric {
  name: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
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

export interface CareerInsight {
  userId: string;
  insight: string;
  confidence: number;
  actionItems: string[];
  expectedOutcome: string;
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

/**
 * AnalyticsService - Comprehensive analytics for predictive features
 * Tracks prediction accuracy, recommendation effectiveness, user engagement
 */
export class AnalyticsService {
  /**
   * Get comprehensive dashboard metrics
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const cacheKey = 'analytics:dashboard_metrics';
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [totalUsers, activeUsers, usersWithPredictions, predictions] = await Promise.all([
      db('users').count('* as count').first(),
      db('users').where('last_activity_at', '>', db.raw("NOW() - INTERVAL '30 days'")).count('* as count').first(),
      db('career_predictions').distinct('user_id').count('* as count').first(),
      db('career_predictions').select('confidence_score'),
    ]);

    const avgConfidence = predictions.length > 0 ? predictions.reduce((sum: number, p: any) => sum + p.confidence_score, 0) / predictions.length : 0;

    const topSkills = await db('skill_recommendations')
      .select('skill_name')
      .count('* as recommendation_count')
      .groupBy('skill_name')
      .orderBy('recommendation_count', 'desc')
      .limit(10);

    const metrics: DashboardMetrics = {
      totalUsers: totalUsers?.count || 0,
      activeUsers: activeUsers?.count || 0,
      usersWithPredictions: usersWithPredictions?.count || 0,
      averageConfidenceScore: Math.round(avgConfidence * 100) / 100,
      topRecommendedSkills: topSkills.map((s) => s.skill_name),
      predictionAccuracy: await this.calculateOverallAccuracy(),
      userSatisfactionScore: await this.calculateUserSatisfaction(),
      avgTimeToUpskill: 8,
    };

    // Cache for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(metrics));
    return metrics;
  }

  /**
   * Get detailed analytics for a specific user
   */
  async getUserAnalytics(userId: string): Promise<{
    predictions: any;
    skillRecommendations: any;
    skillGaps: any;
    progressMetrics: AnalyticsMetric[];
  }> {
    const [predictions, recommendations, gaps] = await Promise.all([
      db('career_predictions').where({ user_id: userId }).first(),
      mlService.recommendSkills(userId, 10),
      mlService.calculateSkillGaps(userId),
    ]);

    const userSkills = await db('user_skills').where({ user_id: userId });
    const skillProgress = await db('skill_progress').where({ user_id: userId }).orderBy('updated_at', 'desc').limit(10);

    const progressMetrics: AnalyticsMetric[] = skillProgress.map((p) => ({
      name: `${p.skill_name} Progress`,
      value: p.progress_percentage,
      trend: p.progress_percentage >= 50 ? 'up' : 'stable',
      trendPercentage: 5,
      lastUpdated: p.updated_at,
    }));

    return {
      predictions,
      skillRecommendations: recommendations,
      skillGaps: gaps,
      progressMetrics,
    };
  }

  /**
   * Track and measure prediction accuracy over time
   */
  async trackPredictionAccuracy(userId: string, metricName: string, predictedValue: number): Promise<PredictionAccuracy> {
    const actualValue = await this.getActualMetricValue(userId, metricName);
    const accuracy = this.calculateAccuracy(predictedValue, actualValue);

    // Store accuracy record
    await db('prediction_accuracy').insert({
      user_id: userId,
      metric_name: metricName,
      predicted_value: predictedValue,
      actual_value: actualValue,
      accuracy,
      recorded_at: new Date(),
    });

    return {
      metricName,
      predictedValue,
      actualValue,
      accuracy,
      timeframe: 'current',
    };
  }

  /**
   * Get recommendation performance metrics
   */
  async getRecommendationMetrics(skillName: string): Promise<RecommendationMetrics> {
    const cacheKey = `analytics:recommendation:${skillName}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [recommendations, adoptions, feedback, salaryData] = await Promise.all([
      db('skill_recommendations').where({ skill_name: skillName }).count('* as count').first(),
      db('skill_recommendations')
        .where({ skill_name: skillName })
        .innerJoin('user_skills', 'skill_recommendations.user_id', 'user_skills.user_id')
        .where('user_skills.skill_name', skillName)
        .count('* as count')
        .first(),
      db('recommendation_feedback').where({ skill_name: skillName }).avg('satisfaction_score').first(),
      db('salary_data').where('key_skills', 'ilike', `%${skillName}%`).avg('salary').first(),
    ]);

    const metrics: RecommendationMetrics = {
      skill: skillName,
      recommendationFrequency: recommendations?.count || 0,
      adoptionRate: recommendations?.count > 0 ? ((adoptions?.count || 0) / recommendations.count) * 100 : 0,
      learnerSatisfaction: feedback?.avg || 0,
      salaryImpact: (salaryData?.avg || 0) - 50000,
      timeToAdoption: 6,
    };

    // Cache for 24 hours
    await redis.setex(cacheKey, 86400, JSON.stringify(metrics));
    return metrics;
  }

  /**
   * Generate career insights based on user data
   */
  async generateCareerInsights(userId: string): Promise<CareerInsight[]> {
    const prediction = await db('career_predictions').where({ user_id: userId }).first();
    const gaps = await mlService.calculateSkillGaps(userId);
    const recommendations = await mlService.recommendSkills(userId, 5);
    const user = await db('users').where({ id: userId }).first();

    const insights: CareerInsight[] = [];

    // Insight 1: Skill gap opportunity
    if (gaps.length > 0) {
      const criticalGaps = gaps.filter((g) => g.priority === 'critical');
      if (criticalGaps.length > 0) {
        insights.push({
          userId,
          insight: `You have ${criticalGaps.length} critical skill gaps that are blocking career growth. Focus on ${criticalGaps[0].skill} first to accelerate progress.`,
          confidence: 0.85,
          actionItems: [
            `Start learning ${criticalGaps[0].skill}`,
            `Allocate 10+ hours per week`,
            `Complete recommended courses`,
          ],
          expectedOutcome: `Master skill in ${criticalGaps[0].estimatedTimeToLearn} hours`,
        });
      }
    }

    // Insight 2: High-demand skills
    const highDemandSkills = recommendations.filter((r) => r.marketDemand > 80);
    if (highDemandSkills.length > 0) {
      insights.push({
        userId,
        insight: `The market is actively seeking ${highDemandSkills[0].skill} expertise. Learning this could increase your earning potential by $${highDemandSkills[0].salaryBoost}.`,
        confidence: 0.78,
        actionItems: [
          `Explore learning resources for ${highDemandSkills[0].skill}`,
          `Join industry communities`,
          `Build portfolio projects`,
        ],
        expectedOutcome: `+$${highDemandSkills[0].salaryBoost} annual salary`,
      });
    }

    // Insight 3: Career progression path
    if (prediction) {
      const nextRole = prediction.predicted_roles?.[0];
      if (nextRole) {
        insights.push({
          userId,
          insight: `Based on current trajectory, you're on track for a ${nextRole.role} position within ${nextRole.year_to_achieve} years. Your estimated salary would reach $${nextRole.salary}.`,
          confidence: prediction.confidence_score / 100,
          actionItems: ['Focus on required skills', 'Seek mentorship', 'Take on stretch projects'],
          expectedOutcome: `Promotion to ${nextRole.role}`,
        });
      }
    }

    // Insight 4: Learning velocity
    const recentProgress = await db('skill_progress').where({ user_id: userId }).where('updated_at', '>', db.raw("NOW() - INTERVAL '30 days'")).count('* as count').first();
    if ((recentProgress?.count || 0) > 5) {
      insights.push({
        userId,
        insight: `You're learning at an accelerated pace. Keep up the momentum and you could achieve your career goals 6 months faster.`,
        confidence: 0.72,
        actionItems: ['Maintain current learning schedule', 'Take on challenging projects', 'Mentor others'],
        expectedOutcome: '6-month acceleration in career growth',
      });
    }

    return insights.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get comparative salary insights
   */
  async getSalaryInsights(userId: string): Promise<{
    currentSalary: number;
    marketMedian: number;
    percentile: number;
    potentialIncrease: number;
    benchmarks: Array<{
      role: string;
      salary: number;
      yearsExperience: number;
    }>;
  }> {
    const user = await db('users').select('salary').where({ id: userId }).first();
    const userFeatures = await mlService.extractUserFeatures(userId);

    // Get market data for similar experience level
    const marketSalaries = await db('salary_data')
      .where('years_experience', '>=', Math.max(0, userFeatures.yearsOfExperience - 1))
      .where('years_experience', '<=', userFeatures.yearsOfExperience + 1)
      .select('salary')
      .orderBy('salary', 'asc');

    const medianSalary = this.calculateMedian(marketSalaries.map((s) => s.salary));
    const percentile = this.calculatePercentile(user?.salary || 0, marketSalaries.map((s) => s.salary));

    // Get benchmarks for target role
    const benchmarks = await db('salary_data')
      .where('role', userFeatures.targetRole)
      .select('role', 'salary', 'years_experience')
      .orderBy('years_experience', 'asc')
      .limit(5);

    return {
      currentSalary: user?.salary || 0,
      marketMedian: medianSalary,
      percentile,
      potentialIncrease: medianSalary - (user?.salary || 0),
      benchmarks,
    };
  }

  /**
   * Calculate overall prediction accuracy
   */
  private async calculateOverallAccuracy(): Promise<number> {
    const accuracies = await db('prediction_accuracy').select('accuracy').limit(1000);
    if (accuracies.length === 0) return 0;
    return Math.round((accuracies.reduce((sum: number, a: any) => sum + a.accuracy, 0) / accuracies.length) * 100) / 100;
  }

  /**
   * Calculate user satisfaction with recommendations
   */
  private async calculateUserSatisfaction(): Promise<number> {
    const feedback = await db('recommendation_feedback').avg('satisfaction_score').first();
    return feedback?.avg ? Math.round(feedback.avg * 10) / 10 : 0;
  }

  /**
   * Get actual value for a metric
   */
  private async getActualMetricValue(userId: string, metricName: string): Promise<number> {
    // Implementation depends on metric type
    if (metricName.includes('salary')) {
      const user = await db('users').where({ id: userId }).select('salary').first();
      return user?.salary || 0;
    }
    if (metricName.includes('promotion')) {
      const roles = await db('user_roles').where({ user_id: userId }).orderBy('started_at', 'desc').limit(2);
      return roles.length > 1 ? 1 : 0;
    }
    return 0;
  }

  /**
   * Calculate accuracy between predicted and actual values
   */
  private calculateAccuracy(predicted: number, actual: number): number {
    if (actual === 0) return 100;
    const error = Math.abs(predicted - actual) / actual;
    return Math.max(0, Math.round((1 - error) * 100));
  }

  /**
   * Calculate median of array
   */
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Calculate percentile rank
   */
  private calculatePercentile(value: number, values: number[]): number {
    const count = values.filter((v) => v <= value).length;
    return Math.round((count / Math.max(values.length, 1)) * 100);
  }
}

export const analyticsService = new AnalyticsService();
