/**
 * Portfolio Service
 * Manages user portfolios, portfolio items, and portfolio analytics
 */

import { Redis } from 'ioredis';
import {
  Portfolio,
  PortfolioItem,
  PortfolioItemStatus,
  VisibilityLevel,
  PortfolioItemType,
  CreatePortfolioItemRequest,
  UpdatePortfolioRequest,
  PortfolioAnalytics,
  PortfolioStats,
} from '../types/certification.types';

export interface IPortfolioService {
  createPortfolio(userId: string): Promise<Portfolio>;
  getPortfolio(portfolioId: string): Promise<Portfolio>;
  getUserPortfolio(userId: string): Promise<Portfolio>;
  updatePortfolio(
    portfolioId: string,
    request: UpdatePortfolioRequest
  ): Promise<Portfolio>;
  publishPortfolio(portfolioId: string): Promise<Portfolio>;
  addItem(
    portfolioId: string,
    request: CreatePortfolioItemRequest
  ): Promise<PortfolioItem>;
  updateItem(
    portfolioId: string,
    itemId: string,
    request: Partial<CreatePortfolioItemRequest>
  ): Promise<PortfolioItem>;
  removeItem(portfolioId: string, itemId: string): Promise<void>;
  reorderItems(
    portfolioId: string,
    itemIds: string[]
  ): Promise<void>;
  getPortfolioAnalytics(portfolioId: string): Promise<PortfolioAnalytics>;
  getPortfolioStats(): Promise<PortfolioStats>;
  searchPortfolios(query: string): Promise<Portfolio[]>;
}

export class PortfolioService implements IPortfolioService {
  constructor(private db: any, private redis: Redis) {}

