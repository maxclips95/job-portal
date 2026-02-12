/**
 * Phase 8B: Advanced Collaboration Services
 * WebSocket handling, presence, activity logs, and analytics
 */

import { redis } from '@/config/redis';
import { db } from '@/config/database';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketEvent, WebSocketEventType, ActivityLog, PresenceUpdate } from '../types/collaboration.types';

// ============================================================================
// WEBSOCKET SERVICE
// ============================================================================

export class WebSocketService {
  private connections: Map<string, any> = new Map();

  registerConnection(userId: string, socket: any, teamId: string): void {
    const key = `${teamId}:${userId}`;
    this.connections.set(key, socket);

    // Track presence
    redis.setex(`presence:${key}`, 3600, JSON.stringify({
      user_id: userId,
      team_id: teamId,
      status: 'online',
      last_seen: new Date().toISOString(),
    }));

    // Broadcast presence update
    this.broadcastEvent(teamId, {
      type: WebSocketEventType.PRESENCE_CHANGED,
      team_id: teamId,
      user_id: userId,
      data: { user_id: userId, status: 'online' },
      timestamp: new Date().toISOString(),
    });
  }

  removeConnection(userId: string, teamId: string): void {
    const key = `${teamId}:${userId}`;
    this.connections.delete(key);

    // Update presence to offline after 5 seconds
    setTimeout(() => {
      redis.del(`presence:${key}`);
      this.broadcastEvent(teamId, {
        type: WebSocketEventType.PRESENCE_CHANGED,
        team_id: teamId,
        user_id: userId,
        data: { user_id: userId, status: 'offline' },
        timestamp: new Date().toISOString(),
      });
    }, 5000);
  }

  broadcastEvent(teamId: string, event: WebSocketEvent): void {
    // Broadcast to all connected users in team
    this.connections.forEach((socket, key) => {
      if (key.startsWith(`${teamId}:`)) {
        socket.emit('event', event);
      }
    });
  }

  broadcastChannelEvent(channelId: string, event: WebSocketEvent): void {
    // Store event for subscribers
    redis.lpush(`channel:${channelId}:events`, JSON.stringify(event));
    redis.ltrim(`channel:${channelId}:events`, 0, 999);

    // Broadcast to connected users
    this.connections.forEach((socket) => {
      socket.emit('channel-event', event);
    });
  }

  async getTeamPresence(teamId: string): Promise<PresenceUpdate[]> {
    const keys = await redis.keys(`presence:${teamId}:*`);
    const presenceData = await Promise.all(keys.map((key) => redis.get(key)));

    return presenceData
      .map((data) => {
        try {
          return JSON.parse(data || '{}');
        } catch {
          return null;
        }
      })
      .filter((p) => p !== null);
  }

  async getUserPresence(userId: string, teamId: string): Promise<PresenceUpdate | null> {
    const data = await redis.get(`presence:${teamId}:${userId}`);
    if (!data) return null;

    return JSON.parse(data);
  }
}

// ============================================================================
// ACTIVITY LOG SERVICE
// ============================================================================

export class ActivityLogService {
  async logActivity(
    teamId: string,
    userId: string,
    activityType: string,
    description: string,
    referenceId?: string,
    changes?: any
  ): Promise<ActivityLog> {
    const logId = uuidv4();

    await db('activity_logs').insert({
      id: logId,
      team_id: teamId,
      user_id: userId,
      activity_type: activityType,
      description,
      reference_id: referenceId || null,
      changes: changes ? JSON.stringify(changes) : null,
      created_at: new Date(),
    });

    return this.getActivityLog(logId);
  }

  async getActivityLog(logId: string): Promise<ActivityLog> {
    const log = await db('activity_logs')
      .where({ id: logId })
      .leftJoin('users', 'activity_logs.user_id', 'users.id')
      .select('activity_logs.*', 'users.name as user_name', 'users.avatar_url as user_avatar')
      .first();

    if (!log) throw new Error('Activity log not found');

    return {
      ...log,
      changes: log.changes ? JSON.parse(log.changes) : null,
      user: {
        name: log.user_name,
        avatar_url: log.user_avatar,
      },
    };
  }

