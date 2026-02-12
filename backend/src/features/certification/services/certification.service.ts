/**
 * Certification Service
 * Manages certification earning, verification, and credential management
 */

import { Redis } from 'ioredis';
import {
  Certification,
  BadgeDefinition,
  CertificationStatus,
  CreateCertificationRequest,
  CertificationStats,
  CertificationVerificationResult,
  CertificationFilter,
  PaginatedResponse,
} from '../types/certification.types';
import crypto from 'crypto';

export interface ICertificationService {
  createCertification(
    request: CreateCertificationRequest
  ): Promise<Certification>;
  getCertification(certId: string): Promise<Certification>;
  getUserCertifications(
    userId: string,
    filter?: Partial<CertificationFilter>
  ): Promise<PaginatedResponse<Certification>>;
  verifyCertification(
    certId: string
  ): Promise<CertificationVerificationResult>;
  revokeCertification(certId: string, reason: string): Promise<void>;
  renewCertification(certId: string): Promise<Certification>;
  createBadge(badge: BadgeDefinition): Promise<BadgeDefinition>;
  getBadge(badgeId: string): Promise<BadgeDefinition>;
  listBadges(skillId?: string): Promise<BadgeDefinition[]>;
  checkBadgeEligibility(userId: string, badgeId: string): Promise<boolean>;
  awardBadge(userId: string, badgeId: string): Promise<Certification>;
  getCertificationStats(): Promise<CertificationStats>;
}

export class CertificationService implements ICertificationService {
  constructor(private db: any, private redis: Redis) {}

