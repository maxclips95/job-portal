import { Knex } from 'knex';
import { knex as db } from '@/config/database';
import { redis } from '@/config/redis';

export interface BiasReport {
  reportId: string;
  generatedAt: string;
  totalMetricsAnalyzed: number;
  biasesDetected: number;
  overallBiasScore: number;
  recommendations: string[];
  actionItems: Array<{
    priority: 'critical' | 'high' | 'medium' | 'low';
    action: string;
    expectedImpact: string;
    implementationEffort: 'low' | 'medium' | 'high';
  }>;
}

export interface MetricBias {
  metricName: string;
  biasType: string;
  detectedBias: boolean;
  biasScore: number;
  affectedGroups: Array<{
    group: string;
    percentage: number;
    impact: number;
  }>;
  recommendations: string[];
}

export interface GroupComparison {
  group1: string;
  group2: string;
  metric: string;
  group1Value: number;
  group2Value: number;
  disparityRatio: number;
  statisticalSignificance: number;
  isSignificantBias: boolean;
}

/**
 * BiasDetectionService - Identify and mitigate algorithmic biases
 * Monitors for discrimination in predictions, recommendations, and salary data
 */
export class BiasDetectionService {
  private readonly BIAS_THRESHOLD = 0.8; // 80% disparity indicates bias
  private readonly SIGNIFICANCE_THRESHOLD = 0.95; // 95% confidence level

  /**
   * Comprehensive bias audit across all features
   */
  async generateBiasReport(): Promise<BiasReport> {
    const reportId = `bias_report_${Date.now()}`;
    const timestamp = new Date();

    // Audit multiple dimensions
    const [genderBias, ageBias, ethnicityBias, educationBias, locationBias, experienceBias] = await Promise.all([
      this.analyzeGenderBias(),
      this.analyzeAgeBias(),
      this.analyzeEthnicityBias(),
      this.analyzeEducationBias(),
      this.analyzeLocationBias(),
      this.analyzeExperienceBias(),
    ]);

    const allBiases = [genderBias, ageBias, ethnicityBias, educationBias, locationBias, experienceBias].filter((b) => b.biasDetected);

    const recommendations = this.generateRecommendations(allBiases);

    const report: BiasReport = {
      reportId,
      generatedAt: timestamp.toISOString(),
      totalMetricsAnalyzed: 6,
      biasesDetected: allBiases.length,
      overallBiasScore: Math.round((allBiases.reduce((sum, b) => sum + b.biasScore, 0) / Math.max(allBiases.length, 1)) * 100) / 100,
      recommendations: recommendations.map((r) => r.action),
      actionItems: recommendations,
    };

    // Store report
    await db('bias_reports').insert({
      id: reportId,
      generated_at: timestamp,
      overall_bias_score: report.overallBiasScore,
      biases_detected: allBiases.length,
      recommendations: JSON.stringify(recommendations),
      report_data: JSON.stringify(report),
    });

    // Cache for 24 hours
    await redis.setex(`bias_report:${reportId}`, 86400, JSON.stringify(report));

    return report;
  }