  async getTeamActivity(teamId: string, limit: number = 100): Promise<ActivityLog[]> {
    const logs = await db('activity_logs')
      .where({ team_id: teamId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .leftJoin('users', 'activity_logs.user_id', 'users.id')
      .select('activity_logs.*', 'users.name as user_name', 'users.avatar_url as user_avatar');

    return Promise.all(logs.map((log) => this.getActivityLog(log.id)));
  }

  async getProjectActivity(projectId: string, limit: number = 50): Promise<ActivityLog[]> {
    const logs = await db('activity_logs')
      .where({ reference_id: projectId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .leftJoin('users', 'activity_logs.user_id', 'users.id')
      .select('activity_logs.*', 'users.name as user_name', 'users.avatar_url as user_avatar');

    return Promise.all(logs.map((log) => this.getActivityLog(log.id)));
  }
}

// ============================================================================
// TEAM ANALYTICS SERVICE
// ============================================================================

export class TeamAnalyticsService {
  async getTeamStats(teamId: string): Promise<any> {
    const members = await db('team_members').where({ team_id: teamId }).count('* as count').first();
    const channels = await db('channels').where({ team_id: teamId }).count('* as count').first();
    const projects = await db('projects').where({ team_id: teamId }).count('* as count').first();
    const messages = await db('messages')
      .join('channels', 'messages.channel_id', 'channels.id')
      .where({ 'channels.team_id': teamId })
      .count('* as count')
      .first();

    const recentActivity = await db('activity_logs')
      .where({ team_id: teamId })
      .orderBy('created_at', 'desc')
      .limit(30);

    return {
      team_id: teamId,
      member_count: members.count,
      channel_count: channels.count,
      project_count: projects.count,
      message_count: messages.count,
      recent_activity_count: recentActivity.length,
      activity_types: this.groupActivityTypes(recentActivity),
    };
  }

  async getProjectStats(projectId: string): Promise<any> {
    const tasks = await db('tasks').where({ project_id: projectId });
    const completedTasks = tasks.filter((t) => t.status === 'completed');
    const comments = await db('task_comments')
      .join('tasks', 'task_comments.task_id', 'tasks.id')
      .where({ 'tasks.project_id': projectId })
      .count('* as count')
      .first();

    const tasksByStatus = {
      backlog: tasks.filter((t) => t.status === 'backlog').length,
      todo: tasks.filter((t) => t.status === 'todo').length,
      in_progress: tasks.filter((t) => t.status === 'in_progress').length,
      review: tasks.filter((t) => t.status === 'review').length,
      completed: completedTasks.length,
      blocked: tasks.filter((t) => t.status === 'blocked').length,
    };

    const avgTimeToComplete = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => {
          const created = new Date(t.created_at).getTime();
          const completed = new Date(t.completed_at).getTime();
          return sum + (completed - created);
        }, 0) / completedTasks.length / (1000 * 60 * 60 * 24)
      : 0;

    return {
      project_id: projectId,
      total_tasks: tasks.length,
      completed_tasks: completedTasks.length,
      completion_rate: tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0,
      comment_count: comments.count,
      tasks_by_status: tasksByStatus,
      avg_days_to_complete: Math.round(avgTimeToComplete),
    };
  }

  async getMemberContributions(teamId: string, limit: number = 10): Promise<any[]> {
    const members = await db('team_members').where({ team_id: teamId, is_active: true }).select('user_id');

    const contributions = await Promise.all(
      members.map(async (member) => {
        const messages = await db('messages')
          .join('channels', 'messages.channel_id', 'channels.id')
          .where({ 'channels.team_id': teamId, 'messages.sender_id': member.user_id })
          .count('* as count')
          .first();

        const tasksCreated = await db('tasks')
          .join('projects', 'tasks.project_id', 'projects.id')
          .where({ 'projects.team_id': teamId, 'tasks.created_by': member.user_id })
          .count('* as count')
          .first();

        const tasksCompleted = await db('tasks')
          .join('projects', 'tasks.project_id', 'projects.id')
          .where({
            'projects.team_id': teamId,
            'tasks.assignee_id': member.user_id,
            'tasks.status': 'completed',
          })
          .count('* as count')
          .first();

        const user = await db('users').where({ id: member.user_id }).first();

        return {
          user_id: member.user_id,
          name: user.name,
          messages: messages.count,
          tasks_created: tasksCreated.count,
          tasks_completed: tasksCompleted.count,
          total_contributions: messages.count + tasksCreated.count + tasksCompleted.count,
        };
      })
    );

    return contributions.sort((a, b) => b.total_contributions - a.total_contributions).slice(0, limit);
  }

  async getChannelActivity(channelId: string, days: number = 7): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const messages = await db('messages')
      .where({ channel_id: channelId })
      .where('created_at', '>=', startDate)
      .count('* as count')
      .first();

    const activeUsers = await db('messages')
      .where({ channel_id: channelId })
      .where('created_at', '>=', startDate)
      .distinct('sender_id');

    const dailyMessages = await db('messages')
      .where({ channel_id: channelId })
      .where('created_at', '>=', startDate)
      .select(db.raw("DATE(created_at) as date"), db.raw('COUNT(*) as count'))
      .groupBy(db.raw('DATE(created_at)'))
      .orderBy('date');

    return {
      channel_id: channelId,
      total_messages: messages.count,
      active_users: activeUsers.length,
      daily_breakdown: dailyMessages,
    };
  }

  private groupActivityTypes(logs: any[]): Record<string, number> {
    const grouped: Record<string, number> = {};

    logs.forEach((log) => {
      grouped[log.activity_type] = (grouped[log.activity_type] || 0) + 1;
    });

    return grouped;
  }
}

// ============================================================================
// NOTIFICATION PREFERENCES SERVICE
// ============================================================================

export class NotificationPreferencesService {
  async getPreferences(userId: string, teamId: string): Promise<any> {
    const prefs = await db('notification_preferences')
      .where({ user_id: userId, team_id: teamId })
      .first();

    if (!prefs) {
      return {
        user_id: userId,
        team_id: teamId,
        mention_notifications: true,
        message_notifications: true,
        task_notifications: true,
        team_notifications: true,
        digest_frequency: 'instant',
        email_notifications: true,
        push_notifications: true,
      };
    }

    return prefs;
  }

  async updatePreferences(userId: string, teamId: string, updates: any): Promise<any> {
    const existing = await db('notification_preferences')
      .where({ user_id: userId, team_id: teamId })
      .first();

    if (existing) {
      await db('notification_preferences').where({ user_id: userId, team_id: teamId }).update(updates);
    } else {
      await db('notification_preferences').insert({
        id: uuidv4(),
        user_id: userId,
        team_id: teamId,
        ...updates,
        created_at: new Date(),
      });
    }

    return this.getPreferences(userId, teamId);
  }

  async shouldSendNotification(userId: string, teamId: string, notificationType: string): Promise<boolean> {
    const prefs = await this.getPreferences(userId, teamId);

    const typeMap: Record<string, keyof any> = {
      mention: 'mention_notifications',
      message: 'message_notifications',
      task_assigned: 'task_notifications',
      task_updated: 'task_notifications',
      team_invite: 'team_notifications',
      project_update: 'team_notifications',
    };

    return prefs[typeMap[notificationType]] !== false;
  }
}

// ============================================================================
// COLLABORATION HELPER SERVICE
// ============================================================================

export class CollaborationHelperService {
  async validateTeamAccess(userId: string, teamId: string): Promise<boolean> {
    const member = await db('team_members')
      .where({ user_id: userId, team_id: teamId, is_active: true })
      .first();

    return !!member;
  }

  async validateChannelAccess(userId: string, channelId: string): Promise<boolean> {
    const channel = await db('channels').where({ id: channelId }).first();
    if (!channel) return false;

    if (channel.is_private) {
      const member = await db('channel_members').where({ user_id: userId, channel_id: channelId }).first();
      return !!member;
    }

    return this.validateTeamAccess(userId, channel.team_id);
  }

  async validateProjectAccess(userId: string, projectId: string): Promise<boolean> {
    const project = await db('projects').where({ id: projectId }).first();
    if (!project) return false;

    return this.validateTeamAccess(userId, project.team_id);
  }

  async validateTaskAccess(userId: string, taskId: string): Promise<boolean> {
    const task = await db('tasks')
      .join('projects', 'tasks.project_id', 'projects.id')
      .where({ 'tasks.id': taskId })
      .first();

    if (!task) return false;

    return this.validateTeamAccess(userId, task.team_id);
  }

  async getUserTeamRole(userId: string, teamId: string): Promise<string | null> {
    const member = await db('team_members')
      .where({ user_id: userId, team_id: teamId, is_active: true })
      .first();

    return member ? member.role : null;
  }

  async validatePermission(userId: string, teamId: string, permission: string): Promise<boolean> {
    const role = await this.getUserTeamRole(userId, teamId);
    if (!role) return false;

    const rolePermissions: Record<string, string[]> = {
      owner: ['create', 'update', 'delete', 'manage_members', 'manage_channels'],
      admin: ['create', 'update', 'delete', 'manage_channels'],
      member: ['create', 'update'],
      viewer: ['read'],
    };

    return rolePermissions[role]?.includes(permission) || false;
  }
}
