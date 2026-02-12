/**
 * Referral Service
 * Manages referral links, codes, tracking, and conversion
 */

import { Redis } from 'ioredis';
import { Referral, ReferralStatus } from '../types/referral.types';
import crypto from 'crypto';

export interface IReferralService {
  createReferral(userId: string, source?: string): Promise<Referral>;
  getReferral(referralId: string): Promise<Referral>;
  getReferralByCode(code: string): Promise<Referral>;
  acceptReferral(code: string, refereeId: string): Promise<Referral>;
  getUserReferrals(userId: string): Promise<Referral[]>;
  getReferralStats(userId: string): Promise<any>;
  expireReferral(referralId: string): Promise<void>;
}

export class ReferralService implements IReferralService {
  constructor(private db: any, private redis: Redis) {}

  async createReferral(userId: string, source?: string): Promise<Referral> {
    const code = this.generateCode();
    const referral: Referral = {
      id: this.generateId(),
      referrerId: userId,
      referralCode: code,
      referralLink: `${process.env.APP_URL}/join/${code}`,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: this.getExpiryDate(90),
      metadata: { source },
    };

    await this.db.query(
      `INSERT INTO referrals (id, referrer_id, referral_code, referral_link, status, created_at, expires_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [referral.id, userId, code, referral.referralLink, referral.status, referral.createdAt, referral.expiresAt, JSON.stringify(referral.metadata)]
    );

    return referral;
  }

  async getReferral(referralId: string): Promise<Referral> {
    const result = await this.db.query('SELECT * FROM referrals WHERE id = $1', [referralId]);
    if (result.rows.length === 0) throw new Error('Referral not found');
    return this.mapReferral(result.rows[0]);
  }

  async getReferralByCode(code: string): Promise<Referral> {
    const result = await this.db.query('SELECT * FROM referrals WHERE referral_code = $1', [code]);
    if (result.rows.length === 0) throw new Error('Invalid referral code');
    return this.mapReferral(result.rows[0]);
  }

  async acceptReferral(code: string, refereeId: string): Promise<Referral> {
    const referral = await this.getReferralByCode(code);
    const acceptedAt = new Date();

    await this.db.query(
      'UPDATE referrals SET status = $1, referee_id = $2, accepted_at = $3 WHERE id = $4',
      ['active', refereeId, acceptedAt, referral.id]
    );

    referral.refereeId = refereeId;
    referral.acceptedAt = acceptedAt;
    referral.status = 'active';

    return referral;
  }

  async getUserReferrals(userId: string): Promise<Referral[]> {
    const result = await this.db.query(
      'SELECT * FROM referrals WHERE referrer_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows.map((row: any) => this.mapReferral(row));
  }

  async getReferralStats(userId: string): Promise<any> {
    const statsResult = await this.db.query(
      `SELECT status, COUNT(*) as count FROM referrals WHERE referrer_id = $1 GROUP BY status`,
      [userId]
    );

    const stats: Record<string, number> = {};
    for (const row of statsResult.rows) {
      stats[row.status] = parseInt(row.count);
    }

    return {
      total: Object.values(stats).reduce((a: number, b: number) => a + b, 0),
      byStatus: stats,
    };
  }

  async expireReferral(referralId: string): Promise<void> {
    await this.db.query('UPDATE referrals SET status = $1 WHERE id = $2', ['expired', referralId]);
  }

  private generateCode(): string {
    return crypto.randomBytes(6).toString('hex').toUpperCase();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getExpiryDate(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  private mapReferral(row: any): Referral {
    return {
      id: row.id,
      referrerId: row.referrer_id,
      refereeId: row.referee_id,
      referralCode: row.referral_code,
      referralLink: row.referral_link,
      status: row.status,
      createdAt: row.created_at,
      acceptedAt: row.accepted_at,
      expiresAt: row.expires_at,
      metadata: row.metadata,
    };
  }
}

/**
 * Reward Service
 * Manages reward calculation, tracking, and distribution
 */

export interface IRewardService {
  createReward(referralId: string, userId: string, amount: number): Promise<any>;
  getRewards(userId: string): Promise<any[]>;
  redeemReward(rewardId: string): Promise<any>;
  getRewardBalance(userId: string): Promise<number>;
}

export class RewardService implements IRewardService {
  constructor(private db: any, private redis: Redis) {}

  async createReward(referralId: string, userId: string, amount: number): Promise<any> {
    const reward = {
      id: this.generateId(),
      referralId,
      userId,
      rewardType: 'credit',
      amount,
      currency: 'USD',
      status: 'pending',
      earnedAt: new Date(),
      expiresAt: this.getExpiryDate(365),
      description: `Referral reward for ${amount}`,
    };

    await this.db.query(
      `INSERT INTO rewards (id, referral_id, user_id, reward_type, amount, currency, status, earned_at, expires_at, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [reward.id, referralId, userId, reward.rewardType, reward.amount, reward.currency, reward.status, reward.earnedAt, reward.expiresAt, reward.description]
    );

    return reward;
  }

  async getRewards(userId: string): Promise<any[]> {
    const result = await this.db.query('SELECT * FROM rewards WHERE user_id = $1', [userId]);
    return result.rows;
  }

  async redeemReward(rewardId: string): Promise<any> {
    await this.db.query('UPDATE rewards SET status = $1, redeemed_at = $2 WHERE id = $3',
      ['redeemed', new Date(), rewardId]
    );
    return { success: true };
  }

  async getRewardBalance(userId: string): Promise<number> {
    const result = await this.db.query(
      `SELECT SUM(amount) as total FROM rewards WHERE user_id = $1 AND status != 'redeemed'`,
      [userId]
    );
    return result.rows[0]?.total || 0;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getExpiryDate(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }
}

/**
 * Payment Service
 * Manages payment methods and integration with Stripe
 */

export interface IPaymentService {
  addPaymentMethod(userId: string, method: any): Promise<any>;
  getPaymentMethods(userId: string): Promise<any[]>;
  updatePaymentMethod(methodId: string, updates: any): Promise<any>;
  deletePaymentMethod(methodId: string): Promise<void>;
  verifyPaymentMethod(methodId: string): Promise<boolean>;
}

export class PaymentService implements IPaymentService {
  constructor(private db: any, private redis: Redis, private stripe?: any) {}

  async addPaymentMethod(userId: string, method: any): Promise<any> {
    const paymentInfo = {
      id: this.generateId(),
      userId,
      method: method.method,
      isVerified: false,
      primary: method.primary || false,
      createdAt: new Date(),
    };

    // Integrate with Stripe if using card payment
    if (method.stripePaymentMethodId) {
      paymentInfo.stripePaymentMethodId = method.stripePaymentMethodId;
    }

    await this.db.query(
      `INSERT INTO payment_info (id, user_id, method, stripe_payment_method_id, primary, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [paymentInfo.id, userId, paymentInfo.method, method.stripePaymentMethodId, paymentInfo.primary, paymentInfo.createdAt, new Date()]
    );

    return paymentInfo;
  }

  async getPaymentMethods(userId: string): Promise<any[]> {
    const result = await this.db.query('SELECT * FROM payment_info WHERE user_id = $1', [userId]);
    return result.rows;
  }

  async updatePaymentMethod(methodId: string, updates: any): Promise<any> {
    await this.db.query(
      'UPDATE payment_info SET primary = $1, updated_at = $2 WHERE id = $3',
      [updates.primary, new Date(), methodId]
    );
    const result = await this.db.query('SELECT * FROM payment_info WHERE id = $1', [methodId]);
    return result.rows[0];
  }

  async deletePaymentMethod(methodId: string): Promise<void> {
    await this.db.query('DELETE FROM payment_info WHERE id = $1', [methodId]);
  }

  async verifyPaymentMethod(methodId: string): Promise<boolean> {
    await this.db.query('UPDATE payment_info SET is_verified = true WHERE id = $1', [methodId]);
    return true;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Payout Service
 * Manages payout requests and processing
 */

export interface IPayoutService {
  requestPayout(userId: string, paymentMethodId: string, frequency: string): Promise<any>;
  getPayouts(userId: string): Promise<any[]>;
  processPayout(payoutId: string): Promise<any>;
  getPayout(payoutId: string): Promise<any>;
}

export class PayoutService implements IPayoutService {
  constructor(private db: any, private redis: Redis, private stripe?: any) {}

  async requestPayout(userId: string, paymentMethodId: string, frequency: string): Promise<any> {
    const payout = {
      id: this.generateId(),
      userId,
      paymentInfoId: paymentMethodId,
      amount: 0,
      currency: 'USD',
      status: 'pending',
      frequency,
      rewardIds: [],
      requestedAt: new Date(),
    };

    await this.db.query(
      `INSERT INTO payouts (id, user_id, payment_info_id, amount, currency, status, frequency, requested_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [payout.id, userId, paymentMethodId, payout.amount, payout.currency, payout.status, frequency, payout.requestedAt]
    );

    return payout;
  }

  async getPayouts(userId: string): Promise<any[]> {
    const result = await this.db.query('SELECT * FROM payouts WHERE user_id = $1', [userId]);
    return result.rows;
  }

  async processPayout(payoutId: string): Promise<any> {
    await this.db.query(
      'UPDATE payouts SET status = $1, completed_at = $2 WHERE id = $3',
      ['processing', new Date(), payoutId]
    );
    return { success: true };
  }

  async getPayout(payoutId: string): Promise<any> {
    const result = await this.db.query('SELECT * FROM payouts WHERE id = $1', [payoutId]);
    return result.rows[0];
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
