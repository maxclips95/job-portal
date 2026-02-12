/**
 * Phase 8B: Core Collaboration Services
 * Team management, messaging, and projects
 */

import { redis } from '@/config/redis';
import { db } from '@/config/database';
import { v4 as uuidv4 } from 'uuid';
import { Team, TeamMember, Channel, Message, Project, Task, Notification } from '../types/collaboration.types';

// ============================================================================
// TEAM SERVICE
// ============================================================================

export class TeamService {
  async createTeam(userId: string, name: string, description?: string, avatarUrl?: string): Promise<Team> {
    const teamId = uuidv4();

    const team = await db('teams').insert({
      id: teamId,
      name,
      description: description || null,
      avatar_url: avatarUrl || null,
      owner_id: userId,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Add creator as owner
    await db('team_members').insert({
      id: uuidv4(),
      team_id: teamId,
      user_id: userId,
      role: 'owner',
      joined_at: new Date(),
      is_active: true,
    });

    // Create default channels
    await db('channels').insert({
      id: uuidv4(),
      team_id: teamId,
      name: 'general',
      channel_type: 'public',
      creator_id: userId,
      is_private: false,
      created_at: new Date(),
    });

    return this.getTeam(teamId);
  }

  async getTeam(teamId: string): Promise<Team> {
    const team = await db('teams').where({ id: teamId }).first();
    if (!team) throw new Error('Team not found');

    const memberCount = await db('team_members').where({ team_id: teamId }).count('* as count').first();
    const projectCount = await db('projects').where({ team_id: teamId }).count('* as count').first();

    return {
      ...team,
      member_count: memberCount.count,
      project_count: projectCount.count,
    };
  }

  async getUserTeams(userId: string): Promise<Team[]> {
    const teams = await db('teams')
      .join('team_members', 'teams.id', 'team_members.team_id')
      .where({ 'team_members.user_id': userId, 'team_members.is_active': true })
      .select('teams.*');

    return Promise.all(teams.map((t) => this.getTeam(t.id)));
  }

  async updateTeam(teamId: string, updates: any): Promise<Team> {
    await db('teams').where({ id: teamId }).update({ ...updates, updated_at: new Date() });
    return this.getTeam(teamId);
  }

  async addTeamMember(teamId: string, userId: string, role: string): Promise<TeamMember> {
    const memberId = uuidv4();

    await db('team_members').insert({
      id: memberId,
      team_id: teamId,
      user_id: userId,
      role,
      joined_at: new Date(),
      is_active: true,
    });

    return this.getTeamMember(teamId, userId);
  }

  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    await db('team_members').where({ team_id: teamId, user_id: userId }).del();

    // Invalidate cache
    await redis.del(`team:${teamId}:members`);
  }

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const cached = await redis.get(`team:${teamId}:members`);
    if (cached) return JSON.parse(cached);

    const members = await db('team_members')
      .where({ team_id: teamId, is_active: true })
      .leftJoin('users', 'team_members.user_id', 'users.id')
      .select('team_members.*', 'users.name', 'users.email', 'users.avatar_url');

    await redis.setex(`team:${teamId}:members`, 3600, JSON.stringify(members));
    return members;
  }

  async getTeamMember(teamId: string, userId: string): Promise<TeamMember> {
    const member = await db('team_members')
      .where({ team_id: teamId, user_id: userId })
      .leftJoin('users', 'team_members.user_id', 'users.id')
      .select('team_members.*', 'users.name', 'users.email', 'users.avatar_url')
      .first();

    if (!member) throw new Error('Team member not found');
    return member;
  }

  async updateTeamMember(teamId: string, userId: string, updates: any): Promise<TeamMember> {
    await db('team_members').where({ team_id: teamId, user_id: userId }).update(updates);
    await redis.del(`team:${teamId}:members`);
    return this.getTeamMember(teamId, userId);
  }
}

// ============================================================================
// MESSAGING SERVICE
// ============================================================================

export class MessagingService {
  async createChannel(teamId: string, name: string, channelType: string, creatorId: string, description?: string): Promise<Channel> {
    const channelId = uuidv4();

    await db('channels').insert({
      id: channelId,
      team_id: teamId,
      name,
      description: description || null,
      channel_type: channelType,
      creator_id: creatorId,
      is_private: channelType === 'direct',
      created_at: new Date(),
      updated_at: new Date(),
    });

    return this.getChannel(channelId);
  }

  async getChannel(channelId: string): Promise<Channel> {
    const channel = await db('channels').where({ id: channelId }).first();
    if (!channel) throw new Error('Channel not found');

    const memberCount = await db('channel_members').where({ channel_id: channelId }).count('* as count').first();
    const messageCount = await db('messages').where({ channel_id: channelId }).count('* as count').first();

    return {
      ...channel,
      member_count: memberCount.count,
      message_count: messageCount.count,
      last_activity: channel.updated_at,
    };
  }