  /**
   * Analyze gender-based bias in predictions and recommendations
   */
  private async analyzeGenderBias(): Promise<MetricBias> {
    const maleUsers = await db('users').where({ gender: 'male' }).count('* as count').first();
    const femaleUsers = await db('users').where({ gender: 'female' }).count('* as count').first();
    const otherUsers = await db('users').where({ gender: 'other' }).count('* as count').first();

    // Compare salary recommendations
    const [maleAvgSalary, femaleAvgSalary, otherAvgSalary] = await Promise.all([
      db('salary_data').where('gender', 'male').avg('recommended_salary').first(),
      db('salary_data').where('gender', 'female').avg('recommended_salary').first(),
      db('salary_data').where('gender', 'other').avg('recommended_salary').first(),
    ]);

    const maleAvg = maleAvgSalary?.avg || 0;
    const femaleAvg = femaleAvgSalary?.avg || 0;

    // Calculate disparities
    const genderDisparity = Math.abs(maleAvg - femaleAvg) / Math.max(maleAvg, femaleAvg);

    // Compare skill recommendations
    const [maleHighTechSkills, femaleHighTechSkills] = await Promise.all([
      db('skill_recommendations')
        .where({ gender: 'male' })
        .whereIn('skill_name', ['Python', 'Java', 'C++', 'DevOps'])
        .count('* as count')
        .first(),
      db('skill_recommendations')
        .where({ gender: 'female' })
        .whereIn('skill_name', ['Python', 'Java', 'C++', 'DevOps'])
        .count('* as count')
        .first(),
    ]);

    const maleRatio = maleHighTechSkills?.count / Math.max(maleUsers?.count || 1, 1);
    const femaleRatio = femaleHighTechSkills?.count / Math.max(femaleUsers?.count || 1, 1);
    const skillBias = Math.abs(maleRatio - femaleRatio) / Math.max(maleRatio, femaleRatio);

    const biasDetected = genderDisparity > this.BIAS_THRESHOLD || skillBias > this.BIAS_THRESHOLD;

    return {
      metricName: 'Gender Bias',
      biasType: 'gender',
      detectedBias: biasDetected,
      biasScore: (genderDisparity + skillBias) / 2,
      affectedGroups: [
        {
          group: 'Male',
          percentage: ((maleUsers?.count || 0) / ((maleUsers?.count || 0) + (femaleUsers?.count || 0))) * 100,
          impact: genderDisparity,
        },
        {
          group: 'Female',
          percentage: ((femaleUsers?.count || 0) / ((maleUsers?.count || 0) + (femaleUsers?.count || 0))) * 100,
          impact: genderDisparity,
        },
        {
          group: 'Other',
          percentage: ((otherUsers?.count || 0) / ((maleUsers?.count || 0) + (femaleUsers?.count || 0) + (otherUsers?.count || 0))) * 100,
          impact: 0,
        },
      ],
      recommendations: biasDetected
        ? [
            'Review salary recommendation algorithm for gender neutrality',
            'Audit skill recommendations by gender',
            'Implement blind review processes',
            'Increase diversity in training data',
          ]
        : [],
    };
  }

  /**
   * Analyze age-based discrimination
   */
  private async analyzeAgeBias(): Promise<MetricBias> {
    const ageGroups = [
      { name: '18-25', min: 18, max: 25 },
      { name: '26-35', min: 26, max: 35 },
      { name: '36-45', min: 36, max: 45 },
      { name: '46-55', min: 46, max: 55 },
      { name: '56+', min: 56, max: 150 },
    ];

    const ageGroupData = await Promise.all(
      ageGroups.map(async (group) => {
        const [count, avgSalary, avgConfidenScore] = await Promise.all([
          db('users').whereRaw(`EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN ? AND ?`, [group.min, group.max]).count('* as count').first(),
          db('users')
            .whereRaw(`EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN ? AND ?`, [group.min, group.max])
            .avg('salary')
            .first(),
          db('career_predictions')
            .whereRaw(`EXTRACT(YEAR FROM AGE(user.date_of_birth)) BETWEEN ? AND ?`, [group.min, group.max])
            .innerJoin('users as user', 'career_predictions.user_id', 'user.id')
            .avg('confidence_score')
            .first(),
        ]);

        return {
          group: group.name,
          count: count?.count || 0,
          avgSalary: avgSalary?.avg || 0,
          avgConfidence: avgConfidenScore?.avg || 0,
        };
      })
    );

    // Check for age discrimination in salaries
    const youngSalary = ageGroupData.find((g) => g.group === '26-35')?.avgSalary || 0;
    const seniorSalary = ageGroupData.find((g) => g.group === '56+')?.avgSalary || 0;
    const ageDisparity = Math.abs(youngSalary - seniorSalary) / Math.max(youngSalary, seniorSalary);

    // Check for age discrimination in prediction confidence
    const youngConfidence = ageGroupData.find((g) => g.group === '18-25')?.avgConfidence || 0;
    const seniorConfidence = ageGroupData.find((g) => g.group === '56+')?.avgConfidence || 0;
    const confidenceDisparity = Math.abs(youngConfidence - seniorConfidence);

    const biasDetected = ageDisparity > this.BIAS_THRESHOLD || confidenceDisparity > 0.2;

    return {
      metricName: 'Age Bias',
      biasType: 'age',
      detectedBias: biasDetected,
      biasScore: (ageDisparity + confidenceDisparity / 100) / 2,
      affectedGroups: ageGroupData.map((g) => ({
        group: g.group,
        percentage: (g.count / ageGroupData.reduce((sum, ag) => sum + ag.count, 0)) * 100,
        impact: g.avgSalary,
      })),
      recommendations: biasDetected
        ? [
            'Remove age as a feature in predictions',
            'Implement age-blind algorithms',
            'Audit salary recommendations across age groups',
            'Review career path predictions for age bias',
          ]
        : [],
    };
  }

