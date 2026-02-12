/**
 * Screening Cache Service
 * Redis caching for screening results and job requirements
 * Improves performance and reduces database load
 */

import { logger } from '@/utils/logger';

interface CacheConfig {
  ttl: number; // Time to live in seconds
}

const CACHE_CONFIG = {
  JOB_REQUIREMENTS: { ttl: 86400 }, // 24 hours
  SCREENING_RESULTS: { ttl: 3600 }, // 1 hour
  ANALYTICS: { ttl: 3600 }, // 1 hour
  CANDIDATE_PROFILE: { ttl: 1800 }, // 30 minutes
};

export class ScreeningCacheService {
  private readonly PREFIX = 'screening:';
  
  constructor(private redisClient: any) {}

  /**
   * Get cached job requirements
   * @param jobId - UUID of job
   * @returns Job requirements object or null
   */
  async getJobRequirements(jobId: string): Promise<any | null> {
    try {
      const key = `${this.PREFIX}job:${jobId}`;
      const cached = await this.redisClient.get(key);

      if (cached) {
        logger.debug('Job requirements cache hit', { jobId });
        return JSON.parse(cached);
      }

      logger.debug('Job requirements cache miss', { jobId });
      return null;
    } catch (error) {
      logger.error('Cache get error', { error, jobId });
      return null; // Fail gracefully
    }
  }

  /**
   * Set job requirements in cache
   * @param jobId - UUID of job
   * @param requirements - Job requirements object
   */
  async setJobRequirements(jobId: string, requirements: any): Promise<void> {
    try {
      const key = `${this.PREFIX}job:${jobId}`;
      const ttl = CACHE_CONFIG.JOB_REQUIREMENTS.ttl;

      await this.redisClient.setex(
        key,
        ttl,
        JSON.stringify(requirements)
      );

      logger.debug('Job requirements cached', { jobId, ttl });
    } catch (error) {
      logger.error('Cache set error', { error, jobId });
      // Don't throw - caching is not critical
    }
  }

  /**
   * Get cached screening results
   * @param screeningJobId - UUID of screening job
   * @param filters - Filter parameters (used in cache key)
   * @returns Screening results or null
   */
  async getScreeningResults(
    screeningJobId: string,
    filters: any
  ): Promise<any | null> {
    try {
      const key = this.buildResultsCacheKey(screeningJobId, filters);
      const cached = await this.redisClient.get(key);

      if (cached) {
        logger.debug('Screening results cache hit', { screeningJobId });
        return JSON.parse(cached);
      }

      logger.debug('Screening results cache miss', { screeningJobId });
      return null;
    } catch (error) {
      logger.error('Cache get error', { error, screeningJobId });
      return null;
    }
  }

  /**
   * Set screening results in cache
   * @param screeningJobId - UUID of screening job
   * @param filters - Filter parameters
   * @param results - Screening results
   */
  async setScreeningResults(
    screeningJobId: string,
    filters: any,
    results: any
  ): Promise<void> {
    try {
      const key = this.buildResultsCacheKey(screeningJobId, filters);
      const ttl = CACHE_CONFIG.SCREENING_RESULTS.ttl;

      await this.redisClient.setex(
        key,
        ttl,
        JSON.stringify(results)
      );

      logger.debug('Screening results cached', { screeningJobId, ttl });
    } catch (error) {
      logger.error('Cache set error', { error, screeningJobId });
    }
  }

  /**
   * Get cached analytics
   * @param screeningJobId - UUID of screening job
   * @returns Analytics data or null
   */
  async getAnalytics(screeningJobId: string): Promise<any | null> {
    try {
      const key = `${this.PREFIX}analytics:${screeningJobId}`;
      const cached = await this.redisClient.get(key);

      if (cached) {
        logger.debug('Analytics cache hit', { screeningJobId });
        return JSON.parse(cached);
      }

      return null;
    } catch (error) {
      logger.error('Cache get error', { error, screeningJobId });
      return null;
    }
  }

  /**
   * Set analytics in cache
   * @param screeningJobId - UUID of screening job
   * @param analytics - Analytics data
   * @param ttl - Time to live in seconds
   */
  async setAnalytics(
    screeningJobId: string,
    analytics: any,
    ttl: number = CACHE_CONFIG.ANALYTICS.ttl
  ): Promise<void> {
    try {
      const key = `${this.PREFIX}analytics:${screeningJobId}`;

      await this.redisClient.setex(
        key,
        ttl,
        JSON.stringify(analytics)
      );

      logger.debug('Analytics cached', { screeningJobId, ttl });
    } catch (error) {
      logger.error('Cache set error', { error, screeningJobId });
    }
  }

  /**
   * Invalidate all caches for a screening job
   * @param screeningJobId - UUID of screening job
   */
  async invalidate(screeningJobId: string): Promise<void> {
    try {
      const pattern = `${this.PREFIX}*:${screeningJobId}*`;
      const keys = await this.redisClient.keys(pattern);

      if (keys.length > 0) {
        await this.redisClient.del(...keys);
        logger.info('Cache invalidated', { screeningJobId, keysDeleted: keys.length });
      }
    } catch (error) {
      logger.error('Cache invalidation error', { error, screeningJobId });
    }
  }

  /**
   * Get candidate profile from cache
   * @param candidateId - UUID of candidate
   * @returns Candidate profile or null
   */
  async getCandidateProfile(candidateId: string): Promise<any | null> {
    try {
      const key = `${this.PREFIX}candidate:${candidateId}`;
      const cached = await this.redisClient.get(key);

      if (cached) {
        logger.debug('Candidate profile cache hit', { candidateId });
        return JSON.parse(cached);
      }

      return null;
    } catch (error) {
      logger.error('Cache get error', { error, candidateId });
      return null;
    }
  }

  /**
   * Set candidate profile in cache
   * @param candidateId - UUID of candidate
   * @param profile - Candidate profile data
   */
  async setCandidateProfile(
    candidateId: string,
    profile: any
  ): Promise<void> {
    try {
      const key = `${this.PREFIX}candidate:${candidateId}`;
      const ttl = CACHE_CONFIG.CANDIDATE_PROFILE.ttl;

      await this.redisClient.setex(
        key,
        ttl,
        JSON.stringify(profile)
      );

      logger.debug('Candidate profile cached', { candidateId, ttl });
    } catch (error) {
      logger.error('Cache set error', { error, candidateId });
    }
  }

  /**
   * Clear all screening caches
   * Use with caution - affects all users
   */
  async clearAll(): Promise<void> {
    try {
      const pattern = `${this.PREFIX}*`;
      const keys = await this.redisClient.keys(pattern);

      if (keys.length > 0) {
        await this.redisClient.del(...keys);
        logger.warn('All screening caches cleared', { keysDeleted: keys.length });
      }
    } catch (error) {
      logger.error('Cache clear all error', { error });
    }
  }

  /**
   * Build cache key for results based on filters
   * Ensures different filter combinations have different cache entries
   */
  private buildResultsCacheKey(screeningJobId: string, filters: any): string {
    const filterStr = Object.entries(filters)
      .sort()
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    return `${this.PREFIX}results:${screeningJobId}:${filterStr}`;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    try {
      const info = await this.redisClient.info('stats');
      const keys = await this.redisClient.keys(`${this.PREFIX}*`);

      return {
        totalKeys: keys.length,
        memory: info.used_memory_human,
        hits: info.keyspace_hits,
        misses: info.keyspace_misses,
      };
    } catch (error) {
      logger.error('Cache stats error', { error });
      return null;
    }
  }
}
