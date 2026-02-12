/**
 * Badge Management Service
 * Handles badge creation, eligibility tracking, and award automation
 */

import { Redis } from 'ioredis';
import {
  BadgeDefinition,
  Certification,
  CertificationLevel,
} from '../types/certification.types';

export interface IBadgeService {
  createBadge(badge: BadgeDefinition): Promise<BadgeDefinition>;
  updateBadge(
    badgeId: string,
    updates: Partial<BadgeDefinition>
  ): Promise<BadgeDefinition>;
  getBadge(badgeId: string): Promise<BadgeDefinition>;
  listBadges(skillId?: string, active?: boolean): Promise<BadgeDefinition[]>;
  awardBadge(userId: string, badgeId: string): Promise<Certification>;
  checkEligibility(userId: string, badgeId: string): Promise<{
    eligible: boolean;
    missingRequirements: string[];
  }>;
  autoAwardBadges(userId: string): Promise<Certification[]>;
  getBadgeProgress(userId: string, badgeId: string): Promise<{
    assessmentScore: { current: number; required: number; percentage: number };
    practicalProjects: { current: number; required: number };
    endorsements: { current: number; required: number };
    overallProgress: number;
  }>;
  deactivateBadge(badgeId: string): Promise<void>;
  getBadgeStats(): Promise<{
    totalBadges: number;
    badgesByLevel: Record<CertificationLevel, number>;
    mostAwardedBadges: Array<{ badgeId: string; count: number }>;
  }>;
}

export class BadgeService implements IBadgeService {
  constructor(
    private db: any,
    private redis: Redis,
    private certificationService?: any,
    private assessmentService?: any,
    private portfolioService?: any,
    private verificationService?: any
  ) {}

