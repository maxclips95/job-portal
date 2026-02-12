/**
 * Trend Predictor Service
 * Skill trends, hiring trends, location trends, and trend forecasting
 */

import { Logger } from '../../../utils/logger';
import {
  SkillTrend,
  HiringTrend,
  LocationTrend,
  TrendForecast,
  AnalyticsFilter,
} from '../types/analytics.types';

export interface ITrendPredictorService {
  getSkillTrends(filter: AnalyticsFilter): Promise<SkillTrend[]>;
  getHiringTrends(filter: AnalyticsFilter): Promise<HiringTrend[]>;
  getLocationTrends(filter: AnalyticsFilter): Promise<LocationTrend[]>;
  forecastSkillDemand(skill: string, forecastPeriod: string): Promise<TrendForecast>;
  forecastSalaryTrend(jobRole: string, forecastPeriod: string): Promise<TrendForecast>;
  forecastJobLocationDemand(location: string, forecastPeriod: string): Promise<TrendForecast>;
  calculateSkillDemandTrendDirection(): Promise<'increasing' | 'decreasing' | 'stable'>;
  calculateHiringTrendDirection(): Promise<'increasing' | 'decreasing' | 'stable'>;
  detectAnomalies(data: number[]): Promise<{ anomalies: number[]; threshold: number }>;
}

/**
 * Trend Predictor Service Implementation
 */
export class TrendPredictorService implements ITrendPredictorService {
  constructor(
    private repository: any, // IAnalyticsRepository
    private cache: any, // Redis client
    private mlModel?: any, // Optional ML model service
  ) {}

  /**
   * Get skill trends over time
   */
  async getSkillTrends(filter: AnalyticsFilter): Promise<SkillTrend[]> {
    const cacheKey = `skill-trends:${JSON.stringify(filter)}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      Logger.info('Skill trends cache hit');
      return JSON.parse(cached);
    }

    Logger.info('Fetching skill trends', { filter });

    const trends = await this.repository.getSkillTrends(filter);

    // Enrich with MoM and YoY calculations
    const enriched = trends.map((trend, index) => {
      const previousTrend = index > 0 ? trends[index - 1] : null;

      return {
        ...trend,
        monthOverMonth: previousTrend
          ? this.calculatePercentageChange(previousTrend.demand, trend.demand)
          : 0,
        yearOverYear: 0, // Would need historical data
      };
    });

    // Cache for 12 hours
    await this.cache.setex(cacheKey, 43200, JSON.stringify(enriched));

    return enriched;
  }

  /**
   * Get hiring trends
   */
  async getHiringTrends(filter: AnalyticsFilter): Promise<HiringTrend[]> {
    const cacheKey = `hiring-trends:${JSON.stringify(filter)}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    Logger.info('Fetching hiring trends', { filter });

    const trends = await this.repository.getHiringTrends(filter);

    // Enrich with calculations
    const enriched = trends.map((trend, index) => {
      const previousTrend = index > 0 ? trends[index - 1] : null;

      return {
        ...trend,
        monthOverMonth: previousTrend
          ? this.calculatePercentageChange(previousTrend.hiringVolume, trend.hiringVolume)
          : 0,
        yearOverYear: 0,
      };
    });

    // Cache for 12 hours
    await this.cache.setex(cacheKey, 43200, JSON.stringify(enriched));

    return enriched;
  }

  /**
   * Get location trends
   */
  async getLocationTrends(filter: AnalyticsFilter): Promise<LocationTrend[]> {
    const cacheKey = `location-trends:${JSON.stringify(filter)}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    Logger.info('Fetching location trends', { filter });

    const trends = await this.repository.getLocationTrends(filter);

    // Enrich with calculations
    const enriched = await Promise.all(
      trends.map(async (trend, index) => {
        const previousTrend = index > 0 ? trends[index - 1] : null;
        const talentAvail = await this.repository.getTalentAvailability(trend.location);

        return {
          ...trend,
          talentAvailability: talentAvail,
          demandGrowth: previousTrend
            ? this.calculatePercentageChange(previousTrend.jobVolume, trend.jobVolume)
            : 0,
          competitionLevel: this.calculateCompetitionLevel(talentAvail),
        };
      }),
    );

    // Cache for 24 hours
    await this.cache.setex(cacheKey, 86400, JSON.stringify(enriched));

    return enriched;
  }

  /**
   * Forecast skill demand using time series prediction
   */
  async forecastSkillDemand(skill: string, forecastPeriod: string): Promise<TrendForecast> {
    const cacheKey = `forecast-skill:${skill}:${forecastPeriod}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    Logger.info('Forecasting skill demand', { skill, forecastPeriod });

    // Get historical data
    const historicalData = await this.repository.getSkillDemandHistory(skill, 24); // Last 24 months

    // Use ML model or simple trend extrapolation
    let forecast: TrendForecast;

    if (this.mlModel) {
      forecast = await this.mlModel.predictSkillDemand(skill, historicalData, forecastPeriod);
    } else {
      forecast = this.simpleLinearForecast(
        skill,
        historicalData,
        forecastPeriod,
        'demand',
      );
    }

    // Cache for 7 days
    await this.cache.setex(cacheKey, 604800, JSON.stringify(forecast));

    return forecast;
  }

