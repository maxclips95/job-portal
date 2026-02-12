import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Career Pathways Table
  await knex.schema.createTable('career_pathways', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('userId').notNullable();
    table.string('name').notNullable();
    table.text('description');
    table.string('startRole').notNullable();
    table.string('targetRole').notNullable();
    table.integer('timelineYears').notNullable();
    table.jsonb('salaryProgression').defaultTo('[]');
    table.jsonb('skillsRequired').defaultTo('[]');
    table
      .enum('visibility', ['private', 'public', 'shared'])
      .notNullable()
      .defaultTo('private');
    table
      .enum('status', ['draft', 'active', 'paused', 'completed', 'archived'])
      .notNullable()
      .defaultTo('draft');
    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt').notNullable().defaultTo(knex.fn.now());

    table.foreign('userId').references('id').inTable('users').onDelete('CASCADE');
    table.index('userId');
    table.index('status');
    table.index('visibility');
    table.index('createdAt');
  });

  // Milestones Table
  await knex.schema.createTable('milestones', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('pathwayId').notNullable();
    table.string('title').notNullable();
    table.text('description');
    table.jsonb('skillsRequired').defaultTo('[]');
    table.timestamp('dueDate').notNullable();
    table.enum('status', ['pending', 'in_progress', 'completed']).defaultTo('pending');
    table.integer('progressPercentage').defaultTo(0);
    table.timestamp('completedAt');
    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt').notNullable().defaultTo(knex.fn.now());

    table.foreign('pathwayId').references('id').inTable('career_pathways').onDelete('CASCADE');
    table.index('pathwayId');
    table.index('dueDate');
    table.index('status');
    table.index('createdAt');
  });

  // Mentors Table
  await knex.schema.createTable('mentors', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('userId').unique().notNullable();
    table.jsonb('expertise').defaultTo('[]');
    table.integer('yearsOfExperience').notNullable();
    table.text('bio');
    table.jsonb('availability').defaultTo('{}');
    table.decimal('hourlyRate', 10, 2);
    table.decimal('rating', 3, 2).defaultTo(0);
    table.integer('reviewCount').defaultTo(0);
    table.boolean('acceptingMentees').defaultTo(true);
    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt').notNullable().defaultTo(knex.fn.now());

    table.foreign('userId').references('id').inTable('users').onDelete('CASCADE');
    table.index('userId');
    table.index('rating');
    table.index('acceptingMentees');
  });

  // Mentorship Relationships Table
  await knex.schema.createTable('mentorship_relationships', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('mentorId').notNullable();
    table.uuid('menteeId').notNullable();
    table.integer('matchScore').defaultTo(0);
    table
      .enum('status', ['pending', 'active', 'paused', 'completed', 'ended'])
      .notNullable()
      .defaultTo('pending');
    table.jsonb('goals').defaultTo('[]');
    table.timestamp('startDate');
    table.timestamp('endDate');
    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt').notNullable().defaultTo(knex.fn.now());

    table.foreign('mentorId').references('userId').inTable('users').onDelete('CASCADE');
    table.foreign('menteeId').references('id').inTable('users').onDelete('CASCADE');
    table.index('mentorId');
    table.index('menteeId');
    table.index('status');
    table.index('createdAt');
  });

  // Mentorship Messages Table
  await knex.schema.createTable('mentorship_messages', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('relationshipId').notNullable();
    table.uuid('senderId').notNullable();
    table.text('message').notNullable();
    table.jsonb('attachments').defaultTo('[]');
    table.timestamp('readAt');
    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());

    table
      .foreign('relationshipId')
      .references('id')
      .inTable('mentorship_relationships')
      .onDelete('CASCADE');
    table.foreign('senderId').references('id').inTable('users').onDelete('CASCADE');
    table.index('relationshipId');
    table.index('senderId');
    table.index('createdAt');
  });

  // Mentorship Reviews Table
  await knex.schema.createTable('mentorship_reviews', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('relationshipId').notNullable();
    table.uuid('reviewerId').notNullable();
    table.integer('rating').notNullable();
    table.text('feedback');
    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());

    table
      .foreign('relationshipId')
      .references('id')
      .inTable('mentorship_relationships')
      .onDelete('CASCADE');
    table.foreign('reviewerId').references('id').inTable('users').onDelete('CASCADE');
    table.index('relationshipId');
    table.index('reviewerId');
  });

  // PWA Subscriptions Table
  await knex.schema.createTable('pwa_subscriptions', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('userId').notNullable();
    table.text('endpoint').notNullable();
    table.text('auth').notNullable();
    table.text('p256dh').notNullable();
    table.boolean('subscriptionActive').defaultTo(true);
    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt').notNullable().defaultTo(knex.fn.now());

    table.foreign('userId').references('id').inTable('users').onDelete('CASCADE');
    table.unique(['userId', 'endpoint']);
    table.index('userId');
    table.index('subscriptionActive');
  });

  // PWA Installations Table
  await knex.schema.createTable('pwa_installations', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('userId').notNullable();
    table.text('userAgent');
    table.timestamp('installedAt').notNullable();

    table.foreign('userId').references('id').inTable('users').onDelete('CASCADE');
    table.index('userId');
    table.index('installedAt');
  });

  // PWA Notification Preferences Table
  await knex.schema.createTable('pwa_notification_preferences', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('userId').unique().notNullable();
    table.boolean('careerUpdates').defaultTo(true);
    table.boolean('mentorMessages').defaultTo(true);
    table.boolean('milestoneReminders').defaultTo(true);
    table.boolean('industryNews').defaultTo(true);
    table.boolean('jobRecommendations').defaultTo(true);
    table.boolean('applicationUpdates').defaultTo(true);
    table.enum('frequency', ['daily', 'weekly', 'none']).defaultTo('daily');
    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt').notNullable().defaultTo(knex.fn.now());

    table.foreign('userId').references('id').inTable('users').onDelete('CASCADE');
    table.index('userId');
  });

  // PWA Sync Queue Table
  await knex.schema.createTable('pwa_sync_queue', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('userId').notNullable();
    table.string('syncType').notNullable();
    table.jsonb('data').defaultTo('{}');
    table.boolean('synced').defaultTo(false);
    table.timestamp('syncedAt');
    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());

    table.foreign('userId').references('id').inTable('users').onDelete('CASCADE');
    table.index('userId');
    table.index('synced');
    table.index('createdAt');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('pwa_sync_queue');
  await knex.schema.dropTableIfExists('pwa_notification_preferences');
  await knex.schema.dropTableIfExists('pwa_installations');
  await knex.schema.dropTableIfExists('pwa_subscriptions');
  await knex.schema.dropTableIfExists('mentorship_reviews');
  await knex.schema.dropTableIfExists('mentorship_messages');
  await knex.schema.dropTableIfExists('mentorship_relationships');
  await knex.schema.dropTableIfExists('mentors');
  await knex.schema.dropTableIfExists('milestones');
  await knex.schema.dropTableIfExists('career_pathways');
}
