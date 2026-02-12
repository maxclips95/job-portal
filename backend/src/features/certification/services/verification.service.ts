/**
 * Verification Service
 * Handles credential verification, endorsements, and trust scoring
 */

import { Redis } from 'ioredis';
import {
  CertificationVerification,
  SkillEndorsement,
  VerificationType,
  VerificationStatus,
  SkillProfile,
} from '../types/certification.types';

export interface IVerificationService {
  createVerification(
    certificationId: string,
    verifierId: string,
    type: VerificationType,
    evidence?: string[]
  ): Promise<CertificationVerification>;
  approveVerification(
    verificationId: string,
    notes?: string
  ): Promise<CertificationVerification>;
  rejectVerification(
    verificationId: string,
    notes: string
  ): Promise<CertificationVerification>;
  endorseSkill(
    userId: string,
    skillId: string,
    endorsedBy: string,
    level?: string,
    message?: string
  ): Promise<SkillEndorsement>;
  removeEndorsement(endorsementId: string): Promise<void>;
  getSkillProfile(userId: string): Promise<SkillProfile>;
  getEndorsementStats(userId: string): Promise<{
    total: number;
    bySkill: { skillId: string; count: number }[];
    trustScore: number;
  }>;
  calculateTrustScore(userId: string): Promise<number>;
  verifyCredential(token: string): Promise<boolean>;
}

export class VerificationService implements IVerificationService {
  constructor(private db: any, private redis: Redis) {}

  async createVerification(
    certificationId: string,
    verifierId: string,
    type: VerificationType,
    evidence?: string[]
  ): Promise<CertificationVerification> {
    const verification: CertificationVerification = {
      id: this.generateId(),
      certificationId,
      verifierId,
      type,
      status: 'pending' as VerificationStatus,
      notes: '',
      evidence,
      expiresAt: this.calculateVerificationExpiry(type),
    };

    await this.db.query(
      `INSERT INTO certification_verifications 
      (id, certification_id, verifier_id, type, status, evidence, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        verification.id,
        certification_id,
        verifierId,
        type,
        verification.status,
        JSON.stringify(evidence || []),
        verification.expiresAt,
      ]
    );

    return verification;
  }

  async approveVerification(
    verificationId: string,
    notes?: string
  ): Promise<CertificationVerification> {
    const result = await this.db.query(
      `UPDATE certification_verifications 
       SET status = $1, notes = $2, verified_at = $3 
       WHERE id = $4 RETURNING *`,
      ['approved', notes || '', new Date(), verificationId]
    );

    if (result.rows.length === 0) {
      throw new Error('Verification not found');
    }

    return this.mapVerification(result.rows[0]);
  }

  async rejectVerification(
    verificationId: string,
    notes: string
  ): Promise<CertificationVerification> {
    const result = await this.db.query(
      `UPDATE certification_verifications 
       SET status = $1, notes = $2 
       WHERE id = $3 RETURNING *`,
      ['rejected', notes, verificationId]
    );

    if (result.rows.length === 0) {
      throw new Error('Verification not found');
    }

    return this.mapVerification(result.rows[0]);
  }

  async endorseSkill(
    userId: string,
    skillId: string,
    endorsedBy: string,
    level?: string,
    message?: string
  ): Promise<SkillEndorsement> {
    // Check if already endorsed
    const existingResult = await this.db.query(
      `SELECT * FROM skill_endorsements 
       WHERE user_id = $1 AND skill_id = $2 AND endorsed_by = $3`,
      [userId, skillId, endorsedBy]
    );

    if (existingResult.rows.length > 0) {
      throw new Error('User already endorsed this skill by this person');
    }

    const endorsement: SkillEndorsement = {
      id: this.generateId(),
      userId,
      skillId,
      endorsedBy,
      endorsementDate: new Date(),
      level: (level as any) || 'intermediate',
      message,
      verified: false,
      weight: this.calculateEndorsementWeight(endorsedBy),
    };

    await this.db.query(
      `INSERT INTO skill_endorsements 
      (id, user_id, skill_id, endorsed_by, level, message, verified, weight, endorsement_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        endorsement.id,
        userId,
        skillId,
        endorsedBy,
        endorsement.level,
        message,
        endorsement.verified,
        endorsement.weight,
        endorsement.endorsementDate,
      ]
    );

    await this.invalidateCache(`skill-profile:${userId}`);
    return endorsement;
  }

  async removeEndorsement(endorsementId: string): Promise<void> {
    const result = await this.db.query(
      'SELECT user_id FROM skill_endorsements WHERE id = $1',
      [endorsementId]
    );

    if (result.rows.length === 0) {
      throw new Error('Endorsement not found');
    }

    const userId = result.rows[0].user_id;

    await this.db.query('DELETE FROM skill_endorsements WHERE id = $1', [
      endorsementId,
    ]);

    await this.invalidateCache(`skill-profile:${userId}`);
  }