  /**
   * Forecast salary trend
   */
  async forecastSalaryTrend(jobRole: string, forecastPeriod: string): Promise<TrendForecast> {
    const cacheKey = `forecast-salary:${jobRole}:${forecastPeriod}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    Logger.info('Forecasting salary trend', { jobRole, forecastPeriod });

    const historicalData = await this.repository.getSalaryHistory(jobRole, 24);

    let forecast: TrendForecast;

    if (this.mlModel) {
      forecast = await this.mlModel.predictSalaryTrend(jobRole, historicalData, forecastPeriod);
    } else {
      forecast = this.simpleLinearForecast(
        jobRole,
        historicalData,
        forecastPeriod,
        'salary',
      );
    }

    // Cache for 7 days
    await this.cache.setex(cacheKey, 604800, JSON.stringify(forecast));

    return forecast;
  }

  /**
   * Forecast job location demand
   */
  async forecastJobLocationDemand(location: string, forecastPeriod: string): Promise<TrendForecast> {
    const cacheKey = `forecast-location:${location}:${forecastPeriod}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    Logger.info('Forecasting location demand', { location, forecastPeriod });

    const historicalData = await this.repository.getLocationDemandHistory(location, 24);

    let forecast: TrendForecast;

    if (this.mlModel) {
      forecast = await this.mlModel.predictLocationDemand(location, historicalData, forecastPeriod);
    } else {
      forecast = this.simpleLinearForecast(
        location,
        historicalData,
        forecastPeriod,
        'demand',
      );
    }

    // Cache for 7 days
    await this.cache.setex(cacheKey, 604800, JSON.stringify(forecast));

    return forecast;
  }

  /**
   * Calculate skill demand trend direction
   */
  async calculateSkillDemandTrendDirection(): Promise<'increasing' | 'decreasing' | 'stable'> {
    const filter: AnalyticsFilter = {
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
    };

    const trends = await this.getSkillTrends(filter);

    if (trends.length < 2) return 'stable';

    const firstDemand = trends[0].demand;
    const lastDemand = trends[trends.length - 1].demand;
    const change = this.calculatePercentageChange(firstDemand, lastDemand);

    if (change > 2) return 'increasing';
    if (change < -2) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate hiring trend direction
   */
  async calculateHiringTrendDirection(): Promise<'increasing' | 'decreasing' | 'stable'> {
    const filter: AnalyticsFilter = {
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    };

    const trends = await this.getHiringTrends(filter);

    if (trends.length < 2) return 'stable';

    const firstVolume = trends[0].hiringVolume;
    const lastVolume = trends[trends.length - 1].hiringVolume;
    const change = this.calculatePercentageChange(firstVolume, lastVolume);

    if (change > 2) return 'increasing';
    if (change < -2) return 'decreasing';
    return 'stable';
  }

  /**
   * Detect anomalies in time series data
   */
  async detectAnomalies(data: number[]): Promise<{ anomalies: number[]; threshold: number }> {
    Logger.info('Detecting anomalies', { dataPoints: data.length });

    if (data.length < 3) {
      return { anomalies: [], threshold: 0 };
    }

    // Calculate mean and standard deviation
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    // Find anomalies (values > 2 standard deviations from mean)
    const threshold = mean + 2 * stdDev;
    const anomalies = data
      .map((val, idx) => (val > threshold ? idx : -1))
      .filter((idx) => idx !== -1);

    return { anomalies, threshold };
  }

  /**
   * Helper: Simple linear forecast
   */
  private simpleLinearForecast(
    name: string,
    historicalData: Array<{ timestamp: Date; value: number }>,
    forecastPeriod: string,
    type: string,
  ): TrendForecast {
    if (historicalData.length < 2) {
      return {
        [type === 'demand' ? 'skill' : type === 'salary' ? 'jobRole' : 'location']: name,
        forecastPeriod,
        predictedDemand: historicalData[0]?.value || 0,
        confidenceInterval: {
          lower: historicalData[0]?.value || 0,
          upper: historicalData[0]?.value || 0,
        },
        factors: {},
      };
    }

    // Simple linear regression
    const x = historicalData.map((_, i) => i);
    const y = historicalData.map((d) => d.value);

    const n = x.length;
    const xMean = x.reduce((a, b) => a + b, 0) / n;
    const yMean = y.reduce((a, b) => a + b, 0) / n;

    const slope =
      x.reduce((sum, xi, i) => sum + (xi - xMean) * (y[i] - yMean), 0) /
      x.reduce((sum, xi) => sum + Math.pow(xi - xMean, 2), 0);

    const intercept = yMean - slope * xMean;

    // Forecast next period
    const periodMultiplier = this.getPeriodMultiplier(forecastPeriod);
    const forecastX = n + periodMultiplier;
    const predicted = slope * forecastX + intercept;

    return {
      [type === 'demand' ? 'skill' : type === 'salary' ? 'jobRole' : 'location']: name,
      forecastPeriod,
      predictedDemand: Math.max(0, Math.round(predicted)),
      confidenceInterval: {
        lower: Math.max(0, Math.round(predicted * 0.8)),
        upper: Math.round(predicted * 1.2),
      },
      factors: {
        slope,
        historicalTrend: slope > 0 ? 1 : slope < 0 ? -1 : 0,
      },
    };
  }

  /**
   * Helper: Calculate percentage change
   */
  private calculatePercentageChange(previous: number, current: number): number {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Helper: Calculate competition level
   */
  private calculateCompetitionLevel(
    talentAvailability: number,
  ): 'low' | 'medium' | 'high' {
    if (talentAvailability < 30) return 'high';
    if (talentAvailability < 70) return 'medium';
    return 'low';
  }

  /**
   * Helper: Get period multiplier
   */
  private getPeriodMultiplier(forecastPeriod: string): number {
    const multipliers: Record<string, number> = {
      next_3_months: 3,
      next_6_months: 6,
      next_year: 12,
    };
    return multipliers[forecastPeriod] || 3;
  }
}