  async createCertification(
    request: CreateCertificationRequest
  ): Promise<Certification> {
    const verificationToken = this.generateToken();
    const credentialUrl = `https://credentials.jobportal.com/${verificationToken}`;
    const expiryDate = this.calculateExpiryDate(request.level);

    const certification: Certification = {
      id: this.generateId(),
      skillId: request.skillId,
      userId: request.userId,
      level: request.level,
      type: request.type,
      earnedDate: new Date(),
      expiryDate,
      status: 'earned' as CertificationStatus,
      verificationToken,
      credentialUrl,
      issuer: 'JobPortal Academy',
      metadata: {
        score: request.assessmentScore,
        assessmentIds: [],
        endorsements: 0,
        verifications: 0,
      },
    };

    await this.db.query(
      `INSERT INTO certifications 
      (id, skill_id, user_id, level, type, earned_date, expiry_date, 
       status, verification_token, credential_url, issuer, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        certification.id,
        certification.skillId,
        certification.userId,
        certification.level,
        certification.type,
        certification.earnedDate,
        certification.expiryDate,
        certification.status,
        certification.verificationToken,
        certification.credentialUrl,
        certification.issuer,
        JSON.stringify(certification.metadata),
      ]
    );

    await this.redis.setex(
      `cert:${certification.id}`,
      86400,
      JSON.stringify(certification)
    );

    return certification;
  }

  async getCertification(certId: string): Promise<Certification> {
    const cached = await this.redis.get(`cert:${certId}`);
    if (cached) return JSON.parse(cached);

    const result = await this.db.query(
      'SELECT * FROM certifications WHERE id = $1',
      [certId]
    );

    if (result.rows.length === 0) {
      throw new Error('Certification not found');
    }

    const cert = this.mapCertification(result.rows[0]);
    await this.redis.setex(`cert:${certId}`, 86400, JSON.stringify(cert));

    return cert;
  }

  async getUserCertifications(
    userId: string,
    filter?: Partial<CertificationFilter>
  ): Promise<PaginatedResponse<Certification>> {
    const limit = filter?.limit || 20;
    const page = filter?.page || 1;
    const offset = (page - 1) * limit;

    let query =
      'SELECT * FROM certifications WHERE user_id = $1';
    const params: any[] = [userId];
    let paramIndex = 2;

    if (filter?.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(filter.status);
    }

    if (filter?.skillId) {
      query += ` AND skill_id = $${paramIndex++}`;
      params.push(filter.skillId);
    }

    if (filter?.level) {
      query += ` AND level = $${paramIndex++}`;
      params.push(filter.level);
    }

    // Get total
    const countResult = await this.db.query(
      `SELECT COUNT(*) as count FROM certifications WHERE user_id = $1`,
      [userId]
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    query += ` ORDER BY earned_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await this.db.query(query, params);
    const certs = result.rows.map((row: any) => this.mapCertification(row));

    return {
      data: certs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async verifyCertification(
    certId: string
  ): Promise<CertificationVerificationResult> {
    const cert = await this.getCertification(certId);

    const verificationsResult = await this.db.query(
      `SELECT * FROM certification_verifications WHERE certification_id = $1`,
      [certId]
    );

    const isValid =
      cert.status === 'earned' &&
      (!cert.expiryDate || cert.expiryDate > new Date());

    const trustLevel = this.calculateTrustLevel(
      isValid,
      verificationsResult.rows.length
    );

    return {
      isValid,
      certification: cert,
      verifications: verificationsResult.rows.map((row: any) => ({
        id: row.id,
        certificationId: row.certification_id,
        verifierId: row.verifier_id,
        type: row.type,
        status: row.status,
        notes: row.notes,
        verifiedAt: row.verified_at,
        expiresAt: row.expires_at,
      })),
      trustLevel,
      lastVerified: new Date(),
    };
  }

  async revokeCertification(certId: string, reason: string): Promise<void> {
    await this.db.query(
      'UPDATE certifications SET status = $1 WHERE id = $2',
      ['revoked', certId]
    );

    await this.db.query(
      `INSERT INTO certification_revocations (id, certification_id, reason, revoked_at)
       VALUES ($1, $2, $3, $4)`,
      [this.generateId(), certId, reason, new Date()]
    );

    await this.invalidateCache(`cert:${certId}`);
  }

  async renewCertification(certId: string): Promise<Certification> {
    const cert = await this.getCertification(certId);
    const newExpiryDate = this.calculateExpiryDate(cert.level);

    await this.db.query(
      `UPDATE certifications SET expiry_date = $1, status = $2 WHERE id = $3`,
      [newExpiryDate, 'earned', certId]
    );

    cert.expiryDate = newExpiryDate;
    await this.redis.setex(`cert:${certId}`, 86400, JSON.stringify(cert));

    return cert;
  }

  async createBadge(badge: BadgeDefinition): Promise<BadgeDefinition> {
    const badgeData: BadgeDefinition = {
      ...badge,
      id: this.generateId(),
      displayOrder: badge.displayOrder || 0,
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
        badgeData.displayOrder,
        badgeData.active,
      ]
    );

    return badgeData;
  }

  async getBadge(badgeId: string): Promise<BadgeDefinition> {
    const result = await this.db.query(
      'SELECT * FROM badge_definitions WHERE id = $1',
      [badgeId]
    );

    if (result.rows.length === 0) {
      throw new Error('Badge not found');
    }

    return this.mapBadge(result.rows[0]);
  }

  async listBadges(skillId?: string): Promise<BadgeDefinition[]> {
    let query = 'SELECT * FROM badge_definitions WHERE active = true';
    const params: any[] = [];

    if (skillId) {
      query += ' AND skill_id = $1';
      params.push(skillId);
    }

    query += ' ORDER BY display_order ASC';

    const result = await this.db.query(query, params);
    return result.rows.map((row: any) => this.mapBadge(row));
  }

  async checkBadgeEligibility(
    userId: string,
    badgeId: string
  ): Promise<boolean> {
    const badge = await this.getBadge(badgeId);

    // Check assessment score
    const assessmentResult = await this.db.query(
      `SELECT MAX(score) as max_score FROM assessment_attempts 
       WHERE user_id = $1`,
      [userId]
    );

    if (
      !assessmentResult.rows[0].max_score ||
      assessmentResult.rows[0].max_score < badge.requirements.assessmentScore
    ) {
      return false;
    }

    // Check practical projects
    const projectResult = await this.db.query(
      `SELECT COUNT(*) as count FROM portfolio_items 
       WHERE user_id = $1 AND type = 'project'`,
      [userId]
    );

    if (
      projectResult.rows[0].count < badge.requirements.practicalProjects
    ) {
      return false;
    }

    // Check endorsements
    const endorsementResult = await this.db.query(
      `SELECT COUNT(*) as count FROM skill_endorsements 
       WHERE user_id = $1`,
      [userId]
    );

    return (
      endorsementResult.rows[0].count >=
      badge.requirements.recommendationCount
    );
  }

  async awardBadge(userId: string, badgeId: string): Promise<Certification> {
    const badge = await this.getBadge(badgeId);

    const certification = await this.createCertification({
      userId,
      skillId: badge.skillId,
      level: badge.level,
      type: 'skill-badge',
      assessmentScore: badge.requirements.assessmentScore,
    });

    return certification;
  }

  async getCertificationStats(): Promise<CertificationStats> {
    const statsResult = await this.db.query(`
      SELECT 
        COUNT(*) as total,
        level,
        status
      FROM certifications
      GROUP BY level, status
    `);

    const byLevel: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const row of statsResult.rows) {
      byLevel[row.level] = (byLevel[row.level] || 0) + row.count;
      byStatus[row.status] = (byStatus[row.status] || 0) + row.count;
    }

    const skillResult = await this.db.query(`
      SELECT skill_id, COUNT(*) as count
      FROM certifications
      GROUP BY skill_id
      ORDER BY count DESC
      LIMIT 10
    `);

    return {
      totalCertifications: statsResult.rows.reduce(
        (sum: number, row: any) => sum + row.count,
        0
      ),
      certificationsByLevel: byLevel,
      certificationsBySkill: skillResult.rows.map((row: any) => ({
        skillId: row.skill_id,
        count: row.count,
      })),
      activeCredentials: byStatus['earned'] || 0,
      expiredCredentials: byStatus['expired'] || 0,
      earningTrend: [], // Calculate from historical data
    };
  }

  private calculateExpiryDate(level: string): Date {
    const expiryYears: Record<string, number> = {
      foundational: 1,
      professional: 2,
      expert: 3,
      master: 5,
    };

    const date = new Date();
    date.setFullYear(date.getFullYear() + (expiryYears[level] || 2));
    return date;
  }

  private calculateTrustLevel(
    isValid: boolean,
    verificationCount: number
  ): 'high' | 'medium' | 'low' {
    if (!isValid) return 'low';
    if (verificationCount >= 3) return 'high';
    if (verificationCount >= 1) return 'medium';
    return 'low';
  }

  private mapCertification(row: any): Certification {
    return {
      id: row.id,
      skillId: row.skill_id,
      userId: row.user_id,
      level: row.level,
      type: row.type,
      earnedDate: row.earned_date,
      expiryDate: row.expiry_date,
      status: row.status,
      verificationToken: row.verification_token,
      credentialUrl: row.credential_url,
      issuer: row.issuer,
      metadata: row.metadata,
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

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async invalidateCache(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
