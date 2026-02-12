/**
 * Database Migration: Team Collaboration
 */

export const up = async (knex: any) => {
  // Teams table
  await knex.schema.createTable('teams', (table: any) => {
    table.uuid('id').primary();
    table.string('name', 100).notNullable();
    table.string('description', 500);
    table.string('avatar_url');
    table.uuid('owner_id').notNullable();
    table.enum('status', ['active', 'inactive', 'archived']).defaultTo('active');
    table.timestamps(true, true);

    table.index('owner_id');
    table.index('status');
  });

  // Team members table
  await knex.schema.createTable('team_members', (table: any) => {
    table.uuid('id').primary();
    table.uuid('team_id').references('id').inTable('teams');
    table.uuid('user_id').notNullable();
    table.enum('role', ['owner', 'admin', 'member', 'viewer']).defaultTo('member');
    table.timestamp('joined_at').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.jsonb('permissions');

    table.index('team_id');
    table.index('user_id');
    table.unique(['team_id', 'user_id']);
  });

  // Channels table
  await knex.schema.createTable('channels', (table: any) => {
    table.uuid('id').primary();
    table.uuid('team_id').references('id').inTable('teams');
    table.string('name', 80).notNullable();
    table.string('description', 500);
    table.enum('channel_type', ['direct', 'group', 'public', 'announcement']);
    table.uuid('creator_id').notNullable();
    table.boolean('is_private').defaultTo(false);
    table.timestamps(true, true);

    table.index('team_id');
    table.index('creator_id');
  });

  // Channel members table
  await knex.schema.createTable('channel_members', (table: any) => {
    table.uuid('id').primary();
    table.uuid('channel_id').references('id').inTable('channels');
    table.uuid('user_id').notNullable();
    table.timestamp('joined_at').notNullable();
    table.boolean('is_muted').defaultTo(false);

    table.index('channel_id');
    table.index('user_id');
    table.unique(['channel_id', 'user_id']);
  });

  // Messages table
  await knex.schema.createTable('messages', (table: any) => {
    table.uuid('id').primary();
    table.uuid('channel_id').references('id').inTable('channels');
    table.uuid('sender_id').notNullable();
    table.text('content').notNullable();
    table.enum('message_type', ['text', 'image', 'file', 'link', 'mention']).defaultTo('text');
    table.jsonb('mentions');
    table.uuid('replied_to');
    table.timestamp('edited_at');
    table.timestamp('deleted_at');
    table.timestamp('created_at').notNullable();

    table.index('channel_id');
    table.index('sender_id');
    table.index('created_at');
  });

  // Message attachments table
  await knex.schema.createTable('message_attachments', (table: any) => {
    table.uuid('id').primary();
    table.uuid('message_id').references('id').inTable('messages');
    table.string('file_url').notNullable();
    table.string('file_name', 255).notNullable();
    table.integer('file_size');
    table.string('file_type');
    table.timestamp('uploaded_at').notNullable();

    table.index('message_id');
  });

  // Message reactions table
  await knex.schema.createTable('message_reactions', (table: any) => {
    table.uuid('id').primary();
    table.uuid('message_id').references('id').inTable('messages');
    table.string('emoji', 2).notNullable();
    table.jsonb('user_ids');
    table.timestamp('created_at').notNullable();

    table.index('message_id');
    table.unique(['message_id', 'emoji']);
  });

  // Projects table
  await knex.schema.createTable('projects', (table: any) => {
    table.uuid('id').primary();
    table.uuid('team_id').references('id').inTable('teams');
    table.string('name', 100).notNullable();
    table.string('description', 1000);
    table.enum('status', ['planning', 'active', 'on_hold', 'completed', 'archived']).defaultTo('planning');
    table.uuid('owner_id').notNullable();
    table.date('start_date');
    table.date('end_date');
    table.integer('completion_percentage').defaultTo(0);
    table.string('icon', 50);
    table.string('color', 7);
    table.timestamps(true, true);

    table.index('team_id');
    table.index('owner_id');
    table.index('status');
  });

  // Project boards table
  await knex.schema.createTable('project_boards', (table: any) => {
    table.uuid('id').primary();
    table.uuid('project_id').references('id').inTable('projects');
    table.string('name', 100).notNullable();
    table.enum('board_type', ['kanban', 'list', 'timeline']).defaultTo('kanban');
    table.timestamp('created_at').notNullable();

    table.index('project_id');
  });

  // Board columns table
  await knex.schema.createTable('board_columns', (table: any) => {
    table.uuid('id').primary();
    table.uuid('board_id').references('id').inTable('project_boards');
    table.string('name', 50).notNullable();
    table.enum('status', ['backlog', 'todo', 'in_progress', 'review', 'completed', 'blocked']);
    table.integer('position').defaultTo(0);

    table.index('board_id');
  });

  // Tasks table
  await knex.schema.createTable('tasks', (table: any) => {
    table.uuid('id').primary();
    table.uuid('project_id').references('id').inTable('projects');
    table.string('title', 200).notNullable();
    table.text('description');
    table.enum('status', ['backlog', 'todo', 'in_progress', 'review', 'completed', 'blocked']).defaultTo('todo');
    table.enum('priority', ['critical', 'high', 'medium', 'low']).defaultTo('medium');
    table.uuid('assignee_id');
    table.uuid('created_by').notNullable();
    table.date('start_date');
    table.date('due_date');
    table.timestamp('completed_at');
    table.integer('story_points');
    table.jsonb('tags');
    table.timestamps(true, true);

    table.index('project_id');
    table.index('assignee_id');
    table.index('status');
    table.index('due_date');
  });

  // Checklist items table
  await knex.schema.createTable('checklist_items', (table: any) => {
    table.uuid('id').primary();
    table.uuid('task_id').references('id').inTable('tasks');
    table.string('title', 200).notNullable();
    table.boolean('completed').defaultTo(false);
    table.integer('position').defaultTo(0);
    table.timestamp('created_at').notNullable();

    table.index('task_id');
  });

  // Task attachments table
  await knex.schema.createTable('task_attachments', (table: any) => {
    table.uuid('id').primary();
    table.uuid('task_id').references('id').inTable('tasks');
    table.string('file_url').notNullable();
    table.string('file_name', 255).notNullable();
    table.integer('file_size');
    table.timestamp('uploaded_at').notNullable();

    table.index('task_id');
  });

  // Task comments table
  await knex.schema.createTable('task_comments', (table: any) => {
    table.uuid('id').primary();
    table.uuid('task_id').references('id').inTable('tasks');
    table.uuid('user_id').notNullable();
    table.text('content').notNullable();
    table.jsonb('mentions');
    table.timestamps(true, true);

    table.index('task_id');
    table.index('user_id');
  });

  // Notifications table
  await knex.schema.createTable('notifications', (table: any) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable();
    table.uuid('team_id');
    table.enum('type', [
      'mention',
      'message',
      'task_assigned',
      'task_updated',
      'team_invite',
      'deadline_approaching',
      'project_update',
      'team_member_joined',
      'comment_reply',
    ]);
    table.string('title', 200).notNullable();
    table.string('message', 1000).notNullable();
    table.uuid('actor_id').notNullable();
    table.uuid('reference_id');
    table.enum('status', ['unread', 'read', 'archived']).defaultTo('unread');
    table.timestamp('read_at');
    table.timestamp('expires_at');
    table.timestamp('created_at').notNullable();

    table.index('user_id');
    table.index('status');
    table.index('created_at');
  });

  // Notification preferences table
  await knex.schema.createTable('notification_preferences', (table: any) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable();
    table.uuid('team_id').notNullable();
    table.boolean('mention_notifications').defaultTo(true);
    table.boolean('message_notifications').defaultTo(true);
    table.boolean('task_notifications').defaultTo(true);
    table.boolean('team_notifications').defaultTo(true);
    table.enum('digest_frequency', ['instant', 'daily', 'weekly', 'never']).defaultTo('instant');
    table.boolean('email_notifications').defaultTo(true);
    table.boolean('push_notifications').defaultTo(true);
    table.timestamp('created_at').notNullable();
    table.timestamp('updated_at').notNullable();

    table.index(['user_id', 'team_id']);
  });

  // Activity logs table
  await knex.schema.createTable('activity_logs', (table: any) => {
    table.uuid('id').primary();
    table.uuid('team_id').notNullable();
    table.uuid('user_id').notNullable();
    table.string('activity_type', 50).notNullable();
    table.text('description').notNullable();
    table.uuid('reference_id');
    table.jsonb('changes');
    table.timestamp('created_at').notNullable();

    table.index('team_id');
    table.index('user_id');
    table.index('activity_type');
  });
};

export const down = async (knex: any) => {
  await knex.schema.dropTableIfExists('activity_logs');
  await knex.schema.dropTableIfExists('notification_preferences');
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('task_comments');
  await knex.schema.dropTableIfExists('task_attachments');
  await knex.schema.dropTableIfExists('checklist_items');
  await knex.schema.dropTableIfExists('tasks');
  await knex.schema.dropTableIfExists('board_columns');
  await knex.schema.dropTableIfExists('project_boards');
  await knex.schema.dropTableIfExists('projects');
  await knex.schema.dropTableIfExists('message_reactions');
  await knex.schema.dropTableIfExists('message_attachments');
  await knex.schema.dropTableIfExists('messages');
  await knex.schema.dropTableIfExists('channel_members');
  await knex.schema.dropTableIfExists('channels');
  await knex.schema.dropTableIfExists('team_members');
  await knex.schema.dropTableIfExists('teams');
};
