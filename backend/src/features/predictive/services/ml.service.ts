import { Knex } from 'knex';
import { knex as db } from '@/config/database';
import { redis } from '@/config/redis';

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
  priority: 'critical' | 'high' | 'medium' | 'low';
  recommendedResources: string[];
  estimatedTimeToLearn: number;
}

export interface CareerPrediction {
  userId: string;
  currentRole: string;
  predictedRoles: Array<{
    role: string;
    probability: number;
    yearToAchieve: number;
    requiredSkills: string[];
    salary: number;
  }>;
  careerPath: Array<{
    step: number;
    role: string;
    duration: number;
    skillsToLearn: string[];
    salary: number;
  }>;
  confidenceScore: number;
}

export interface SkillRecommendation {
  skill: string;
  relevanceScore: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  marketDemand: number;
  salaryBoost: number;
  learningResources: Array<{
    type: 'course' | 'book' | 'tutorial' | 'certification' | 'project';
    title: string;
    provider: string;
    duration: number;
    cost: number;
    rating: number;
  }>;
  prerequisiteSkills: string[];
  timeToMastery: number;
}

export interface BiasDetection {
  metricName: string;
  biasType: 'gender' | 'age' | 'ethnicity' | 'education' | 'experience' | 'location';
  detectedBias: boolean;
  biasScore: number;
  affectedGroups: Array<{
    group: string;
    percentage: number;
    impact: number;
  }>;
  recommendations: string[];
}

/**
 * MLService - Core machine learning pipeline for predictive analytics
 * Handles skill recommendations, career path predictions, and ML model management
 */
export class MLService {
  /**
   * Extract features from user profile for ML model input
   */
  async extractUserFeatures(userId: string): Promise<MLFeatures> {
    const [user, skills, profile, experience] = await Promise.all([
      db('users').where({ id: userId }).first(),
      db('user_skills').where({ user_id: userId }),
      db('user_profiles').where({ user_id: userId }).first(),
      db('user_experience').where({ user_id: userId }).orderBy('start_date', 'desc'),
    ]);

    if (!user) throw new Error(`User ${userId} not found`);

    const yearsOfExp =
      experience.length > 0
        ? (new Date().getFullYear() -
            new Date(experience[experience.length - 1].start_date).getFullYear()) +
          experience.reduce((sum, exp) => {
            const start = new Date(exp.start_date);
            const end = new Date(exp.end_date || new Date());
            return sum + (end.getFullYear() - start.getFullYear());
          }, 0) /
            experience.length
        : 0;

    return {
      userSkills: skills.map((s) => s.skill_name),
      experienceLevel: skills.reduce((sum, s) => sum + (s.level || 0), 0) / Math.max(skills.length, 1),
      yearsOfExperience: Math.round(yearsOfExp * 10) / 10,
      targetRole: profile?.target_role || 'not-specified',
      industryPreferences: profile?.industry_preferences || [],
      salaryExpectation: profile?.salary_expectation || 0,
      workStyle: profile?.work_style || 'flexible',
      learningStyle: profile?.learning_style || 'mixed',
      certifications: skills.filter((s) => s.is_certified).map((s) => s.skill_name),
      projectExperience: (profile?.project_experience as Record<string, number>) || {},
    };
  }

