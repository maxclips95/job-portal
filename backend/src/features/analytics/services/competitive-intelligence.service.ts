/**
 * Competitive Intelligence Service
 * Competitor analysis and market positioning
 */

import { Logger } from '../../../utils/logger';
import { CompetitiveIntelligence, AnalyticsFilter } from '../types/analytics.types';

export interface ICompetitiveIntelligenceService {
  analyzeCompetitors(competitors: string[], metrics?: string[]): Promise<CompetitiveIntelligence[]>;
  compareSalaries(competitors: string[], jobRole: string): Promise<Record<string, number>>;
  analyzeBenefits(competitors: string[]): Promise<Record<string, string[]>>;
  getHiringPace(competitor: string): Promise<'fast' | 'medium' | 'slow'>;
  getGrowthRate(competitor: string): Promise<number>;
  getEmployeeSatisfaction(competitor: string): Promise<number>;
  getTurnoverRate(competitor: string): Promise<number>;
}

export class CompetitiveIntelligenceService implements ICompetitiveIntelligenceService {
  constructor(
    private repository: any,
    private cache: any,
  ) {}

  async analyzeCompetitors(
    competitors: string[],
    metrics?: string[],
  ): Promise<CompetitiveIntelligence[]> {
    Logger.info('Analyzing competitors', { competitors, metrics });

    const intelligence = await Promise.all(
      competitors.map(async (competitor) => {
        const cacheKey = `competitive-intel:${competitor}`;
        const cached = await this.cache.get(cacheKey);

        if (cached) return JSON.parse(cached);

        const [salaryComp, benefits, pace, growth, satisfaction, turnover] = await Promise.all([
          this.compareSalaries([competitor], ''),
          this.analyzeBenefits([competitor]),
          this.getHiringPace(competitor),
          this.getGrowthRate(competitor),
          this.getEmployeeSatisfaction(competitor),
          this.getTurnoverRate(competitor),
        ]);

        const intel: CompetitiveIntelligence = {
          id: `comp-${competitor}`,
          competitorName: competitor,
          salaryComparison: salaryComp[competitor] || 0,
          beneftisComparison: benefits[competitor] || [],
          hiringPace: pace,
          growthRate: growth,
          employeeSatisfaction: satisfaction,
          turnoverRate: turnover,
        };

        await this.cache.setex(cacheKey, 604800, JSON.stringify(intel));
        return intel;
      }),
    );

    return intelligence;
  }

  async compareSalaries(competitors: string[], jobRole: string): Promise<Record<string, number>> {
    Logger.info('Comparing salaries', { competitors, jobRole });

    const baselineSalary = await this.repository.getAverageSalary(jobRole);
    const comparisons: Record<string, number> = {};

    for (const competitor of competitors) {
      const competitorSalary = await this.repository.getCompetitorAverageSalary(competitor, jobRole);
      comparisons[competitor] = ((competitorSalary - baselineSalary) / baselineSalary) * 100;
    }

    return comparisons;
  }

  async analyzeBenefits(competitors: string[]): Promise<Record<string, string[]>> {
    const benefits: Record<string, string[]> = {};

    for (const competitor of competitors) {
      benefits[competitor] = await this.repository.getCompetitorBenefits(competitor);
    }

    return benefits;
  }

  async getHiringPace(competitor: string): Promise<'fast' | 'medium' | 'slow'> {
    const jobsPosted = await this.repository.getCompetitorJobPostings(competitor, 30);
    if (jobsPosted > 50) return 'fast';
    if (jobsPosted > 20) return 'medium';
    return 'slow';
  }

  async getGrowthRate(competitor: string): Promise<number> {
    const currentEmployees = await this.repository.getCompetitorEmployeeCount(competitor);
    const previousEmployees = await this.repository.getCompetitorEmployeeCount(competitor, 90);
    return ((currentEmployees - previousEmployees) / previousEmployees) * 100;
  }

  async getEmployeeSatisfaction(competitor: string): Promise<number> {
    const reviews = await this.repository.getCompetitorReviews(competitor);
    if (reviews.length === 0) return 50;
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  }

  async getTurnoverRate(competitor: string): Promise<number> {
    const hired = await this.repository.getCompetitorHiredCount(competitor, 365);
    const left = await this.repository.getCompetitorLeftCount(competitor, 365);
    return (left / (hired + left)) * 100;
  }
}