  async sendMessage(
    channelId: string,
    senderId: string,
    content: string,
    messageType: string = 'text',
    mentions?: string[],
    attachments?: any[]
  ): Promise<Message> {
    const messageId = uuidv4();

    await db('messages').insert({
      id: messageId,
      channel_id: channelId,
      sender_id: senderId,
      content,
      message_type: messageType,
      mentions: mentions ? JSON.stringify(mentions) : null,
      created_at: new Date(),
    });

    // Add attachments if any
    if (attachments && attachments.length > 0) {
      await db('message_attachments').insert(
        attachments.map((att) => ({
          id: uuidv4(),
          message_id: messageId,
          file_url: att.file_url,
          file_name: att.file_name,
          file_size: att.file_size || 0,
          file_type: att.file_type || 'unknown',
          uploaded_at: new Date(),
        }))
      );
    }

    // Invalidate channel cache
    await redis.del(`channel:${channelId}:messages`);

    return this.getMessage(messageId);
  }

  async getMessage(messageId: string): Promise<Message> {
    const message = await db('messages')
      .where({ 'messages.id': messageId })
      .leftJoin('users', 'messages.sender_id', 'users.id')
      .select('messages.*', 'users.name as sender_name', 'users.avatar_url as sender_avatar')
      .first();

    if (!message) throw new Error('Message not found');

    const attachments = await db('message_attachments').where({ message_id: messageId });

    return {
      ...message,
      mentions: message.mentions ? JSON.parse(message.mentions) : [],
      attachments,
      sender: {
        id: message.sender_id,
        name: message.sender_name,
        avatar_url: message.sender_avatar,
      },
    };
  }

  async getChannelMessages(channelId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    const messages = await db('messages')
      .where({ channel_id: channelId })
      .leftJoin('users', 'messages.sender_id', 'users.id')
      .select('messages.*', 'users.name as sender_name', 'users.avatar_url as sender_avatar')
      .orderBy('messages.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return Promise.all(messages.map((m) => this.getMessage(m.id)));
  }

  async editMessage(messageId: string, content: string): Promise<Message> {
    await db('messages').where({ id: messageId }).update({
      content,
      edited_at: new Date(),
    });

    return this.getMessage(messageId);
  }

  async deleteMessage(messageId: string): Promise<void> {
    await db('messages').where({ id: messageId }).del();
  }

  async addReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    const reaction = await db('message_reactions')
      .where({ message_id: messageId, emoji })
      .first();

    if (reaction) {
      const userIds = JSON.parse(reaction.user_ids || '[]');
      if (!userIds.includes(userId)) {
        userIds.push(userId);
        await db('message_reactions').where({ id: reaction.id }).update({
          user_ids: JSON.stringify(userIds),
        });
      }
    } else {
      await db('message_reactions').insert({
        id: uuidv4(),
        message_id: messageId,
        emoji,
        user_ids: JSON.stringify([userId]),
        created_at: new Date(),
      });
    }
  }

  async searchMessages(channelId: string, query: string): Promise<Message[]> {
    const messages = await db('messages')
      .where({ channel_id: channelId })
      .whereRaw('content ILIKE ?', [`%${query}%`])
      .orderBy('created_at', 'desc')
      .limit(50);

    return Promise.all(messages.map((m) => this.getMessage(m.id)));
  }
}

// ============================================================================
// PROJECT SERVICE
// ============================================================================