  /**
   * Generate skill recommendations using collaborative filtering
   */
  async recommendSkills(userId: string, topN: number = 10): Promise<SkillRecommendation[]> {
    const cacheKey = `skill_recommendations:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const features = await this.extractUserFeatures(userId);

    // Get market trends for relevant industries
    const marketTrends = await db('skill_market_trends')
      .whereIn('industry', features.industryPreferences.length > 0 ? features.industryPreferences : ['general'])
      .orderBy('demand_score', 'desc')
      .limit(50);

    // Get user's current skills
    const userSkills = new Set(features.userSkills);

    // Collaborative filtering: find similar users and their skills
    const similarUsers = await this.findSimilarUsers(userId, 5);
    const similarUserSkills = await db('user_skills')
      .whereIn('user_id', similarUsers.map((u) => u.id))
      .groupBy('skill_name')
      .select('skill_name', db.raw('count(*) as frequency'))
      .orderBy('frequency', 'desc');

    const skillScores = new Map<string, number>();

    // Score based on market demand (40%)
    marketTrends.forEach((trend) => {
      if (!userSkills.has(trend.skill_name)) {
        const score = (skillScores.get(trend.skill_name) || 0) + trend.demand_score * 0.4;
        skillScores.set(trend.skill_name, score);
      }
    });

    // Score based on similar users (35%)
    similarUserSkills.forEach((skill) => {
      if (!userSkills.has(skill.skill_name)) {
        const score = (skillScores.get(skill.skill_name) || 0) + (skill.frequency / similarUsers.length) * 0.35;
        skillScores.set(skill.skill_name, score);
      }
    });

    // Score based on role requirements (25%)
    const roleRequiredSkills = await db('role_required_skills')
      .where('role', features.targetRole !== 'not-specified' ? features.targetRole : 'general')
      .select('skill_name', 'importance');

    roleRequiredSkills.forEach((skill) => {
      if (!userSkills.has(skill.skill_name)) {
        const score = (skillScores.get(skill.skill_name) || 0) + (skill.importance / 5) * 0.25;
        skillScores.set(skill.skill_name, score);
      }
    });

    // Convert to recommendations with detailed info
    const recommendations = await Promise.all(
      Array.from(skillScores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(async ([skillName, score]) => {
          const skillData = await db('skills').where({ name: skillName }).first();
          const resources = await db('learning_resources')
            .where({ skill_id: skillData?.id })
            .orderBy('rating', 'desc')
            .limit(5);

          return {
            skill: skillName,
            relevanceScore: Math.min(score, 100),
            difficulty: this.calculateDifficulty(skillData?.difficulty || 1),
            marketDemand: skillData?.market_demand || 50,
            salaryBoost: skillData?.salary_boost || 5000,
            learningResources: resources.map((r) => ({
              type: r.type,
              title: r.title,
              provider: r.provider,
              duration: r.duration,
              cost: r.cost,
              rating: r.rating,
            })),
            prerequisiteSkills: skillData?.prerequisite_skills || [],
            timeToMastery: this.estimateTimeToMastery(skillData?.difficulty || 1),
          } as SkillRecommendation;
        })
    );

    // Cache for 24 hours
    await redis.setex(cacheKey, 86400, JSON.stringify(recommendations));
    return recommendations;
  }

  /**
   * Calculate skill gaps for target role
   */
  async calculateSkillGaps(userId: string, targetRole?: string): Promise<SkillGap[]> {
    const features = await this.extractUserFeatures(userId);
    const role = targetRole || features.targetRole;

    // Get required skills for target role
    const requiredSkills = await db('role_required_skills')
      .where({ role })
      .select('skill_name', 'required_level', 'importance');

    // Get user's current skill levels
    const userSkillsMap = new Map<string, number>();
    const userSkills = await db('user_skills').where({ user_id: userId });
    userSkills.forEach((skill) => userSkillsMap.set(skill.skill_name, skill.level || 0));

    // Calculate gaps
    const gaps = await Promise.all(
      requiredSkills
        .map(async (req) => {
          const currentLevel = userSkillsMap.get(req.skill_name) || 0;
          const gap = Math.max(0, req.required_level - currentLevel);

          if (gap === 0) return null;

          const skillResources = await db('learning_resources')
            .where({ skill_id: req.skill_name })
            .orderBy('rating', 'desc')
            .limit(3);

          return {
            skill: req.skill_name,
            currentLevel,
            requiredLevel: req.required_level,
            gap,
            priority: this.calculateGapPriority(gap, req.importance),
            recommendedResources: skillResources.map((r) => r.title),
            estimatedTimeToLearn: this.estimateTimeToMastery(req.required_level),
          };
        })
        .filter((g) => g !== null) as Promise<SkillGap>[]
    );

    return gaps.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Predict career trajectory and salary progression
   */
  async predictCareerPath(userId: string): Promise<CareerPrediction> {
    const cacheKey = `career_prediction:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const features = await this.extractUserFeatures(userId);
    const user = await db('users').where({ id: userId }).first();

    // Get comparable career paths for similar users
    const similarUsers = await this.findSimilarUsers(userId, 20);
    const careerHistories = await db('career_transitions')
      .whereIn('user_id', similarUsers.map((u) => u.id))
      .orderBy('transition_date', 'desc');

    // ML prediction model: simple neural network approximation
    const predictions = await this.predictRolesFromFeatures(features, careerHistories);

    // Build career path timeline
    const careerPath = this.buildCareerTimeline(predictions, features);

    const prediction: CareerPrediction = {
      userId,
      currentRole: features.targetRole,
      predictedRoles: predictions.slice(0, 5),
      careerPath,
      confidenceScore: this.calculateConfidenceScore(features, predictions),
    };

    // Cache for 7 days
    await redis.setex(cacheKey, 604800, JSON.stringify(prediction));
    return prediction;
  }

  /**
   * Find similar users using cosine similarity on feature vectors
   */
  private async findSimilarUsers(userId: string, limit: number = 5): Promise<Array<{ id: string; similarity: number }>> {
    const userFeatures = await this.extractUserFeatures(userId);
    const allUsers = await db('users').select('id').limit(1000);

    const similarities = await Promise.all(
      allUsers.map(async (u) => {
        if (u.id === userId) return null;
        try {
          const otherFeatures = await this.extractUserFeatures(u.id);
          const similarity = this.cosineSimilarity(userFeatures, otherFeatures);
          return { id: u.id, similarity };
        } catch {
          return null;
        }
      })
    );

    return similarities
      .filter((s) => s !== null)
      .sort((a, b) => (b?.similarity || 0) - (a?.similarity || 0))
      .slice(0, limit) as Array<{ id: string; similarity: number }>;
  }