  /**
   * Analyze ethnicity-based bias
   */
  private async analyzeEthnicityBias(): Promise<MetricBias> {
    const ethnicGroups = await db('users').select('ethnicity').distinct().whereNotNull('ethnicity');

    const groupData = await Promise.all(
      ethnicGroups.map(async (group) => {
        const [count, avgSalary, avgSkillCount] = await Promise.all([
          db('users').where({ ethnicity: group.ethnicity }).count('* as count').first(),
          db('users').where({ ethnicity: group.ethnicity }).avg('salary').first(),
          db('user_skills')
            .innerJoin('users', 'user_skills.user_id', 'users.id')
            .where({ ethnicity: group.ethnicity })
            .count('user_skills.id as count')
            .groupBy('user_skills.user_id')
            .avg('count')
            .first(),
        ]);

        return {
          group: group.ethnicity || 'Unknown',
          count: count?.count || 0,
          avgSalary: avgSalary?.avg || 0,
          avgSkills: avgSkillCount?.avg || 0,
        };
      })
    );

    // Check for salary disparities
    const maxSalary = Math.max(...groupData.map((g) => g.avgSalary));
    const minSalary = Math.min(...groupData.map((g) => g.avgSalary).filter((s) => s > 0));
    const salaryDisparity = (maxSalary - minSalary) / maxSalary;

    const biasDetected = salaryDisparity > this.BIAS_THRESHOLD;

    return {
      metricName: 'Ethnicity Bias',
      biasType: 'ethnicity',
      detectedBias: biasDetected,
      biasScore: salaryDisparity,
      affectedGroups: groupData.map((g) => ({
        group: g.group,
        percentage: (g.count / groupData.reduce((sum, ag) => sum + ag.count, 0)) * 100,
        impact: g.avgSalary,
      })),
      recommendations: biasDetected
        ? [
            'Audit training data for representation',
            'Remove ethnicity from model features',
            'Increase diversity in hiring data',
            'Monitor outcomes by ethnicity',
          ]
        : [],
    };
  }

  /**
   * Analyze education-based bias
   */
  private async analyzeEducationBias(): Promise<MetricBias> {
    const educationLevels = await db('users').select('education_level').distinct().whereNotNull('education_level');

    const levelData = await Promise.all(
      educationLevels.map(async (level) => {
        const [count, avgSalary, successRate] = await Promise.all([
          db('users').where({ education_level: level.education_level }).count('* as count').first(),
          db('users').where({ education_level: level.education_level }).avg('salary').first(),
          db('users')
            .where({ education_level: level.education_level })
            .innerJoin('career_predictions', 'users.id', 'career_predictions.user_id')
            .where('confidence_score', '>', 0.7)
            .count('* as count')
            .first(),
        ]);

        return {
          level: level.education_level || 'Unknown',
          count: count?.count || 0,
          avgSalary: avgSalary?.avg || 0,
          highConfidenceCount: successRate?.count || 0,
        };
      })
    );

    const maxSalary = Math.max(...levelData.map((l) => l.avgSalary));
    const minSalary = Math.min(...levelData.map((l) => l.avgSalary).filter((s) => s > 0));
    const salaryDisparity = (maxSalary - minSalary) / maxSalary;

    return {
      metricName: 'Education Bias',
      biasType: 'education',
      detectedBias: salaryDisparity > this.BIAS_THRESHOLD,
      biasScore: salaryDisparity,
      affectedGroups: levelData.map((l) => ({
        group: l.level,
        percentage: (l.count / levelData.reduce((sum, ll) => sum + ll.count, 0)) * 100,
        impact: l.avgSalary,
      })),
      recommendations:
        salaryDisparity > this.BIAS_THRESHOLD
          ? [
              'Review whether education level should be weighted so heavily',
              'Account for experiential learning equivalent to education',
              'Reduce bias towards specific educational institutions',
            ]
          : [],
    };
  }

  /**
   * Analyze location-based bias (geographic discrimination)
   */
  private async analyzeLocationBias(): Promise<MetricBias> {
    const regions = await db('users').select('region').distinct().whereNotNull('region');

    const regionData = await Promise.all(
      regions.map(async (region) => {
        const [count, avgSalary, opportunityCount] = await Promise.all([
          db('users').where({ region: region.region }).count('* as count').first(),
          db('users').where({ region: region.region }).avg('salary').first(),
          db('jobs').where({ location_region: region.region }).count('* as count').first(),
        ]);

        return {
          region: region.region || 'Unknown',
          count: count?.count || 0,
          avgSalary: avgSalary?.avg || 0,
          opportunities: opportunityCount?.count || 0,
        };
      })
    );

    const maxSalary = Math.max(...regionData.map((r) => r.avgSalary));
    const minSalary = Math.min(...regionData.map((r) => r.avgSalary).filter((s) => s > 0));
    const salaryDisparity = (maxSalary - minSalary) / maxSalary;

    return {
      metricName: 'Location Bias',
      biasType: 'location',
      detectedBias: salaryDisparity > this.BIAS_THRESHOLD,
      biasScore: salaryDisparity,
      affectedGroups: regionData.map((r) => ({
        group: r.region,
        percentage: (r.count / regionData.reduce((sum, rr) => sum + rr.count, 0)) * 100,
        impact: r.opportunities,
      })),
      recommendations:
        salaryDisparity > this.BIAS_THRESHOLD
          ? [
              'Normalize salary data for cost of living',
              'Expand opportunities in underserved regions',
              'Remove location from recommendation filtering',
              'Invest in remote work options',
            ]
          : [],
    };
  }

