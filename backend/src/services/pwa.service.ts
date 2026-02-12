import { injectable, inject } from 'tsyringe';
import db from '../config/database';
import { redis } from '../config/redis';
import webpush from 'web-push';

interface PushSubscription {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
}

@injectable()
export class PWAService {
  constructor() {
    // Initialize web-push with VAPID keys
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        process.env.VAPID_EMAIL || 'admin@jobportal.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
      );
    }
  }

  /**
   * Get PWA manifest
   */
  getManifest() {
    return {
      name: 'Job Portal',
      short_name: 'Job Portal',
      description: 'Find your perfect job and career path',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait-primary',
      background_color: '#ffffff',
      theme_color: '#000000',
      screenshots: [
        {
          src: '/images/screenshot-1.png',
          sizes: '540x720',
          type: 'image/png',
        },
        {
          src: '/images/screenshot-2.png',
          sizes: '540x720',
          type: 'image/png',
        },
      ],
      icons: [
        {
          src: '/images/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/images/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/images/icon-maskable.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
      categories: ['productivity', 'business'],
      shortcuts: [
        {
          name: 'Find Jobs',
          short_name: 'Jobs',
          description: 'Browse job listings',
          url: '/jobs',
          icons: [{ src: '/images/job-icon.png', sizes: '96x96' }],
        },
        {
          name: 'My Applications',
          short_name: 'Applications',
          description: 'View your applications',
          url: '/applications',
          icons: [{ src: '/images/app-icon.png', sizes: '96x96' }],
        },
        {
          name: 'Career Path',
          short_name: 'Career',
          description: 'Explore your career path',
          url: '/career/pathway',
          icons: [{ src: '/images/career-icon.png', sizes: '96x96' }],
        },
      ],
    };
  }

  /**
   * Subscribe user to push notifications
   */
  async subscribeToPush(
    userId: string,
    subscription: PushSubscription,
  ): Promise<boolean> {
    const existing = await db('pwa_subscriptions')
      .where('userId', userId)
      .andWhere('endpoint', subscription.endpoint)
      .first();

    if (existing) {
      // Update existing subscription
      await db('pwa_subscriptions')
        .where('userId', userId)
        .andWhere('endpoint', subscription.endpoint)
        .update({
          subscriptionActive: true,
          updatedAt: new Date(),
        });
    } else {
      // Create new subscription
      await db('pwa_subscriptions').insert({
        userId,
        endpoint: subscription.endpoint,
        auth: subscription.keys.auth,
        p256dh: subscription.keys.p256dh,
        subscriptionActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Cache subscription count
    await redis.del(`push_subs:${userId}`);

    return true;
  }

  /**
   * Unsubscribe user from push notifications
   */
  async unsubscribeFromPush(
    userId: string,
    endpoint: string,
  ): Promise<boolean> {
    await db('pwa_subscriptions')
      .where('userId', userId)
      .andWhere('endpoint', endpoint)
      .update({
        subscriptionActive: false,
      });

    await redis.del(`push_subs:${userId}`);

    return true;
  }

  /**
   * Send push notification to user
   */
  async sendNotification(
    userId: string,
    payload: NotificationPayload,
  ): Promise<number> {
    // Get all active subscriptions for user
    const subscriptions = await db('pwa_subscriptions')
      .where('userId', userId)
      .andWhere('subscriptionActive', true);

    let successCount = 0;

    for (const sub of subscriptions) {
      try {
        const pushSubscription: PushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.auth,
            p256dh: sub.p256dh,
          },
        };

        const data = {
          title: payload.title,
          options: {
            body: payload.body,
            icon: payload.icon || '/images/icon-192x192.png',
            badge: payload.badge || '/images/badge-72x72.png',
            tag: payload.tag || 'notification',
            data: payload.data || {},
          },
        };

        await webpush.sendNotification(pushSubscription, JSON.stringify(data));
        successCount++;
      } catch (error: any) {
        // If subscription is invalid, mark as inactive
        if (error.statusCode === 410 || error.statusCode === 404) {
          await db('pwa_subscriptions')
            .where('endpoint', sub.endpoint)
            .update({ subscriptionActive: false });
        }
        console.error('Push notification error:', error.message);
      }
    }

    return successCount;
  }

  /**
   * Send notification to multiple users
   */
  async sendNotificationToUsers(
    userIds: string[],
    payload: NotificationPayload,
  ): Promise<Record<string, number>> {
    const results: Record<string, number> = {};

    for (const userId of userIds) {
      results[userId] = await this.sendNotification(userId, payload);
    }

    return results;
  }

  /**
   * Track PWA installation
   */
  async trackInstallation(userId: string, userAgent: string): Promise<boolean> {
    await db('pwa_installations').insert({
      userId,
      userAgent,
      installedAt: new Date(),
    });

    return true;
  }

  /**
   * Get installation stats
   */
  async getInstallationStats(): Promise<{
    totalInstallations: number;
    weeklyInstallations: number;
    monthlyInstallations: number;
    uniqueUsers: number;
  }> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const totalInstallations = await db('pwa_installations').count('* as count').first();
    const weeklyInstallations = await db('pwa_installations')
      .where('installedAt', '>=', weekAgo)
      .count('* as count')
      .first();
    const monthlyInstallations = await db('pwa_installations')
      .where('installedAt', '>=', monthAgo)
      .count('* as count')
      .first();
    const uniqueUsers = await db('pwa_installations')
      .distinct('userId')
      .count('* as count')
      .first();

    return {
      totalInstallations: totalInstallations?.count || 0,
      weeklyInstallations: weeklyInstallations?.count || 0,
      monthlyInstallations: monthlyInstallations?.count || 0,
      uniqueUsers: uniqueUsers?.count || 0,
    };
  }

  /**
   * Get user push notification preferences
   */
  async getNotificationPreferences(userId: string): Promise<any> {
    const cached = await redis.get(`pwa_prefs:${userId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const prefs = await db('pwa_notification_preferences')
      .where('userId', userId)
      .first();

    if (!prefs) {
      // Create default preferences
      const defaultPrefs = {
        careerUpdates: true,
        mentorMessages: true,
        milestoneReminders: true,
        industryNews: true,
        jobRecommendations: true,
        applicationUpdates: true,
        frequency: 'daily', // daily, weekly, none
      };

      await db('pwa_notification_preferences').insert({
        userId,
        ...defaultPrefs,
        createdAt: new Date(),
      });

      await redis.setex(`pwa_prefs:${userId}`, 3600, JSON.stringify(defaultPrefs));

      return defaultPrefs;
    }

    const formatted = {
      careerUpdates: prefs.careerUpdates,
      mentorMessages: prefs.mentorMessages,
      milestoneReminders: prefs.milestoneReminders,
      industryNews: prefs.industryNews,
      jobRecommendations: prefs.jobRecommendations,
      applicationUpdates: prefs.applicationUpdates,
      frequency: prefs.frequency,
    };

    await redis.setex(`pwa_prefs:${userId}`, 3600, JSON.stringify(formatted));

    return formatted;
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<{
      careerUpdates: boolean;
      mentorMessages: boolean;
      milestoneReminders: boolean;
      industryNews: boolean;
      jobRecommendations: boolean;
      applicationUpdates: boolean;
      frequency: 'daily' | 'weekly' | 'none';
    }>,
  ): Promise<boolean> {
    await db('pwa_notification_preferences')
      .where('userId', userId)
      .update({
        ...preferences,
        updatedAt: new Date(),
      });

    await redis.del(`pwa_prefs:${userId}`);

    return true;
  }

  /**
   * Queue background sync
   */
  async queueBackgroundSync(
    userId: string,
    syncType: string,
    data: Record<string, any>,
  ): Promise<boolean> {
    await db('pwa_sync_queue').insert({
      userId,
      syncType,
      data: JSON.stringify(data),
      synced: false,
      createdAt: new Date(),
    });

    // Trigger sync if not already running
    await redis.lpush(`sync_queue:${userId}`, syncType);

    return true;
  }

  /**
   * Get pending sync items
   */
  async getPendingSyncItems(userId: string): Promise<any[]> {
    return db('pwa_sync_queue')
      .where('userId', userId)
      .andWhere('synced', false)
      .orderBy('createdAt', 'asc');
  }

  /**
   * Mark sync item as complete
   */
  async markSyncComplete(syncId: string): Promise<boolean> {
    await db('pwa_sync_queue').where('id', syncId).update({
      synced: true,
      syncedAt: new Date(),
    });

    return true;
  }

  /**
   * Get cache strategy recommendations
   */
  getCacheStrategies() {
    return {
      networkFirst: [
        '/api/jobs',
        '/api/applications',
        '/api/career',
        '/api/mentorship',
      ],
      cacheFirst: [
        '/images',
        '/styles',
        '/scripts',
        '/fonts',
      ],
      staleWhileRevalidate: [
        '/api/users/profile',
        '/api/analytics',
        '/api/market',
      ],
    };
  }

  /**
   * Get offline fallback page
   */
  getOfflineFallback() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Job Portal - Offline</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #f5f5f5;
      margin: 0;
    }
    .offline-container {
      background: white;
      padding: 40px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      max-width: 400px;
    }
    h1 { color: #333; margin: 0 0 10px; }
    p { color: #666; line-height: 1.6; }
    .icon {
      font-size: 48px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="offline-container">
    <div class="icon">📡</div>
    <h1>You're Offline</h1>
    <p>It looks like your internet connection is down. Some features may be limited.</p>
    <p>We'll sync your data when you're back online.</p>
  </div>
</body>
</html>
    `;
  }
}