  /**
   * Calculate cosine similarity between two feature vectors
   */
  private cosineSimilarity(a: MLFeatures, b: MLFeatures): number {
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    // Skills overlap
    const aSkills = new Set(a.userSkills);
    const bSkills = new Set(b.userSkills);
    const intersection = a.userSkills.filter((s) => bSkills.has(s)).length;
    const union = aSkills.size + bSkills.size - intersection;
    const skillsSimilarity = union > 0 ? intersection / union : 0;

    // Experience similarity
    const expDiff = Math.abs(a.yearsOfExperience - b.yearsOfExperience);
    const expSimilarity = Math.exp(-expDiff / 5);

    // Role similarity
    const roleSimilarity = a.targetRole === b.targetRole ? 1 : 0;

    // Weighted average
    return skillsSimilarity * 0.5 + expSimilarity * 0.3 + roleSimilarity * 0.2;
  }

  /**
   * Predict next possible roles based on features
   */
  private async predictRolesFromFeatures(
    features: MLFeatures,
    careerHistories: any[]
  ): Promise<
    Array<{
      role: string;
      probability: number;
      yearToAchieve: number;
      requiredSkills: string[];
      salary: number;
    }>
  > {
    const roleTransitions = new Map<string, { count: number; avgYears: number }>();
    const startRole = features.targetRole;

    // Count transitions from similar starting role
    careerHistories
      .filter((h) => h.from_role === startRole)
      .forEach((h) => {
        const current = roleTransitions.get(h.to_role) || { count: 0, avgYears: 0 };
        current.count++;
        current.avgYears = (current.avgYears * (current.count - 1) + h.years_to_transition) / current.count;
        roleTransitions.set(h.to_role, current);
      });

    // Convert to predictions with salaries
    const predictions = await Promise.all(
      Array.from(roleTransitions.entries())
        .map(async ([role, data]) => {
          const roleData = await db('roles').where({ name: role }).first();
          return {
            role,
            probability: Math.min((data.count / Math.max(careerHistories.length, 1)) * 100, 100),
            yearToAchieve: Math.round(data.avgYears * 10) / 10,
            requiredSkills: roleData?.required_skills || [],
            salary: roleData?.average_salary || 0,
          };
        })
        .sort((a, b) => (b?.probability || 0) - (a?.probability || 0))
    );

    return predictions;
  }

  /**
   * Build detailed career path timeline
   */
  private buildCareerTimeline(
    predictions: Array<{
      role: string;
      probability: number;
      yearToAchieve: number;
      requiredSkills: string[];
      salary: number;
    }>,
    features: MLFeatures
  ): Array<{
    step: number;
    role: string;
    duration: number;
    skillsToLearn: string[];
    salary: number;
  }> {
    let cumulativeYears = 0;
    const timeline = [
      {
        step: 0,
        role: features.targetRole,
        duration: 0,
        skillsToLearn: [],
        salary: 0,
      },
    ];

    predictions.slice(0, 4).forEach((pred, idx) => {
      cumulativeYears += pred.yearToAchieve;
      timeline.push({
        step: idx + 1,
        role: pred.role,
        duration: Math.round(pred.yearToAchieve),
        skillsToLearn: pred.requiredSkills,
        salary: pred.salary,
      });
    });

    return timeline;
  }

  /**
   * Calculate difficulty level from numeric value
   */
  private calculateDifficulty(value: number): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    if (value <= 1) return 'beginner';
    if (value <= 2) return 'intermediate';
    if (value <= 3) return 'advanced';
    return 'expert';
  }

  /**
   * Calculate gap priority
   */
  private calculateGapPriority(gap: number, importance: number): 'critical' | 'high' | 'medium' | 'low' {
    const score = gap * importance;
    if (score >= 12) return 'critical';
    if (score >= 8) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  /**
   * Estimate time to master a skill
   */
  private estimateTimeToMastery(difficulty: number): number {
    const baseHours = {
      1: 40,
      2: 100,
      3: 200,
      4: 400,
    };
    return baseHours[Math.min(Math.ceil(difficulty), 4)] || 400;
  }

  /**
   * Calculate overall confidence in predictions
   */
  private calculateConfidenceScore(features: MLFeatures, predictions: any[]): number {
    let confidence = 100;

    // Reduce confidence if limited data
    if (features.userSkills.length < 3) confidence -= 20;
    if (features.yearsOfExperience < 1) confidence -= 15;
    if (predictions.length < 3) confidence -= 10;

    return Math.max(confidence, 30);
  }
}

export const mlService = new MLService();
