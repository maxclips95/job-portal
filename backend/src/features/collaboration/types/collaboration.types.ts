/**
 * Phase 8B: Team Collaboration Types
 * Complete type definitions for teams, messaging, projects, and notifications
 */

// ============================================================================
// TEAM TYPES
// ============================================================================

export enum TeamRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

export enum TeamStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  owner_id: string;
  status: TeamStatus;
  created_at: string;
  updated_at: string;
  member_count: number;
  project_count: number;
  settings?: TeamSettings;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
  is_active: boolean;
  permissions?: string[];
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface TeamSettings {
  id: string;
  team_id: string;
  visibility: 'public' | 'private';
  allow_invites: boolean;
  allow_member_removal: boolean;
  default_role: TeamRole;
  updated_at: string;
}

// ============================================================================
// MESSAGING TYPES
// ============================================================================

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  LINK = 'link',
  MENTION = 'mention',
}

export enum ChannelType {
  DIRECT = 'direct',
  GROUP = 'group',
  PUBLIC = 'public',
  ANNOUNCEMENT = 'announcement',
}

export interface Message {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  attachments?: MessageAttachment[];
  mentions?: string[];
  replied_to?: string;
  reactions?: { emoji: string; user_ids: string[] }[];
  edited_at?: string;
  deleted_at?: string;
  created_at: string;
  sender?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
}

export interface Channel {
  id: string;
  team_id: string;
  name: string;
  description?: string;
  channel_type: ChannelType;
  creator_id: string;
  is_private: boolean;
  member_count: number;
  message_count: number;
  last_message?: Message;
  last_activity: string;
  created_at: string;
  updated_at: string;
  members?: TeamMember[];
}