  /**
   * Analyze experience-based bias
   */
  private async analyzeExperienceBias(): Promise<MetricBias> {
    const experienceRanges = [
      { name: '0-1 years', min: 0, max: 1 },
      { name: '1-3 years', min: 1, max: 3 },
      { name: '3-5 years', min: 3, max: 5 },
      { name: '5-10 years', min: 5, max: 10 },
      { name: '10+ years', min: 10, max: 100 },
    ];

    const expData = await Promise.all(
      experienceRanges.map(async (range) => {
        const [count, avgSalary, promotionRate] = await Promise.all([
          db('users')
            .select(db.raw(`EXTRACT(YEAR FROM AGE(date_of_birth)) as years_exp`))
            .whereRaw(
              `(EXTRACT(YEAR FROM NOW()) - EXTRACT(YEAR FROM (SELECT MIN(started_at) FROM user_roles WHERE user_id = users.id))) BETWEEN ? AND ?`,
              [range.min, range.max]
            )
            .count('* as count')
            .first(),
          db('users').avg('salary').first(),
          db('career_transitions').where('years_to_transition', '<=', range.max).count('* as count').first(),
        ]);

        return {
          range: range.name,
          count: count?.count || 0,
          avgSalary: avgSalary?.avg || 0,
          promotions: promotionRate?.count || 0,
        };
      })
    );

    const maxSalary = Math.max(...expData.map((e) => e.avgSalary));
    const minSalary = Math.min(...expData.map((e) => e.avgSalary).filter((s) => s > 0));
    const salaryDisparity = (maxSalary - minSalary) / maxSalary;

    return {
      metricName: 'Experience Bias',
      biasType: 'experience',
      detectedBias: salaryDisparity > this.BIAS_THRESHOLD,
      biasScore: salaryDisparity,
      affectedGroups: expData.map((e) => ({
        group: e.range,
        percentage: (e.count / expData.reduce((sum, ee) => sum + ee.count, 0)) * 100,
        impact: e.promotions,
      })),
      recommendations:
        salaryDisparity > this.BIAS_THRESHOLD
          ? [
              'Evaluate if experience weighting is appropriate',
              'Consider alternative ways to measure capability',
              'Provide growth opportunities for junior staff',
              'Validate that experience truly predicts performance',
            ]
          : [],
    };
  }

  /**
   * Generate prioritized recommendations from detected biases
   */
  private generateRecommendations(
    biases: MetricBias[]
  ): Array<{
    priority: 'critical' | 'high' | 'medium' | 'low';
    action: string;
    expectedImpact: string;
    implementationEffort: 'low' | 'medium' | 'high';
  }> {
    const recommendations: Array<{
      priority: 'critical' | 'high' | 'medium' | 'low';
      action: string;
      expectedImpact: string;
      implementationEffort: 'low' | 'medium' | 'high';
    }> = [];

    biases.forEach((bias) => {
      if (bias.biasScore > 0.9) {
        recommendations.push({
          priority: 'critical',
          action: `Immediately address ${bias.metricName}. Consider removing this feature from model.`,
          expectedImpact: '25-40% reduction in bias',
          implementationEffort: 'high',
        });
      } else if (bias.biasScore > 0.7) {
        recommendations.push({
          priority: 'high',
          action: `Review and adjust ${bias.metricName} weighting in algorithm`,
          expectedImpact: '15-25% reduction in bias',
          implementationEffort: 'medium',
        });
      }

      bias.recommendations.forEach((rec) => {
        recommendations.push({
          priority: bias.biasScore > 0.8 ? 'high' : 'medium',
          action: rec,
          expectedImpact: '5-10% reduction in bias',
          implementationEffort: 'medium',
        });
      });
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }
}

export const biasDetectionService = new BiasDetectionService();
