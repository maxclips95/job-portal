/**
 * Analytics Aggregation Service
 * Aggregates job data, salary ranges, skill demand, and market metrics
 */

import { Logger } from '../../../utils/logger';
import {
  AggregatedAnalytics,
  HiringMetrics,
  SkillMetric,
  GeographicData,
  JobCategoryTrend,
  AnalyticsFilter,
  AnalyticsDashboard,
  MarketInsight,
  MarketAlert,
} from '../types/analytics.types';

export interface IAnalyticsAggregationService {
  aggregateMarketData(filter: AnalyticsFilter): Promise<AggregatedAnalytics>;
  generateDashboard(filter: AnalyticsFilter): Promise<AnalyticsDashboard>;
  getTopSkills(limit: number): Promise<SkillMetric[]>;
  getTopLocations(limit: number): Promise<GeographicData[]>;
  getTopJobRoles(limit: number): Promise<JobCategoryTrend[]>;
  getHiringMetrics(): Promise<HiringMetrics>;
  calculateMarketSentiment(): Promise<'positive' | 'neutral' | 'negative'>;
}

/**
 * Analytics Aggregation Service Implementation
 * Aggregates data from multiple sources into unified analytics view
 */
export class AnalyticsAggregationService implements IAnalyticsAggregationService {
  constructor(
    private repository: any, // IAnalyticsRepository
    private salaryService: any, // ISalaryAnalyzerService
    private trendService: any, // ITrendPredictorService
    private cache: any, // Redis client
  ) {}

  /**
   * Aggregate all market data based on filters
   */
  async aggregateMarketData(filter: AnalyticsFilter): Promise<AggregatedAnalytics> {
    const cacheKey = this.generateCacheKey('aggregate', filter);
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      Logger.info('Analytics cache hit', { cacheKey });
      return JSON.parse(cached);
    }

    Logger.info('Aggregating market data', { filter });

    const [
      totalJobs,
      totalApplications,
      uniqueSkills,
      uniqueLocations,
      salaryStats,
      topSkills,
      topLocations,
      topJobRoles,
      hiringMetrics,
      sentiment,
    ] = await Promise.all([
      this.repository.getTotalJobs(filter),
      this.repository.getTotalApplications(filter),
      this.repository.getUniqueSkillsCount(filter),
      this.repository.getUniqueLocationsCount(filter),
      this.salaryService.getSalaryStatistics(filter),
      this.getTopSkills(10),
      this.getTopLocations(10),
      this.getTopJobRoles(10),
      this.getHiringMetrics(),
      this.calculateMarketSentiment(),
    ]);

    const aggregated: AggregatedAnalytics = {
      period: this.getPeriodString(filter),
      totalJobs,
      totalApplications,
      uniqueSkills,
      uniqueLocations,
      averageSalary: salaryStats.average,
      medianSalary: salaryStats.median,
      topSkills,
      topLocations,
      topJobRoles,
      hiringMetrics,
      marketSentiment: sentiment,
    };

    // Cache for 6 hours
    await this.cache.setex(cacheKey, 21600, JSON.stringify(aggregated));