  async createBadge(badge: BadgeDefinition): Promise<BadgeDefinition> {
    const badgeData: BadgeDefinition = {
      ...badge,
      id: this.generateId(),
      active: true,
    };

    await this.db.query(
      `INSERT INTO badge_definitions 
      (id, skill_id, level, name, description, icon, color, requirements, display_order, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        badgeData.id,
        badgeData.skillId,
        badgeData.level,
        badgeData.name,
        badgeData.description,
        badgeData.icon,
        badgeData.color,
        JSON.stringify(badgeData.requirements),
        badgeData.displayOrder || 0,
        badgeData.active,
      ]
    );

    await this.redis.setex(
      `badge:${badgeData.id}`,
      86400,
      JSON.stringify(badgeData)
    );

    return badgeData;
  }

  async updateBadge(
    badgeId: string,
    updates: Partial<BadgeDefinition>
  ): Promise<BadgeDefinition> {
    const badge = await this.getBadge(badgeId);
    const updated = { ...badge, ...updates };

    await this.db.query(
      `UPDATE badge_definitions SET 
      name = $1, description = $2, icon = $3, color = $4, 
      requirements = $5, display_order = $6 WHERE id = $7`,
      [
        updated.name,
        updated.description,
        updated.icon,
        updated.color,
        JSON.stringify(updated.requirements),
        updated.displayOrder,
        badgeId,
      ]
    );

    await this.invalidateCache(`badge:${badgeId}`);
    return updated;
  }

  async getBadge(badgeId: string): Promise<BadgeDefinition> {
    const cached = await this.redis.get(`badge:${badgeId}`);
    if (cached) return JSON.parse(cached);

    const result = await this.db.query(
      'SELECT * FROM badge_definitions WHERE id = $1',
      [badgeId]
    );

    if (result.rows.length === 0) {
      throw new Error('Badge not found');
    }

    const badge = this.mapBadge(result.rows[0]);
    await this.redis.setex(`badge:${badgeId}`, 86400, JSON.stringify(badge));

    return badge;
  }

  async listBadges(
    skillId?: string,
    active?: boolean
  ): Promise<BadgeDefinition[]> {
    let query = 'SELECT * FROM badge_definitions WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (skillId) {
      query += ` AND skill_id = $${paramIndex++}`;
      params.push(skillId);
    }

    if (active !== undefined) {
      query += ` AND active = $${paramIndex++}`;
      params.push(active);
    }

    query += ' ORDER BY display_order ASC';

    const result = await this.db.query(query, params);
    return result.rows.map((row: any) => this.mapBadge(row));
  }

  async awardBadge(userId: string, badgeId: string): Promise<Certification> {
    const badge = await this.getBadge(badgeId);

    // Check if already awarded
    const existingResult = await this.db.query(
      `SELECT * FROM certifications 
       WHERE user_id = $1 AND skill_id = $2 AND type = 'skill-badge'`,
      [userId, badge.skillId]
    );

    if (existingResult.rows.length > 0) {
      throw new Error('User already has this badge');
    }

    const certification = await this.certificationService.createCertification({
      userId,
      skillId: badge.skillId,
      level: badge.level,
      type: 'skill-badge',
      assessmentScore: badge.requirements.assessmentScore,
    });

    // Track badge award
    await this.db.query(
      `INSERT INTO badge_awards (id, badge_id, user_id, awarded_at)
       VALUES ($1, $2, $3, $4)`,
      [this.generateId(), badgeId, userId, new Date()]
    );

    await this.invalidateCache(`user-badges:${userId}`);
    return certification;
  }

  async checkEligibility(userId: string, badgeId: string): Promise<{
    eligible: boolean;
    missingRequirements: string[];
  }> {
    const badge = await this.getBadge(badgeId);
    const missingRequirements: string[] = [];

    // Check assessment score
    const assessmentResult = await this.db.query(
      `SELECT MAX(score) as max_score FROM assessment_attempts 
       WHERE user_id = $1 AND status = 'completed'`,
      [userId]
    );

    const maxScore = assessmentResult.rows[0]?.max_score || 0;
    if (maxScore < badge.requirements.assessmentScore) {
      missingRequirements.push(
        `Assessment score (need ${badge.requirements.assessmentScore}, have ${maxScore})`
      );
    }

    // Check practical projects
    const projectResult = await this.db.query(
      `SELECT COUNT(*) as count FROM portfolio_items 
       WHERE user_id = $1 AND type = 'project'`,
      [userId]
    );

    const projectCount = parseInt(projectResult.rows[0].count) || 0;
    if (projectCount < badge.requirements.practicalProjects) {
      missingRequirements.push(
        `Practical projects (need ${badge.requirements.practicalProjects}, have ${projectCount})`
      );
    }

    // Check endorsements
    const endorsementResult = await this.db.query(
      `SELECT COUNT(*) as count FROM skill_endorsements WHERE user_id = $1`,
      [userId]
    );

    const endorsementCount = parseInt(
      endorsementResult.rows[0].count
    ) || 0;
    if (endorsementCount < badge.requirements.recommendationCount) {
      missingRequirements.push(
        `Endorsements (need ${badge.requirements.recommendationCount}, have ${endorsementCount})`
      );
    }

    return {
      eligible: missingRequirements.length === 0,
      missingRequirements,
    };
  }

  async autoAwardBadges(userId: string): Promise<Certification[]> {
    const badges = await this.listBadges(undefined, true);
    const awardedCertifications: Certification[] = [];

    for (const badge of badges) {
      const { eligible } = await this.checkEligibility(userId, badge.id);

      if (eligible) {
        try {
          const cert = await this.awardBadge(userId, badge.id);
          awardedCertifications.push(cert);
        } catch (error) {
          // Badge already awarded, skip
          continue;
        }
      }
    }

    return awardedCertifications;
  }

  async getBadgeProgress(userId: string, badgeId: string): Promise<{
    assessmentScore: { current: number; required: number; percentage: number };
    practicalProjects: { current: number; required: number };
    endorsements: { current: number; required: number };
    overallProgress: number;
  }> {
    const badge = await this.getBadge(badgeId);
    const requirements = badge.requirements;

    // Assessment score
    const assessmentResult = await this.db.query(
      `SELECT MAX(score) as max_score FROM assessment_attempts 
       WHERE user_id = $1 AND status = 'completed'`,
      [userId]
    );

    const assessmentScore = assessmentResult.rows[0]?.max_score || 0;
    const assessmentPercentage = Math.min(
      100,
      (assessmentScore / requirements.assessmentScore) * 100
    );

    // Projects
    const projectResult = await this.db.query(
      `SELECT COUNT(*) as count FROM portfolio_items 
       WHERE user_id = $1 AND type = 'project'`,
      [userId]
    );

    const projectCount = parseInt(projectResult.rows[0].count) || 0;

    // Endorsements
    const endorsementResult = await this.db.query(
      `SELECT COUNT(*) as count FROM skill_endorsements WHERE user_id = $1`,
      [userId]
    );

    const endorsementCount = parseInt(
      endorsementResult.rows[0].count
    ) || 0;

    const overallProgress = Math.round(
      (assessmentPercentage +
        ((projectCount / requirements.practicalProjects) * 100 || 0) +
        ((endorsementCount / requirements.recommendationCount) * 100 || 0)) /
        3
    );

    return {
      assessmentScore: {
        current: assessmentScore,
        required: requirements.assessmentScore,
        percentage: assessmentPercentage,
      },
      practicalProjects: {
        current: projectCount,
        required: requirements.practicalProjects,
      },
      endorsements: {
        current: endorsementCount,
        required: requirements.recommendationCount,
      },
      overallProgress,
    };
  }

  async deactivateBadge(badgeId: string): Promise<void> {
    await this.db.query(
      'UPDATE badge_definitions SET active = false WHERE id = $1',
      [badgeId]
    );

    await this.invalidateCache(`badge:${badgeId}`);
  }

  async getBadgeStats(): Promise<{
    totalBadges: number;
    badgesByLevel: Record<CertificationLevel, number>;
    mostAwardedBadges: Array<{ badgeId: string; count: number }>;
  }> {
    const totalResult = await this.db.query(
      'SELECT COUNT(*) as count FROM badge_definitions WHERE active = true'
    );

    const levelResult = await this.db.query(
      `SELECT level, COUNT(*) as count 
       FROM badge_definitions 
       WHERE active = true
       GROUP BY level`
    );

    const awardResult = await this.db.query(
      `SELECT badge_id, COUNT(*) as count 
       FROM badge_awards 
       GROUP BY badge_id 
       ORDER BY count DESC 
       LIMIT 10`
    );

    const badgesByLevel: Record<CertificationLevel, number> = {
      foundational: 0,
      professional: 0,
      expert: 0,
      master: 0,
    };

    for (const row of levelResult.rows) {
      badgesByLevel[row.level as CertificationLevel] = parseInt(row.count);
    }

    return {
      totalBadges: parseInt(totalResult.rows[0].count),
      badgesByLevel,
      mostAwardedBadges: awardResult.rows.map((row: any) => ({
        badgeId: row.badge_id,
        count: parseInt(row.count),
      })),
    };
  }

  private mapBadge(row: any): BadgeDefinition {
    return {
      id: row.id,
      skillId: row.skill_id,
      level: row.level,
      name: row.name,
      description: row.description,
      icon: row.icon,
      color: row.color,
      requirements: row.requirements,
      displayOrder: row.display_order,
      active: row.active,
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async invalidateCache(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
