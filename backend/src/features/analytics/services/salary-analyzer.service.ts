/**
 * Salary Analyzer Service
 * Salary benchmarking, range analysis, and salary prediction
 */

import { Logger } from '../../../utils/logger';
import {
  SalaryRange,
  SalaryBenchmark,
  SalaryPrediction,
  SalaryTrend,
  AnalyticsFilter,
} from '../types/analytics.types';

export interface ISalaryAnalyzerService {
  getSalaryRange(jobRole: string, experience: string, location: string): Promise<SalaryRange>;
  getSalaryBenchmark(jobRole: string, experience: string, location: string): Promise<SalaryBenchmark>;
  predictSalary(jobRole: string, experience: string, location: string, skills?: string[]): Promise<SalaryPrediction>;
  getSalaryTrends(filter: AnalyticsFilter): Promise<SalaryTrend[]>;
  getSalaryStatistics(filter: AnalyticsFilter): Promise<{ average: number; median: number }>;
  getSkillSalaryLift(skill: string): Promise<number>;
  calculateSalaryTrendDirection(): Promise<'increasing' | 'decreasing' | 'stable'>;
}

/**
 * Salary Analyzer Service Implementation
 */
export class SalaryAnalyzerService implements ISalaryAnalyzerService {
  constructor(
    private repository: any, // IAnalyticsRepository
    private cache: any, // Redis client
  ) {}

  /**
   * Get salary range for a role
   */
  async getSalaryRange(
    jobRole: string,
    experience: string,
    location: string,
  ): Promise<SalaryRange> {
    const cacheKey = `salary-range:${jobRole}:${experience}:${location}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      Logger.info('Salary range cache hit', { cacheKey });
      return JSON.parse(cached);
    }

    Logger.info('Calculating salary range', { jobRole, experience, location });

    const salaries = await this.repository.getSalariesForRole(
      jobRole,
      experience,
      location,
    );

    if (salaries.length === 0) {
      // Return default range if no data
      Logger.warn('No salary data found, using defaults', { jobRole, experience, location });
      return this.getDefaultSalaryRange(experience);
    }

    // Sort salaries
    salaries.sort((a, b) => a - b);

    const min = salaries[0];
    const max = salaries[salaries.length - 1];
    const median = this.calculateMedian(salaries);
    const percentile25 = salaries[Math.floor(salaries.length * 0.25)];
    const percentile75 = salaries[Math.floor(salaries.length * 0.75)];

    const salaryRange: SalaryRange = {
      min,
      max,
      median,
      percentile25,
      percentile75,
      currency: 'USD',
    };

    // Cache for 24 hours
    await this.cache.setex(cacheKey, 86400, JSON.stringify(salaryRange));

    return salaryRange;
  }

  /**
   * Get comprehensive salary benchmark
   */
  async getSalaryBenchmark(
    jobRole: string,
    experience: string,
    location: string,
  ): Promise<SalaryBenchmark> {
    const cacheKey = `salary-benchmark:${jobRole}:${experience}:${location}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const salaryRange = await this.getSalaryRange(jobRole, experience, location);
    const sampleSize = await this.repository.getSalaryDatapointsCount(
      jobRole,
      experience,
      location,
    );

    // Calculate trend
    const previousRange = await this.getPreviousSalaryRange(
      jobRole,
      experience,
      location,
    );
    const trend = this.calculateTrend(previousRange.median, salaryRange.median);
    const trendPercentage = this.calculatePercentageChange(
      previousRange.median,
      salaryRange.median,
    );

    const benchmark: SalaryBenchmark = {
      id: `bench-${jobRole}-${experience}-${location}`,
      jobRole,
      experience: experience as any,
      location,
      salaryRange,
      sampleSize,
      lastUpdated: new Date(),
      trend,
      trendPercentage,
    };

    // Cache for 24 hours
    await this.cache.setex(cacheKey, 86400, JSON.stringify(benchmark));

    return benchmark;
  }

  /**
   * Predict salary based on multiple factors
   */
  async predictSalary(
    jobRole: string,
    experience: string,
    location: string,
    skills?: string[],
  ): Promise<SalaryPrediction> {
    Logger.info('Predicting salary', { jobRole, experience, location, skills });

    // Get base salary range
    const baseRange = await this.getSalaryRange(jobRole, experience, location);
    let predictedSalary = baseRange.median;

    // Experience factor (0.8 to 1.3)
    const experienceFactor = this.getExperienceFactor(experience);
    predictedSalary *= experienceFactor;

    // Location adjustment factor
    const locationFactor = await this.getLocationCostAdjustment(location);
    predictedSalary *= locationFactor;

    // Skills bonus
    let skillsBonus = 1;
    if (skills && skills.length > 0) {
      for (const skill of skills) {
        const skillLift = await this.getSkillSalaryLift(skill);
        skillsBonus += skillLift / 100; // Convert percentage to multiplier
      }
      // Cap skills bonus at 40%
      skillsBonus = Math.min(skillsBonus, 1.4);
    }
    predictedSalary *= skillsBonus;

    // Calculate confidence score
    const sampleSize = await this.repository.getSalaryDatapointsCount(
      jobRole,
      experience,
      location,
    );
    const confidence = Math.min(100, (sampleSize / 100) * 100);

    return {
      jobRole,
      experience,
      location,
      predictedSalary: Math.round(predictedSalary),
      confidence,
      factors: {
        experience: experienceFactor,
        location: locationFactor,
        skillsMatch: skillsBonus,
      },
    };
  }