    return aggregated;
  }

  /**
   * Generate comprehensive analytics dashboard
   */
  async generateDashboard(filter: AnalyticsFilter): Promise<AnalyticsDashboard> {
    const cacheKey = `dashboard:${this.generateCacheKey('', filter)}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      Logger.info('Dashboard cache hit', { cacheKey });
      return JSON.parse(cached);
    }

    Logger.info('Generating analytics dashboard', { filter });

    const [
      summary,
      salaryTrends,
      skillTrends,
      hiringTrends,
      locationTrends,
      insights,
      alerts,
    ] = await Promise.all([
      this.aggregateMarketData(filter),
      this.trendService.getSalaryTrends(filter),
      this.trendService.getSkillTrends(filter),
      this.trendService.getHiringTrends(filter),
      this.trendService.getLocationTrends(filter),
      this.repository.getInsights(filter),
      this.repository.getAlerts(),
    ]);

    const dashboard: AnalyticsDashboard = {
      summary,
      salaryTrends,
      skillTrends,
      hiringTrends,
      locationTrends,
      insights,
      alerts,
      generatedAt: new Date(),
    };

    // Cache for 4 hours
    await this.cache.setex(cacheKey, 14400, JSON.stringify(dashboard));

    return dashboard;
  }

  /**
   * Get top skills by demand
   */
  async getTopSkills(limit: number = 20): Promise<SkillMetric[]> {
    const cacheKey = `top-skills:${limit}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const skills = await this.repository.getTopSkillsByDemand(limit);
    
    // Calculate additional metrics for each skill
    const enriched = await Promise.all(
      skills.map(async (skill) => ({
        ...skill,
        averageSalaryLift: await this.salaryService.getSkillSalaryLift(skill.skill),
        marketSaturation: await this.calculateMarketSaturation(skill.skill),
      })),
    );

    // Cache for 12 hours
    await this.cache.setex(cacheKey, 43200, JSON.stringify(enriched));

    return enriched;
  }

  /**
   * Get top locations by job volume
   */
  async getTopLocations(limit: number = 20): Promise<GeographicData[]> {
    const cacheKey = `top-locations:${limit}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const locations = await this.repository.getTopLocationsByVolume(limit);

    // Enrich with additional data
    const enriched = await Promise.all(
      locations.map(async (location) => ({
        ...location,
        costOfLiving: await this.repository.getCostOfLiving(location.location),
        salaryToCoLRatio: location.salaryAverage / (await this.repository.getCostOfLiving(location.location)),
        relocationIncentives: await this.repository.getRelocationIncentives(location.location),
      })),
    );

    // Cache for 24 hours
    await this.cache.setex(cacheKey, 86400, JSON.stringify(enriched));

    return enriched;
  }

  /**
   * Get top job roles/categories
   */
  async getTopJobRoles(limit: number = 20): Promise<JobCategoryTrend[]> {
    const cacheKey = `top-roles:${limit}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const roles = await this.repository.getTopJobRolesByVolume(limit);

    const enriched = await Promise.all(
      roles.map(async (role) => ({
        ...role,
        demandScore: await this.calculateDemandScore(role.category),
        avgTimeToHire: await this.repository.getAverageTimeToHire(role.category),
      })),
    );

    // Cache for 24 hours
    await this.cache.setex(cacheKey, 86400, JSON.stringify(enriched));

    return enriched;
  }

  /**
   * Get overall hiring metrics
   */
  async getHiringMetrics(): Promise<HiringMetrics> {
    const cacheKey = 'hiring-metrics';
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const [
      totalJobPostings,
      activeJobsCount,
      closedJobsCount,
      averageTimeToFill,
    ] = await Promise.all([
      this.repository.getTotalJobPostings(),
      this.repository.getActiveJobsCount(),
      this.repository.getClosedJobsCount(),
      this.repository.getAverageTimeToFill(),
    ]);

    // Calculate conversion rates
    const totalApplications = await this.repository.getTotalApplications({});
    const shortlistedCount = await this.repository.getShortlistedCount();
    const offersCount = await this.repository.getOffersCount();
    const acceptedOffersCount = await this.repository.getAcceptedOffersCount();

    const metrics: HiringMetrics = {
      totalJobPostings,
      activeJobsCount,
      closedJobsCount,
      averageTimeToFill,
      applicationRate: (totalApplications / totalJobPostings) * 100,
      interviewRate: (shortlistedCount / totalApplications) * 100,
      offerRate: (offersCount / shortlistedCount) * 100,
      acceptanceRate: (acceptedOffersCount / offersCount) * 100,
    };

    // Cache for 6 hours
    await this.cache.setex(cacheKey, 21600, JSON.stringify(metrics));

    return metrics;
  }

  /**
   * Calculate overall market sentiment
   */
  async calculateMarketSentiment(): Promise<'positive' | 'neutral' | 'negative'> {
    const [
      hiringTrend,
      salaryTrend,
      skillDemandTrend,
    ] = await Promise.all([
      this.trendService.calculateHiringTrendDirection(),
      this.salaryService.calculateSalaryTrendDirection(),
      this.trendService.calculateSkillDemandTrendDirection(),
    ]);

    // Simple sentiment calculation
    const positiveFactors = [
      hiringTrend === 'increasing' ? 1 : 0,
      salaryTrend === 'increasing' ? 1 : 0,
      skillDemandTrend === 'increasing' ? 1 : 0,
    ].reduce((a, b) => a + b, 0);

    if (positiveFactors >= 2) return 'positive';
    if (positiveFactors === 1) return 'neutral';
    return 'negative';
  }

  /**
   * Helper: Generate cache key
   */
  private generateCacheKey(prefix: string, filter: AnalyticsFilter): string {
    const parts = [
      prefix,
      filter.jobRole || 'all',
      filter.location || 'all',
      filter.experience || 'all',
      filter.industry || 'all',
    ].filter(Boolean);
    return `analytics:${parts.join(':')}}`;
  }

  /**
   * Helper: Get period string from filter
   */
  private getPeriodString(filter: AnalyticsFilter): string {
    if (filter.startDate && filter.endDate) {
      return `${filter.startDate.toISOString()} - ${filter.endDate.toISOString()}`;
    }
    return `Last ${filter.timeframe || '3'} months`;
  }

  /**
   * Helper: Calculate market saturation for a skill
   */
  private async calculateMarketSaturation(
    skill: string,
  ): Promise<'low' | 'medium' | 'high'> {
    const demand = await this.repository.getSkillDemand(skill);
    const supplyIndicator = await this.repository.getCandidatesWithSkill(skill);

    const ratio = supplyIndicator / demand;
    if (ratio < 0.5) return 'low';
    if (ratio > 2) return 'high';
    return 'medium';
  }

  /**
   * Helper: Calculate demand score
   */
  private async calculateDemandScore(jobRole: string): Promise<number> {
    const jobCount = await this.repository.getJobCountForRole(jobRole);
    const avgJobCount = await this.repository.getAverageJobCountAcrossRoles();

    return Math.min(100, (jobCount / avgJobCount) * 100);
  }
}
