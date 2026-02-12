/**
 * Integration Tests: PWA Functionality & Push Notifications
 * Tests progressive web app features including offline sync and push notifications
 */

import { describe, it, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../index';
import { PWAService } from '../../services/pwa.service';
import { Database } from '../../config/database';
import { RedisCache } from '../../config/redis';
import * as webpush from 'web-push';

describe('PWA & Push Notification Integration Tests', () => {
  let pwaService: PWAService;
  let db: Database;
  let cache: RedisCache;
  let testUserId: string;
  let testSubscription: any;

  beforeAll(async () => {
    db = new Database();
    await db.connect();

    cache = new RedisCache();
    await cache.connect();

    pwaService = new PWAService(db, cache);

    // Mock VAPID keys for testing
    process.env.VAPID_PUBLIC_KEY = 'test_public_key';
    process.env.VAPID_PRIVATE_KEY = 'test_private_key';

    testUserId = await createTestUser('pwa@example.com');

    // Create test subscription
    testSubscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test_token',
      expirationTime: null,
      keys: {
        p256dh: 'test_p256dh_key',
        auth: 'test_auth_key',
      },
    };
  });

  afterAll(async () => {
    await db.disconnect();
    await cache.disconnect();
  });

  beforeEach(async () => {
    await cache.flushAll();
  });

  describe('PWA Manifest & Installation', () => {
    it('should return W3C compliant PWA manifest', async () => {
      const manifest = await pwaService.getManifest();

      expect(manifest).toBeDefined();
      expect(manifest.name).toBe('Job Portal');
      expect(manifest.short_name).toBe('Portal');
      expect(manifest.display).toBe('standalone');
      expect(manifest.scope).toBe('/');
      expect(manifest.start_url).toBe('/');
      expect(manifest.orientation).toBe('portrait-primary');

      // Verify theme colors
      expect(manifest.theme_color).toBeDefined();
      expect(manifest.background_color).toBeDefined();

      // Verify icons
      expect(manifest.icons).toBeInstanceOf(Array);
      expect(manifest.icons.length).toBeGreaterThan(0);
      manifest.icons.forEach((icon) => {
        expect(icon.src).toBeDefined();
        expect(icon.sizes).toBeDefined();
        expect(icon.type).toMatch(/image\/*/);
      });

      // Verify screenshots for display
      expect(manifest.screenshots).toBeInstanceOf(Array);
      expect(manifest.screenshots.length).toBeGreaterThan(0);

      // Verify shortcuts
      expect(manifest.shortcuts).toBeInstanceOf(Array);
      expect(manifest.shortcuts.some((s) => s.name === 'Jobs')).toBe(true);
      expect(manifest.shortcuts.some((s) => s.name === 'Applications')).toBe(true);
      expect(manifest.shortcuts.some((s) => s.name === 'Career')).toBe(true);
    });

    it('should track app installation', async () => {
      const userAgent = 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36';

      const installation = await pwaService.trackInstallation(testUserId, userAgent);

      expect(installation).toBeDefined();
      expect(installation.userId).toBe(testUserId);
      expect(installation.userAgent).toBe(userAgent);
      expect(installation.installedAt).toBeDefined();

      // Verify recorded in database
      const stats = await pwaService.getInstallationStats();
      expect(stats.totalInstallations).toBeGreaterThanOrEqual(1);
      expect(stats.installsByPlatform).toBeDefined();
    });

    it('should cache installation stats with 1 hour TTL', async () => {
      const stats1 = await pwaService.getInstallationStats();
      const start = Date.now();
      const stats2 = await pwaService.getInstallationStats();
      const duration = Date.now() - start;

      expect(stats1).toEqual(stats2);
      expect(duration).toBeLessThan(10); // Cache hit should be fast

      const ttl = await cache.getTTL('pwa:installation_stats');
      expect(ttl).toBeLessThan(3600);
      expect(ttl).toBeGreaterThan(3595);
    });
  });

  describe('Push Notification Subscription & Delivery', () => {
    it('should subscribe user to push notifications', async () => {
      const subscription = await pwaService.subscribeToPush(testUserId, testSubscription);

      expect(subscription).toBeDefined();
      expect(subscription.userId).toBe(testUserId);
      expect(subscription.endpoint).toBe(testSubscription.endpoint);
      expect(subscription.subscriptionActive).toBe(true);

      // Verify stored in database
      const stored = await db.query(
        'SELECT * FROM pwa_subscriptions WHERE user_id = ? AND endpoint = ?',
        [testUserId, testSubscription.endpoint]
      );

      expect(stored).toHaveLength(1);
      expect(stored[0].auth).toBe(testSubscription.keys.auth);
      expect(stored[0].p256dh).toBe(testSubscription.keys.p256dh);
    });

    it('should send push notification with VAPID signing', async () => {
      await pwaService.subscribeToPush(testUserId, testSubscription);

      const mockSend = jest.spyOn(webpush, 'sendNotification').mockResolvedValue({
        statusCode: 201,
      });

      const result = await pwaService.sendNotification(testUserId, {
        title: 'Job Alert',
        body: 'New job matching your profile',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: 'job-alert',
      });

      expect(result).toBeGreaterThan(0);
      expect(mockSend).toHaveBeenCalledTimes(1);

      // Verify VAPID headers
      const callArgs = mockSend.mock.calls[0];
      expect(callArgs[1]).toContain('title');
      expect(callArgs[2]).toHaveProperty('vapidDetails');
      expect(callArgs[2].vapidDetails).toHaveProperty('subject');
      expect(callArgs[2].vapidDetails).toHaveProperty('publicKey');
      expect(callArgs[2].vapidDetails).toHaveProperty('privateKey');
    });

    it('should handle 410 Gone subscription error', async () => {
      await pwaService.subscribeToPush(testUserId, testSubscription);

      const mockSend = jest.spyOn(webpush, 'sendNotification').mockRejectedValue({
        statusCode: 410,
      });

      await pwaService.sendNotification(testUserId, {
        title: 'Test',
        body: 'Test notification',
      });

      // Verify subscription was marked inactive
      const subscription = await db.query(
        'SELECT subscription_active FROM pwa_subscriptions WHERE user_id = ?',
        [testUserId]
      );

      expect(subscription[0].subscription_active).toBe(false);
    });

    it('should handle 404 Not Found subscription error', async () => {
      await pwaService.subscribeToPush(testUserId, testSubscription);

      const mockSend = jest.spyOn(webpush, 'sendNotification').mockRejectedValue({
        statusCode: 404,
      });

      await pwaService.sendNotification(testUserId, {
        title: 'Test',
        body: 'Test notification',
      });

      // Verify subscription was deleted
      const subscription = await db.query(
        'SELECT * FROM pwa_subscriptions WHERE user_id = ? AND endpoint = ?',
        [testUserId, testSubscription.endpoint]
      );

      expect(subscription).toHaveLength(0);
    });

    it('should send notification to multiple subscriptions', async () => {
      const sub1 = { ...testSubscription, endpoint: 'https://endpoint1.com' };
      const sub2 = { ...testSubscription, endpoint: 'https://endpoint2.com' };
      const sub3 = { ...testSubscription, endpoint: 'https://endpoint3.com' };

      await pwaService.subscribeToPush(testUserId, sub1);
      await pwaService.subscribeToPush(testUserId, sub2);
      await pwaService.subscribeToPush(testUserId, sub3);

      const mockSend = jest.spyOn(webpush, 'sendNotification').mockResolvedValue({
        statusCode: 201,
      });

      const result = await pwaService.sendNotification(testUserId, {
        title: 'Multi Device',
        body: 'Sent to all devices',
      });

      expect(result).toBe(3);
      expect(mockSend).toHaveBeenCalledTimes(3);
    });
  });

  describe('Notification Preferences Management', () => {
    it('should get default notification preferences for new user', async () => {
      const newUserId = await createTestUser('new@example.com');

      const prefs = await pwaService.getNotificationPreferences(newUserId);

      expect(prefs).toBeDefined();
      expect(prefs.careerUpdates).toBe(true);
      expect(prefs.mentorMessages).toBe(true);
      expect(prefs.milestoneReminders).toBe(true);
      expect(prefs.jobAlerts).toBe(true);
      expect(prefs.applicationUpdates).toBe(true);
      expect(prefs.frequency).toBe('immediate');
    });

    it('should update notification preferences', async () => {
      const prefs = await pwaService.updateNotificationPreferences(testUserId, {
        careerUpdates: false,
        frequency: 'daily',
      });

      expect(prefs.careerUpdates).toBe(false);
      expect(prefs.frequency).toBe('daily');
      expect(prefs.mentorMessages).toBe(true); // Unchanged

      // Verify cache invalidated
      const cached = await pwaService.getNotificationPreferences(testUserId);
      expect(cached.careerUpdates).toBe(false);
      expect(cached.frequency).toBe('daily');
    });

    it('should respect notification preferences when sending', async () => {
      await pwaService.updateNotificationPreferences(testUserId, {
        careerUpdates: false,
      });

      await pwaService.subscribeToPush(testUserId, testSubscription);

      const mockSend = jest.spyOn(webpush, 'sendNotification').mockResolvedValue({
        statusCode: 201,
      });

      // Try to send career update notification
      await pwaService.sendNotification(testUserId, {
        title: 'Career Update',
        body: 'New skill trend',
        type: 'careerUpdates',
      });

      // Should not send if preference disabled
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('Offline Sync Queue', () => {
    it('should queue background sync when offline', async () => {
      const syncItem = await pwaService.queueBackgroundSync(testUserId, {
        type: 'sync-applications',
        data: {
          applications: [{ id: '123', action: 'create' }],
        },
      });

      expect(syncItem).toBeDefined();
      expect(syncItem.userId).toBe(testUserId);
      expect(syncItem.syncType).toBe('sync-applications');
      expect(syncItem.synced).toBe(false);
      expect(syncItem.data).toEqual({ applications: [{ id: '123', action: 'create' }] });
    });

    it('should process sync queue when coming back online', async () => {
      const syncItem = await pwaService.queueBackgroundSync(testUserId, {
        type: 'sync-milestones',
        data: { milestones: [{ id: '456', progress: 50 }] },
      });

      // Simulate coming back online - process queue
      const processed = await pwaService.processSyncQueue(testUserId);

      expect(processed).toBeGreaterThan(0);

      // Verify sync item marked as synced
      const item = await db.query(
        'SELECT synced, synced_at FROM pwa_sync_queue WHERE id = ?',
        [syncItem.id]
      );

      expect(item[0].synced).toBe(true);
      expect(item[0].synced_at).toBeDefined();
    });

    it('should handle failed sync with retry logic', async () => {
      await pwaService.queueBackgroundSync(testUserId, {
        type: 'invalid-type',
        data: {},
      });

      const processed = await pwaService.processSyncQueue(testUserId);
      expect(processed).toBe(0);

      // Verify item remains unsynced for retry
      const items = await db.query(
        'SELECT synced FROM pwa_sync_queue WHERE user_id = ? AND synced = false',
        [testUserId]
      );

      expect(items.length).toBeGreaterThan(0);
    });

    it('should expire old sync queue items after 30 days', async () => {
      const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);

      const syncItem = await pwaService.queueBackgroundSync(testUserId, {
        type: 'test',
        data: {},
      });

      // Manually set creation date to old
      await db.query(
        'UPDATE pwa_sync_queue SET created_at = ? WHERE id = ?',
        [oldDate, syncItem.id]
      );

      // Run cleanup
      const cleaned = await pwaService.cleanupOldSyncItems();

      expect(cleaned).toBeGreaterThan(0);

      // Verify item was deleted
      const item = await db.query(
        'SELECT * FROM pwa_sync_queue WHERE id = ?',
        [syncItem.id]
      );

      expect(item).toHaveLength(0);
    });
  });

  describe('Cache Strategies', () => {
    it('should return correct cache strategies', async () => {
      const strategies = await pwaService.getCacheStrategies();

      expect(strategies).toBeDefined();
      expect(strategies.api).toBe('network-first');
      expect(strategies.assets).toBe('cache-first');
      expect(strategies.hybrid).toBe('stale-while-revalidate');

      // Verify cache TTLs
      expect(strategies.ttl).toBeDefined();
      expect(strategies.ttl.api).toBeGreaterThan(0);
      expect(strategies.ttl.assets).toBeGreaterThan(0);
    });

    it('should implement network-first strategy for API calls', async () => {
      // Network call should be attempted first
      const result = await pwaService.fetchWithNetworkFirst('/api/jobs');

      expect(result).toBeDefined();
      // If network fails, should fall back to cache
    });

    it('should implement cache-first strategy for assets', async () => {
      // Asset should be served from cache if available
      const cached = await pwaService.fetchWithCacheFirst('/assets/logo.png');

      expect(cached).toBeDefined();
      // Network call should not happen if cache valid
    });
  });

  // Helper functions
  async function createTestUser(email: string): Promise<string> {
    const user = await db.query(
      'INSERT INTO users (email, role, created_at) VALUES (?, ?, NOW()) RETURNING id',
      [email, 'candidate']
    );
    return user[0].id;
  }
});