  /**
   * Get salary trends over time
   */
  async getSalaryTrends(filter: AnalyticsFilter): Promise<SalaryTrend[]> {
    const cacheKey = `salary-trends:${JSON.stringify(filter)}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    Logger.info('Fetching salary trends', { filter });

    const trends = await this.repository.getSalaryTrends(filter);

    // Enrich with trend calculations
    const enriched = trends.map((trend, index) => {
      const previousTrend = index > 0 ? trends[index - 1] : null;
      return {
        ...trend,
        monthOverMonth: previousTrend
          ? this.calculatePercentageChange(previousTrend.average, trend.average)
          : 0,
        yearOverYear: 0, // Would need historical data
      };
    });

    // Cache for 24 hours
    await this.cache.setex(cacheKey, 86400, JSON.stringify(enriched));

    return enriched;
  }

  /**
   * Get salary statistics
   */
  async getSalaryStatistics(filter: AnalyticsFilter): Promise<{ average: number; median: number }> {
    const salaries = await this.repository.getSalariesWithFilter(filter);

    if (salaries.length === 0) {
      return { average: 0, median: 0 };
    }

    const average = salaries.reduce((a, b) => a + b, 0) / salaries.length;
    const median = this.calculateMedian(salaries);

    return { average, median };
  }

  /**
   * Get salary lift for a specific skill
   */
  async getSkillSalaryLift(skill: string): Promise<number> {
    const cacheKey = `skill-salary-lift:${skill}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return parseFloat(cached);
    }

    Logger.info('Calculating skill salary lift', { skill });

    const withSkill = await this.repository.getAverageSalaryWithSkill(skill);
    const withoutSkill = await this.repository.getAverageSalaryWithoutSkill(skill);

    const lift = ((withSkill - withoutSkill) / withoutSkill) * 100;

    // Cache for 30 days
    await this.cache.setex(cacheKey, 2592000, lift.toString());

    return Math.max(0, lift); // Ensure non-negative
  }

  /**
   * Calculate salary trend direction
   */
  async calculateSalaryTrendDirection(): Promise<'increasing' | 'decreasing' | 'stable'> {
    const filter: AnalyticsFilter = {
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
    };

    const trends = await this.getSalaryTrends(filter);

    if (trends.length < 2) return 'stable';

    const firstAvg = trends[0].average;
    const lastAvg = trends[trends.length - 1].average;
    const change = this.calculatePercentageChange(firstAvg, lastAvg);

    if (change > 2) return 'increasing';
    if (change < -2) return 'decreasing';
    return 'stable';
  }

  /**
   * Helper: Calculate median
   */
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Helper: Get experience factor
   */
  private getExperienceFactor(experience: string): number {
    const factors: Record<string, number> = {
      junior: 0.8,
      mid: 1.0,
      senior: 1.2,
      lead: 1.3,
    };
    return factors[experience] || 1.0;
  }

  /**
   * Helper: Get location cost adjustment
   */
  private async getLocationCostAdjustment(location: string): Promise<number> {
    const costOfLiving = await this.repository.getCostOfLiving(location);
    const baseCostOfLiving = await this.repository.getBaseCostOfLiving(); // USA average

    return costOfLiving / baseCostOfLiving;
  }

  /**
   * Helper: Calculate trend direction
   */
  private calculateTrend(previous: number, current: number): 'up' | 'down' | 'stable' {
    const change = this.calculatePercentageChange(previous, current);
    if (change > 1) return 'up';
    if (change < -1) return 'down';
    return 'stable';
  }

  /**
   * Helper: Calculate percentage change
   */
  private calculatePercentageChange(previous: number, current: number): number {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Helper: Get previous salary range
   */
  private async getPreviousSalaryRange(
    jobRole: string,
    experience: string,
    location: string,
  ): Promise<SalaryRange> {
    // Try to get from cache or historical data
    const cached = await this.cache.get(
      `salary-range-prev:${jobRole}:${experience}:${location}`,
    );

    if (cached) {
      return JSON.parse(cached);
    }

    // Return current as fallback
    return this.getSalaryRange(jobRole, experience, location);
  }

  /**
   * Helper: Get default salary range
   */
  private getDefaultSalaryRange(experience: string): SalaryRange {
    const defaults: Record<string, SalaryRange> = {
      junior: {
        min: 50000,
        max: 75000,
        median: 60000,
        percentile25: 55000,
        percentile75: 70000,
        currency: 'USD',
      },
      mid: {
        min: 75000,
        max: 120000,
        median: 95000,
        percentile25: 85000,
        percentile75: 110000,
        currency: 'USD',
      },
      senior: {
        min: 120000,
        max: 180000,
        median: 150000,
        percentile25: 135000,
        percentile75: 170000,
        currency: 'USD',
      },
      lead: {
        min: 150000,
        max: 250000,
        median: 200000,
        percentile25: 180000,
        percentile75: 230000,
        currency: 'USD',
      },
    };

    return defaults[experience] || defaults.mid;
  }
}