  async getSkillProfile(userId: string): Promise<SkillProfile> {
    const cached = await this.redis.get(`skill-profile:${userId}`);
    if (cached) return JSON.parse(cached);

    const skillsResult = await this.db.query(
      `SELECT * FROM skill_endorsements WHERE user_id = $1 
       ORDER BY weight DESC`,
      [userId]
    );

    const certificationsResult = await this.db.query(
      `SELECT * FROM certifications WHERE user_id = $1 AND status = 'earned'`,
      [userId]
    );

    const scoresResult = await this.db.query(
      `SELECT DISTINCT ON (assessment_id) assessment_id, MAX(score) as best_score, COUNT(*) as attempt_count
       FROM assessment_attempts WHERE user_id = $1 AND status = 'completed'
       GROUP BY assessment_id`,
      [userId]
    );

    const trustScore = await this.calculateTrustScore(userId);

    const profile: SkillProfile = {
      userId,
      skills: skillsResult.rows.map((row: any) =>
        this.mapSkillEndorsement(row)
      ),
      certifications: certificationsResult.rows.map((row: any) => ({
        id: row.id,
        skillId: row.skill_id,
        level: row.level,
        earnedDate: row.earned_date,
      })),
      assessmentScores: scoresResult.rows.map((row: any) => ({
        skillId: row.assessment_id,
        bestScore: row.best_score,
        attemptCount: parseInt(row.attempt_count),
      })),
      endorsementStats: {
        totalEndorsements: skillsResult.rows.length,
        topEndorsedSkill:
          skillsResult.rows.length > 0 ? skillsResult.rows[0].skill_id : '',
        trustScore,
      },
    };

    await this.redis.setex(
      `skill-profile:${userId}`,
      86400,
      JSON.stringify(profile)
    );

    return profile;
  }

  async getEndorsementStats(userId: string): Promise<{
    total: number;
    bySkill: { skillId: string; count: number }[];
    trustScore: number;
  }> {
    const result = await this.db.query(
      `SELECT skill_id, COUNT(*) as count 
       FROM skill_endorsements WHERE user_id = $1
       GROUP BY skill_id ORDER BY count DESC`,
      [userId]
    );

    const total = result.rows.reduce(
      (sum: number, row: any) => sum + parseInt(row.count),
      0
    );

    const trustScore = await this.calculateTrustScore(userId);

    return {
      total,
      bySkill: result.rows.map((row: any) => ({
        skillId: row.skill_id,
        count: parseInt(row.count),
      })),
      trustScore,
    };
  }

  async calculateTrustScore(userId: string): Promise<number> {
    // Endorsement score (max 30 points)
    const endorsementResult = await this.db.query(
      `SELECT SUM(weight) as total FROM skill_endorsements WHERE user_id = $1`,
      [userId]
    );
    const endorsementScore = Math.min(
      30,
      (endorsementResult.rows[0].total || 0) / 10
    );

    // Verification score (max 30 points)
    const verificationResult = await this.db.query(
      `SELECT COUNT(*) as count FROM certification_verifications 
       WHERE status = 'approved' AND EXISTS (
         SELECT 1 FROM certifications WHERE certifications.id = certification_id AND certifications.user_id = $1
       )`,
      [userId]
    );
    const verificationScore = Math.min(
      30,
      parseInt(verificationResult.rows[0].count) * 5
    );

    // Certification score (max 25 points)
    const certResult = await this.db.query(
      `SELECT COUNT(*) as count FROM certifications WHERE user_id = $1 AND status = 'earned'`,
      [userId]
    );
    const certificationScore = Math.min(
      25,
      parseInt(certResult.rows[0].count) * 5
    );

    // Assessment score (max 15 points)
    const assessmentResult = await this.db.query(
      `SELECT AVG(score) as avg FROM assessment_attempts WHERE user_id = $1 AND status = 'completed'`,
      [userId]
    );
    const assessmentScore = Math.min(
      15,
      ((assessmentResult.rows[0].avg || 0) / 100) * 15
    );

    const totalScore =
      endorsementScore +
      verificationScore +
      certificationScore +
      assessmentScore;

    return Math.round(totalScore);
  }

  async verifyCredential(token: string): Promise<boolean> {
    const result = await this.db.query(
      'SELECT * FROM certifications WHERE verification_token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const cert = result.rows[0];
    const isValid =
      cert.status === 'earned' &&
      (!cert.expiry_date || cert.expiry_date > new Date());

    return isValid;
  }

  private calculateVerificationExpiry(type: VerificationType): Date {
    const expiryMonths: Record<VerificationType, number> = {
      'peer-review': 12,
      'employer-check': 24,
      'automated-scan': 6,
      'expert-review': 36,
    };

    const date = new Date();
    date.setMonth(date.getMonth() + (expiryMonths[type] || 12));
    return date;
  }

  private calculateEndorsementWeight(endorsedBy: string): number {
    // Can be enhanced with user reputation system
    // For now, simple calculation based on endorser ID hash
    const hash = endorsedBy.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);

    return 0.5 + (Math.abs(hash) % 10) / 10; // 0.5 to 1.5
  }

  private mapVerification(row: any): CertificationVerification {
    return {
      id: row.id,
      certificationId: row.certification_id,
      verifierId: row.verifier_id,
      type: row.type,
      status: row.status,
      notes: row.notes,
      evidence: row.evidence,
      verifiedAt: row.verified_at,
      expiresAt: row.expires_at,
    };
  }

  private mapSkillEndorsement(row: any): SkillEndorsement {
    return {
      id: row.id,
      userId: row.user_id,
      skillId: row.skill_id,
      endorsedBy: row.endorsed_by,
      endorsementDate: row.endorsement_date,
      level: row.level,
      message: row.message,
      verified: row.verified,
      weight: row.weight,
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async invalidateCache(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