export interface DirectMessage {
  id: string;
  participant_ids: [string, string];
  team_id: string;
  last_message?: Message;
  last_activity: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface MessageThread {
  id: string;
  channel_id: string;
  parent_message_id: string;
  reply_count: number;
  last_reply_at: string;
  created_at: string;
}

// ============================================================================
// PROJECT TYPES
// ============================================================================

export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export enum TaskStatus {
  BACKLOG = 'backlog',
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
}

export enum TaskPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export interface Project {
  id: string;
  team_id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  owner_id: string;
  start_date?: string;
  end_date?: string;
  completion_percentage: number;
  icon?: string;
  color?: string;
  created_at: string;
  updated_at: string;
  task_count: number;
  team_count: number;
  members?: TeamMember[];
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id?: string;
  created_by: string;
  start_date?: string;
  due_date?: string;
  completed_at?: string;
  story_points?: number;
  tags?: string[];
  checklist_items?: ChecklistItem[];
  attachments?: TaskAttachment[];
  comments_count: number;
  created_at: string;
  updated_at: string;
  assignee?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  watchers?: string[];
}

export interface ChecklistItem {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  mentions?: string[];
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

export interface ProjectBoard {
  id: string;
  project_id: string;
  name: string;
  board_type: 'kanban' | 'list' | 'timeline';
  columns?: BoardColumn[];
  created_at: string;
}

export interface BoardColumn {
  id: string;
  board_id: string;
  name: string;
  status: TaskStatus;
  position: number;
  task_count: number;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export enum NotificationType {
  MENTION = 'mention',
  MESSAGE = 'message',
  TASK_ASSIGNED = 'task_assigned',
  TASK_UPDATED = 'task_updated',
  TEAM_INVITE = 'team_invite',
  DEADLINE_APPROACHING = 'deadline_approaching',
  PROJECT_UPDATE = 'project_update',
  TEAM_MEMBER_JOINED = 'team_member_joined',
  COMMENT_REPLY = 'comment_reply',
}

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  ARCHIVED = 'archived',
}

export interface Notification {
  id: string;
  user_id: string;
  team_id?: string;
  type: NotificationType;
  title: string;
  message: string;
  actor_id: string;
  actor?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  reference_id?: string;
  reference_type?: string;
  status: NotificationStatus;
  read_at?: string;
  expires_at?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  team_id: string;
  mention_notifications: boolean;
  message_notifications: boolean;
  task_notifications: boolean;
  team_notifications: boolean;
  digest_frequency: 'instant' | 'daily' | 'weekly' | 'never';
  email_notifications: boolean;
  push_notifications: boolean;
}

// ============================================================================
// REQUEST/RESPONSE DTOs
// ============================================================================

export interface CreateTeamRequest {
  name: string;
  description?: string;
  avatar_url?: string;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  avatar_url?: string;
  status?: TeamStatus;
}

export interface AddTeamMemberRequest {
  email: string;
  role: TeamRole;
}

export interface UpdateTeamMemberRequest {
  role?: TeamRole;
  is_active?: boolean;
}

export interface CreateChannelRequest {
  name: string;
  description?: string;
  channel_type: ChannelType;
  is_private?: boolean;
}

export interface SendMessageRequest {
  channel_id: string;
  content: string;
  message_type: MessageType;
  mentions?: string[];
  replied_to?: string;
  attachments?: { file_url: string; file_name: string }[];
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status?: ProjectStatus;
  color?: string;
}

export interface CreateTaskRequest {
  project_id: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  assignee_id?: string;
  due_date?: string;
  story_points?: number;
  tags?: string[];
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string;
  due_date?: string;
  completed_at?: string;
}

export interface CreateTaskCommentRequest {
  task_id: string;
  content: string;
  mentions?: string[];
}

export interface SendNotificationRequest {
  user_id: string;
  team_id?: string;
  type: NotificationType;
  title: string;
  message: string;
  reference_id?: string;
}

// ============================================================================
// FILTER & PAGINATION TYPES
// ============================================================================

export interface TeamFilter {
  status?: TeamStatus;
  search?: string;
  role?: TeamRole;
}

export interface MessageFilter {
  channel_id: string;
  search?: string;
  from_date?: string;
  to_date?: string;
  sender_id?: string;
}

export interface TaskFilter {
  project_id?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string;
  due_date_range?: [string, string];
  tags?: string[];
}

export interface NotificationFilter {
  type?: NotificationType;
  status?: NotificationStatus;
  team_id?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ============================================================================
// WEBSOCKET EVENT TYPES
// ============================================================================

export enum WebSocketEventType {
  MESSAGE_SENT = 'message_sent',
  MESSAGE_EDITED = 'message_edited',
  MESSAGE_DELETED = 'message_deleted',
  TASK_UPDATED = 'task_updated',
  TASK_CREATED = 'task_created',
  TASK_ASSIGNED = 'task_assigned',
  TEAM_MEMBER_JOINED = 'team_member_joined',
  TEAM_MEMBER_LEFT = 'team_member_left',
  NOTIFICATION_CREATED = 'notification_created',
  NOTIFICATION_READ = 'notification_read',
  PRESENCE_CHANGED = 'presence_changed',
}

export interface WebSocketEvent {
  type: WebSocketEventType;
  team_id: string;
  user_id: string;
  channel_id?: string;
  data: Record<string, any>;
  timestamp: string;
}

export interface PresenceUpdate {
  user_id: string;
  team_id: string;
  status: 'online' | 'away' | 'offline';
  last_seen: string;
}

// ============================================================================
// ACTIVITY LOG TYPES
// ============================================================================

export enum ActivityType {
  TEAM_CREATED = 'team_created',
  TEAM_UPDATED = 'team_updated',
  MEMBER_ADDED = 'member_added',
  MEMBER_REMOVED = 'member_removed',
  CHANNEL_CREATED = 'channel_created',
  MESSAGE_SENT = 'message_sent',
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_COMPLETED = 'task_completed',
  PROJECT_CREATED = 'project_created',
}

export interface ActivityLog {
  id: string;
  team_id: string;
  user_id: string;
  activity_type: ActivityType;
  description: string;
  reference_id?: string;
  changes?: Record<string, any>;
  created_at: string;
  user?: {
    name: string;
    avatar_url?: string;
  };
}