export class ProjectService {
  async createProject(
    teamId: string,
    userId: string,
    name: string,
    description?: string,
    status?: string
  ): Promise<Project> {
    const projectId = uuidv4();

    await db('projects').insert({
      id: projectId,
      team_id: teamId,
      name,
      description: description || null,
      status: status || 'planning',
      owner_id: userId,
      completion_percentage: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Create default board
    await db('project_boards').insert({
      id: uuidv4(),
      project_id: projectId,
      name: 'Default Board',
      board_type: 'kanban',
      created_at: new Date(),
    });

    return this.getProject(projectId);
  }

  async getProject(projectId: string): Promise<Project> {
    const project = await db('projects').where({ id: projectId }).first();
    if (!project) throw new Error('Project not found');

    const taskCount = await db('tasks').where({ project_id: projectId }).count('* as count').first();

    return {
      ...project,
      task_count: taskCount.count,
      team_count: 0,
    };
  }

  async getTeamProjects(teamId: string): Promise<Project[]> {
    const projects = await db('projects').where({ team_id: teamId }).orderBy('created_at', 'desc');
    return Promise.all(projects.map((p) => this.getProject(p.id)));
  }

  async updateProject(projectId: string, updates: any): Promise<Project> {
    await db('projects').where({ id: projectId }).update({ ...updates, updated_at: new Date() });
    return this.getProject(projectId);
  }

  async updateProjectCompletion(projectId: string): Promise<void> {
    const tasks = await db('tasks').where({ project_id: projectId });
    const completedCount = tasks.filter((t) => t.status === 'completed').length;
    const completion = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

    await db('projects').where({ id: projectId }).update({
      completion_percentage: completion,
      updated_at: new Date(),
    });
  }
}

// ============================================================================
// TASK SERVICE
// ============================================================================

export class TaskService {
  async createTask(
    projectId: string,
    userId: string,
    title: string,
    description?: string,
    priority?: string,
    assigneeId?: string,
    dueDate?: string
  ): Promise<Task> {
    const taskId = uuidv4();

    await db('tasks').insert({
      id: taskId,
      project_id: projectId,
      title,
      description: description || null,
      status: 'todo',
      priority: priority || 'medium',
      assignee_id: assigneeId || null,
      created_by: userId,
      due_date: dueDate || null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return this.getTask(taskId);
  }

  async getTask(taskId: string): Promise<Task> {
    const task = await db('tasks')
      .where({ 'tasks.id': taskId })
      .leftJoin('users', 'tasks.assignee_id', 'users.id')
      .select('tasks.*', 'users.name as assignee_name', 'users.avatar_url as assignee_avatar')
      .first();

    if (!task) throw new Error('Task not found');

    const checklistItems = await db('checklist_items').where({ task_id: taskId }).orderBy('position');
    const attachments = await db('task_attachments').where({ task_id: taskId });
    const commentsCount = await db('task_comments').where({ task_id: taskId }).count('* as count').first();

    return {
      ...task,
      checklist_items: checklistItems,
      attachments,
      comments_count: commentsCount.count,
      assignee: task.assignee_id
        ? {
            id: task.assignee_id,
            name: task.assignee_name,
            avatar_url: task.assignee_avatar,
          }
        : undefined,
    };
  }

  async getProjectTasks(projectId: string): Promise<Task[]> {
    const tasks = await db('tasks').where({ project_id: projectId }).orderBy('due_date', 'asc');
    return Promise.all(tasks.map((t) => this.getTask(t.id)));
  }

  async updateTask(taskId: string, updates: any): Promise<Task> {
    await db('tasks').where({ id: taskId }).update({ ...updates, updated_at: new Date() });

    // Update project completion
    const task = await db('tasks').where({ id: taskId }).first();
    if (task) {
      const projectService = new ProjectService();
      await projectService.updateProjectCompletion(task.project_id);
    }

    return this.getTask(taskId);
  }

  async assignTask(taskId: string, userId: string): Promise<Task> {
    return this.updateTask(taskId, { assignee_id: userId });
  }

  async completeTask(taskId: string): Promise<Task> {
    return this.updateTask(taskId, { status: 'completed', completed_at: new Date() });
  }

  async addTaskComment(taskId: string, userId: string, content: string, mentions?: string[]): Promise<any> {
    const commentId = uuidv4();

    await db('task_comments').insert({
      id: commentId,
      task_id: taskId,
      user_id: userId,
      content,
      mentions: mentions ? JSON.stringify(mentions) : null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return db('task_comments').where({ id: commentId }).leftJoin('users', 'task_comments.user_id', 'users.id').first();
  }
}

// ============================================================================
// NOTIFICATION SERVICE
// ============================================================================

export class NotificationService {
  async sendNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    actorId: string,
    referenceId?: string,
    teamId?: string
  ): Promise<Notification> {
    const notificationId = uuidv4();

    await db('notifications').insert({
      id: notificationId,
      user_id: userId,
      team_id: teamId || null,
      type,
      title,
      message,
      actor_id: actorId,
      reference_id: referenceId || null,
      status: 'unread',
      created_at: new Date(),
    });

    return this.getNotification(notificationId);
  }

  async getNotification(notificationId: string): Promise<Notification> {
    const notification = await db('notifications')
      .where({ id: notificationId })
      .leftJoin('users', 'notifications.actor_id', 'users.id')
      .select('notifications.*', 'users.name as actor_name', 'users.avatar_url as actor_avatar')
      .first();

    if (!notification) throw new Error('Notification not found');

    return {
      ...notification,
      actor: {
        id: notification.actor_id,
        name: notification.actor_name,
        avatar_url: notification.actor_avatar,
      },
    };
  }

  async getUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    const notifications = await db('notifications')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .leftJoin('users', 'notifications.actor_id', 'users.id')
      .select('notifications.*', 'users.name as actor_name', 'users.avatar_url as actor_avatar');

    return Promise.all(notifications.map((n) => this.getNotification(n.id)));
  }

  async markAsRead(notificationId: string): Promise<Notification> {
    await db('notifications').where({ id: notificationId }).update({
      status: 'read',
      read_at: new Date(),
    });

    return this.getNotification(notificationId);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await db('notifications').where({ user_id: userId, status: 'unread' }).update({
      status: 'read',
      read_at: new Date(),
    });
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await db('notifications').where({ id: notificationId }).del();
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await db('notifications')
      .where({ user_id: userId, status: 'unread' })
      .count('* as count')
      .first();

    return result.count;
  }
}