  async createPortfolio(userId: string): Promise<Portfolio> {
    const portfolio: Portfolio = {
      id: this.generateId(),
      userId,
      title: `${userId}'s Portfolio`,
      bio: '',
      profileImage: '',
      items: [],
      certifications: [],
      skills: [],
      stats: {
        totalProjects: 0,
        totalCertifications: 0,
        totalEndorsements: 0,
        viewCount: 0,
      },
      published: false,
      publicUrl: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db.query(
      `INSERT INTO portfolios 
      (id, user_id, title, bio, profile_image, published, public_url, stats, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        portfolio.id,
        portfolio.userId,
        portfolio.title,
        portfolio.bio,
        portfolio.profileImage,
        portfolio.published,
        portfolio.publicUrl,
        JSON.stringify(portfolio.stats),
        portfolio.createdAt,
        portfolio.updatedAt,
      ]
    );

    return portfolio;
  }

  async getPortfolio(portfolioId: string): Promise<Portfolio> {
    const cached = await this.redis.get(`portfolio:${portfolioId}`);
    if (cached) return JSON.parse(cached);

    const result = await this.db.query(
      'SELECT * FROM portfolios WHERE id = $1',
      [portfolioId]
    );

    if (result.rows.length === 0) {
      throw new Error('Portfolio not found');
    }

    // Get items
    const itemsResult = await this.db.query(
      'SELECT * FROM portfolio_items WHERE portfolio_id = $1',
      [portfolioId]
    );

    const portfolio = this.mapPortfolio(result.rows[0]);
    portfolio.items = itemsResult.rows.map((row: any) =>
      this.mapPortfolioItem(row)
    );

    await this.redis.setex(
      `portfolio:${portfolioId}`,
      3600,
      JSON.stringify(portfolio)
    );

    return portfolio;
  }

  async getUserPortfolio(userId: string): Promise<Portfolio> {
    const result = await this.db.query(
      'SELECT * FROM portfolios WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return this.createPortfolio(userId);
    }

    return this.getPortfolio(result.rows[0].id);
  }

  async updatePortfolio(
    portfolioId: string,
    request: UpdatePortfolioRequest
  ): Promise<Portfolio> {
    const portfolio = await this.getPortfolio(portfolioId);
    const updated = { ...portfolio, ...request, updatedAt: new Date() };

    await this.db.query(
      `UPDATE portfolios SET 
      title = $1, bio = $2, profile_image = $3, banner_image = $4, 
      social_links = $5, updated_at = $6 WHERE id = $7`,
      [
        updated.title,
        updated.bio,
        updated.profileImage,
        updated.bannerImage,
        JSON.stringify(updated.socialLinks || {}),
        updated.updatedAt,
        portfolioId,
      ]
    );

    await this.invalidateCache(`portfolio:${portfolioId}`);
    return updated;
  }

  async publishPortfolio(portfolioId: string): Promise<Portfolio> {
    const portfolio = await this.getPortfolio(portfolioId);
    const publicUrl = this.generatePublicUrl(portfolio.userId);

    await this.db.query(
      `UPDATE portfolios SET published = true, public_url = $1 WHERE id = $2`,
      [publicUrl, portfolioId]
    );

    portfolio.published = true;
    portfolio.publicUrl = publicUrl;

    await this.invalidateCache(`portfolio:${portfolioId}`);
    return portfolio;
  }

  async addItem(
    portfolioId: string,
    request: CreatePortfolioItemRequest
  ): Promise<PortfolioItem> {
    const portfolio = await this.getPortfolio(portfolioId);

    const item: PortfolioItem = {
      id: this.generateId(),
      userId: portfolio.userId,
      type: request.type,
      title: request.title,
      description: request.description,
      skills: request.skills,
      startDate: request.startDate,
      endDate: request.endDate,
      status: 'published' as PortfolioItemStatus,
      visibility: 'public' as VisibilityLevel,
      links: request.links,
      media: request.media,
      achievements: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db.query(
      `INSERT INTO portfolio_items 
      (id, portfolio_id, user_id, type, title, description, skills, start_date, end_date, 
       status, visibility, links, media, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        item.id,
        portfolioId,
        item.userId,
        item.type,
        item.title,
        item.description,
        JSON.stringify(item.skills),
        item.startDate,
        item.endDate,
        item.status,
        item.visibility,
        JSON.stringify(item.links || {}),
        JSON.stringify(item.media || {}),
        item.createdAt,
        item.updatedAt,
      ]
    );

    // Update stats
    await this.updatePortfolioStats(portfolioId);
    await this.invalidateCache(`portfolio:${portfolioId}`);

    return item;
  }

  async updateItem(
    portfolioId: string,
    itemId: string,
    request: Partial<CreatePortfolioItemRequest>
  ): Promise<PortfolioItem> {
    const portfolio = await this.getPortfolio(portfolioId);
    const item = portfolio.items.find((i) => i.id === itemId);

    if (!item) {
      throw new Error('Item not found');
    }

    const updated = { ...item, ...request, updatedAt: new Date() };

    await this.db.query(
      `UPDATE portfolio_items SET 
      title = $1, description = $2, skills = $3, links = $4, media = $5, updated_at = $6
      WHERE id = $7 AND portfolio_id = $8`,
      [
        updated.title,
        updated.description,
        JSON.stringify(updated.skills),
        JSON.stringify(updated.links || {}),
        JSON.stringify(updated.media || {}),
        updated.updatedAt,
        itemId,
        portfolioId,
      ]
    );

    await this.invalidateCache(`portfolio:${portfolioId}`);
    return updated;
  }

  async removeItem(portfolioId: string, itemId: string): Promise<void> {
    await this.db.query(
      'DELETE FROM portfolio_items WHERE id = $1 AND portfolio_id = $2',
      [itemId, portfolioId]
    );

    await this.updatePortfolioStats(portfolioId);
    await this.invalidateCache(`portfolio:${portfolioId}`);
  }

  async reorderItems(
    portfolioId: string,
    itemIds: string[]
  ): Promise<void> {
    for (let i = 0; i < itemIds.length; i++) {
      await this.db.query(
        'UPDATE portfolio_items SET display_order = $1 WHERE id = $2 AND portfolio_id = $3',
        [i, itemIds[i], portfolioId]
      );
    }

    await this.invalidateCache(`portfolio:${portfolioId}`);
  }

  async getPortfolioAnalytics(portfolioId: string): Promise<PortfolioAnalytics> {
    const portfolio = await this.getPortfolio(portfolioId);

    const viewsResult = await this.db.query(
      `SELECT COUNT(*) as total FROM portfolio_views WHERE portfolio_id = $1`,
      [portfolioId]
    );

    const viewsByDayResult = await this.db.query(
      `SELECT DATE(viewed_at) as date, COUNT(*) as count 
       FROM portfolio_views WHERE portfolio_id = $1 
       GROUP BY DATE(viewed_at) ORDER BY date DESC LIMIT 30`,
      [portfolioId]
    );

    const engagementResult = await this.db.query(
      `SELECT COUNT(*) as clicks FROM portfolio_item_clicks 
       WHERE portfolio_id = $1`,
      [portfolioId]
    );

    const totalViews = parseInt(viewsResult.rows[0].total);
    const totalClicks = parseInt(engagementResult.rows[0].clicks);
    const conversionRate =
      totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

    return {
      totalViews,
      viewsByDay: viewsByDayResult.rows.map((row: any) => ({
        date: row.date,
        count: parseInt(row.count),
      })),
      topItems: portfolio.items.slice(0, 3),
      conversionRate,
      engagementScore: Math.min(100, conversionRate * 10),
    };
  }

  async getPortfolioStats(): Promise<PortfolioStats> {
    const totalResult = await this.db.query(
      'SELECT COUNT(*) as count FROM portfolios'
    );

    const publishedResult = await this.db.query(
      'SELECT COUNT(*) as count FROM portfolios WHERE published = true'
    );

    const itemsResult = await this.db.query(
      'SELECT AVG(item_count) as avg FROM (SELECT COUNT(*) as item_count FROM portfolio_items GROUP BY portfolio_id) sub'
    );

    const projectsResult = await this.db.query(
      "SELECT COUNT(*) as count FROM portfolio_items WHERE type = 'project'"
    );

    return {
      totalPortfolios: parseInt(totalResult.rows[0].count),
      publishedPortfolios: parseInt(publishedResult.rows[0].count),
      averageItemCount: parseInt(itemsResult.rows[0].avg) || 0,
      totalProjectsShared: parseInt(projectsResult.rows[0].count),
      totalCertificationsDisplayed: 0,
      viewsPerPortfolio: 0,
    };
  }

  async searchPortfolios(query: string): Promise<Portfolio[]> {
    const result = await this.db.query(
      `SELECT * FROM portfolios 
       WHERE published = true AND (title ILIKE $1 OR bio ILIKE $1)
       LIMIT 50`,
      [`%${query}%`]
    );

    return Promise.all(
      result.rows.map((row: any) => this.getPortfolio(row.id))
    );
  }

  private async updatePortfolioStats(portfolioId: string): Promise<void> {
    const itemsResult = await this.db.query(
      'SELECT COUNT(*) as count FROM portfolio_items WHERE portfolio_id = $1',
      [portfolioId]
    );

    const projectsResult = await this.db.query(
      "SELECT COUNT(*) as count FROM portfolio_items WHERE portfolio_id = $1 AND type = 'project'",
      [portfolioId]
    );

    const stats = {
      totalProjects: parseInt(projectsResult.rows[0].count),
      totalCertifications: 0,
      totalEndorsements: 0,
      viewCount: 0,
    };

    await this.db.query(
      'UPDATE portfolios SET stats = $1 WHERE id = $2',
      [JSON.stringify(stats), portfolioId]
    );
  }

  private mapPortfolio(row: any): Portfolio {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      bio: row.bio,
      profileImage: row.profile_image,
      bannerImage: row.banner_image,
      items: [],
      certifications: [],
      skills: [],
      stats: row.stats,
      published: row.published,
      publicUrl: row.public_url,
      socialLinks: row.social_links,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapPortfolioItem(row: any): PortfolioItem {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      description: row.description,
      skills: row.skills,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
      visibility: row.visibility,
      links: row.links,
      media: row.media,
      achievements: row.achievements || [],
      metrics: row.metrics,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePublicUrl(userId: string): string {
    const slug = userId.replace(/-/g, '').substring(0, 12);
    return `portfolio-${slug}`;
  }

  private async invalidateCache(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
