/**
 * Phase 8B: Team Collaboration Validators
 * Zod schemas for all input validation
 */

import { z } from 'zod';
import {
  TeamRole,
  TeamStatus,
  ChannelType,
  MessageType,
  ProjectStatus,
  TaskStatus,
  TaskPriority,
  NotificationType,
} from './collaboration.types';

// ============================================================================
// TEAM VALIDATION SCHEMAS
// ============================================================================

export const CreateTeamSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  avatar_url: z.string().url().optional(),
});

export const UpdateTeamSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  avatar_url: z.string().url().optional(),
  status: z.enum([TeamStatus.ACTIVE, TeamStatus.INACTIVE, TeamStatus.ARCHIVED]).optional(),
});

export const AddTeamMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum([TeamRole.OWNER, TeamRole.ADMIN, TeamRole.MEMBER, TeamRole.VIEWER]),
});

export const UpdateTeamMemberSchema = z.object({
  role: z.enum([TeamRole.ADMIN, TeamRole.MEMBER, TeamRole.VIEWER]).optional(),
  is_active: z.boolean().optional(),
});

// ============================================================================
// MESSAGING VALIDATION SCHEMAS
// ============================================================================

export const CreateChannelSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  channel_type: z.enum([ChannelType.DIRECT, ChannelType.GROUP, ChannelType.PUBLIC, ChannelType.ANNOUNCEMENT]),
  is_private: z.boolean().optional(),
});

export const SendMessageSchema = z.object({
  channel_id: z.string().uuid(),
  content: z.string().min(1).max(5000),
  message_type: z.enum([MessageType.TEXT, MessageType.IMAGE, MessageType.FILE, MessageType.LINK, MessageType.MENTION]),
  mentions: z.array(z.string().uuid()).optional(),
  replied_to: z.string().uuid().optional(),
  attachments: z.array(
    z.object({
      file_url: z.string().url(),
      file_name: z.string().max(255),
    })
  ).optional(),
});

export const EditMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const AddReactionSchema = z.object({
  emoji: z.string().min(1).max(2),
});

// ============================================================================
// PROJECT VALIDATION SCHEMAS
// ============================================================================

export const CreateProjectSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(1000).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  status: z.enum([ProjectStatus.PLANNING, ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED, ProjectStatus.ARCHIVED]).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum([ProjectStatus.PLANNING, ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED, ProjectStatus.ARCHIVED]).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  completion_percentage: z.number().min(0).max(100).optional(),
});

export const AddProjectMemberSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum([TeamRole.ADMIN, TeamRole.MEMBER, TeamRole.VIEWER]).optional(),
});

// ============================================================================
// TASK VALIDATION SCHEMAS
// ============================================================================

export const CreateTaskSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional(),
  priority: z.enum([TaskPriority.CRITICAL, TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.LOW]).optional(),
  assignee_id: z.string().uuid().optional(),
  due_date: z.string().datetime().optional(),
  story_points: z.number().min(1).max(100).optional(),
  tags: z.array(z.string().max(50)).optional(),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum([TaskStatus.BACKLOG, TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.COMPLETED, TaskStatus.BLOCKED]).optional(),
  priority: z.enum([TaskPriority.CRITICAL, TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.LOW]).optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  due_date: z.string().datetime().nullable().optional(),
  completed_at: z.string().datetime().nullable().optional(),
});

export const CreateChecklistItemSchema = z.object({
  task_id: z.string().uuid(),
  title: z.string().min(1).max(200),
});

export const UpdateChecklistItemSchema = z.object({
  completed: z.boolean().optional(),
  title: z.string().min(1).max(200).optional(),
});

export const CreateTaskCommentSchema = z.object({
  task_id: z.string().uuid(),
  content: z.string().min(1).max(5000),
  mentions: z.array(z.string().uuid()).optional(),
});

// ============================================================================
// NOTIFICATION VALIDATION SCHEMAS
// ============================================================================

export const SendNotificationSchema = z.object({
  user_id: z.string().uuid(),
  team_id: z.string().uuid().optional(),
  type: z.enum([
    NotificationType.MENTION,
    NotificationType.MESSAGE,
    NotificationType.TASK_ASSIGNED,
    NotificationType.TASK_UPDATED,
    NotificationType.TEAM_INVITE,
    NotificationType.DEADLINE_APPROACHING,
    NotificationType.PROJECT_UPDATE,
    NotificationType.TEAM_MEMBER_JOINED,
    NotificationType.COMMENT_REPLY,
  ]),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  reference_id: z.string().uuid().optional(),
});

export const UpdateNotificationPreferencesSchema = z.object({
  mention_notifications: z.boolean().optional(),
  message_notifications: z.boolean().optional(),
  task_notifications: z.boolean().optional(),
  team_notifications: z.boolean().optional(),
  digest_frequency: z.enum(['instant', 'daily', 'weekly', 'never']).optional(),
  email_notifications: z.boolean().optional(),
  push_notifications: z.boolean().optional(),
});

// ============================================================================
// FILTER VALIDATION SCHEMAS
// ============================================================================

export const TaskFilterSchema = z.object({
  project_id: z.string().uuid().optional(),
  status: z.enum([TaskStatus.BACKLOG, TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.COMPLETED, TaskStatus.BLOCKED]).optional(),
  priority: z.enum([TaskPriority.CRITICAL, TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.LOW]).optional(),
  assignee_id: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
});

export const MessageFilterSchema = z.object({
  channel_id: z.string().uuid(),
  search: z.string().optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  sender_id: z.string().uuid().optional(),
});

export const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
});

// ============================================================================
// TYPE INFERENCE
// ============================================================================

export type CreateTeamInput = z.infer<typeof CreateTeamSchema>;
export type UpdateTeamInput = z.infer<typeof UpdateTeamSchema>;
export type AddTeamMemberInput = z.infer<typeof AddTeamMemberSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type CreateChannelInput = z.infer<typeof CreateChannelSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type CreateTaskCommentInput = z.infer<typeof CreateTaskCommentSchema>;
export type SendNotificationInput = z.infer<typeof SendNotificationSchema>;
export type TaskFilterInput = z.infer<typeof TaskFilterSchema>;
export type MessageFilterInput = z.infer<typeof MessageFilterSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
