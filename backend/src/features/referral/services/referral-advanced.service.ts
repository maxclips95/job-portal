/**
 * Community Service - Posts, Comments, Engagement
 */

import { Redis } from 'ioredis';

export class CommunityService {
  constructor(private db: any, private redis: Redis) {}

  async createPost(userId: string, type: string, title: string, content: string, tags: string[]): Promise<any> {
    const id = this.generateId();
    const post = {
      id,
      userId,
      type,
      title,
      content,
      tags,
      likes: 0,
      comments: 0,
      shares: 0,
      createdAt: new Date(),
    };

    await this.db.query(
      `INSERT INTO community_posts (id, user_id, type, title, content, tags, likes, comments, shares, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, userId, type, title, content, JSON.stringify(tags), 0, 0, 0, post.createdAt]
    );

    return post;
  }

  async getPost(postId: string): Promise<any> {
    const result = await this.db.query('SELECT * FROM community_posts WHERE id = $1', [postId]);
    return result.rows[0];
  }

  async listPosts(limit: number = 20, page: number = 1): Promise<any> {
    const offset = (page - 1) * limit;
    const result = await this.db.query(
      'SELECT * FROM community_posts ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows;
  }

  async likePost(postId: string, userId: string): Promise<void> {
    await this.db.query(
      'INSERT INTO post_likes (id, post_id, user_id) VALUES ($1, $2, $3)',
      [this.generateId(), postId, userId]
    );
    await this.db.query('UPDATE community_posts SET likes = likes + 1 WHERE id = $1', [postId]);
  }

  async createComment(postId: string, userId: string, content: string): Promise<any> {
    const id = this.generateId();
    const comment = {
      id,
      postId,
      userId,
      content,
      likes: 0,
      replies: 0,
      createdAt: new Date(),
    };

    await this.db.query(
      `INSERT INTO community_comments (id, post_id, user_id, content, likes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, postId, userId, content, 0, comment.createdAt]
    );

    await this.db.query('UPDATE community_posts SET comments = comments + 1 WHERE id = $1', [postId]);

    return comment;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Contribution Service - Track User Contributions
 */

export class ContributionService {
  constructor(private db: any, private redis: Redis) {}

  async logContribution(userId: string, type: string, title: string, points: number): Promise<any> {
    const id = this.generateId();
    const contribution = {
      id,
      userId,
      type,
      title,
      pointsEarned: points,
      createdAt: new Date(),
    };

    await this.db.query(
      `INSERT INTO contributions (id, user_id, type, title, points_earned, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, userId, type, title, points, contribution.createdAt]
    );

    // Update member level
    await this.updateMemberLevel(userId);

    return contribution;
  }

  async getUserContributions(userId: string): Promise<any[]> {
    const result = await this.db.query(
      'SELECT * FROM contributions WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  async getLeaderboard(limit: number = 50): Promise<any[]> {
    const result = await this.db.query(
      `SELECT user_id, SUM(points_earned) as total_points, COUNT(*) as contribution_count
       FROM contributions GROUP BY user_id ORDER BY total_points DESC LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  private async updateMemberLevel(userId: string): Promise<void> {
    const pointsResult = await this.db.query(
      'SELECT SUM(points_earned) as total FROM contributions WHERE user_id = $1',
      [userId]
    );

    const totalPoints = pointsResult.rows[0]?.total || 0;
    const level = this.determineLevelFromPoints(totalPoints);

    await this.db.query(
      'UPDATE community_members SET level = $1, total_points = $2 WHERE user_id = $3',
      [level, totalPoints, userId]
    );
  }

  private determineLevelFromPoints(points: number): string {
    if (points >= 1000) return 'platinum';
    if (points >= 500) return 'gold';
    if (points >= 200) return 'silver';
    return 'bronze';
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Analytics Service - Reporting and Metrics
 */

export class AnalyticsService {
  constructor(private db: any, private redis: Redis) {}

  async getReferralAnalytics(userId?: string): Promise<any> {
    let query = 'SELECT COUNT(*) as total, status, AVG(EXTRACT(DAY FROM (accepted_at - created_at))) as avg_days FROM referrals';
    const params: any[] = [];

    if (userId) {
      query += ' WHERE referrer_id = $1';
      params.push(userId);
    }

    query += ' GROUP BY status';

    const result = await this.db.query(query, params);

    return {
      total: result.rows.reduce((sum: number, row: any) => sum + parseInt(row.total), 0),
      byStatus: result.rows.reduce((acc: any, row: any) => {
        acc[row.status] = parseInt(row.total);
        return acc;
      }, {}),
    };
  }

  async getPayoutAnalytics(): Promise<any> {
    const result = await this.db.query(
      `SELECT status, COUNT(*) as count, SUM(amount) as total_amount
       FROM payouts GROUP BY status`
    );

    return {
      byStatus: result.rows.reduce((acc: any, row: any) => {
        acc[row.status] = { count: parseInt(row.count), amount: parseFloat(row.total_amount) };
        return acc;
      }, {}),
    };
  }

  async getCommunityAnalytics(): Promise<any> {
    const totalMembersResult = await this.db.query('SELECT COUNT(*) as count FROM community_members');
    const totalPostsResult = await this.db.query('SELECT COUNT(*) as count FROM community_posts');

    return {
      totalMembers: parseInt(totalMembersResult.rows[0].count),
      totalPosts: parseInt(totalPostsResult.rows[0].count),
    };
  }
}

/**
 * Stripe Integration Service
 */

export class StripeIntegrationService {
  constructor(private stripe: any, private db: any) {}

  async createPaymentIntent(userId: string, amount: number): Promise<any> {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: { userId },
    });

    return paymentIntent;
  }

  async createConnectAccount(userId: string, email: string): Promise<any> {
    const account = await this.stripe.accounts.create({
      type: 'express',
      email,
      metadata: { userId },
    });

    return account;
  }

  async createPayout(accountId: string, amount: number): Promise<any> {
    const payout = await this.stripe.payouts.create(
      {
        amount: Math.round(amount * 100),
        currency: 'usd',
      },
      { stripeAccount: accountId }
    );

    return payout;
  }

  async handleWebhook(event: any): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded':
        // Handle successful payment
        break;
      case 'payout.paid':
        // Handle successful payout
        break;
    }
  }
}

/**
 * Email Service - Notification and Referral Sharing
 */

export class EmailService {
  constructor(private emailProvider: any, private db: any) {}

  async sendReferralInvite(referrerEmail: string, referralCode: string, referralLink: string, recipientEmails: string[]): Promise<void> {
    const message = `
      Join me on JobPortal! Use my referral link: ${referralLink}
      Referral Code: ${referralCode}
    `;

    for (const email of recipientEmails) {
      await this.emailProvider.send({
        to: email,
        subject: `${referrerEmail} invited you to JobPortal`,
        body: message,
      });
    }
  }

  async sendRewardNotification(userId: string, rewardAmount: number): Promise<void> {
    const userResult = await this.db.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) return;

    await this.emailProvider.send({
      to: userResult.rows[0].email,
      subject: `You earned $${rewardAmount} in rewards!`,
      body: `Congratulations! You've earned $${rewardAmount} in referral rewards.`,
    });
  }

  async sendPayoutNotification(userId: string, payoutAmount: number, status: string): Promise<void> {
    const userResult = await this.db.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) return;

    const subject = status === 'completed' ? 'Your payout has been processed' : 'Your payout is pending';

    await this.emailProvider.send({
      to: userResult.rows[0].email,
      subject,
      body: `Your payout of $${payoutAmount} is now ${status}.`,
    });
  }
}
