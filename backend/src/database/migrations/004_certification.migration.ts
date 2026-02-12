/**
 * Database Migration: Certification System
 * Creates tables for assessments, certifications, portfolios, badges, and verifications
 */

export const up = async (knex: any) => {
  // Assessments table
  await knex.schema.createTable('assessments', (table: any) => {
    table.uuid('id').primary();
    table.uuid('skill_id').notNullable();
    table.string('title', 100).notNullable();
    table.text('description').notNullable();
    table.enum('difficulty', [
      'beginner',
      'intermediate',
      'advanced',
      'expert',
    ]);
    table.enum('format', [
      'multiple-choice',
      'practical',
      'coding',
      'essay',
      'mixed',
    ]);
    table.integer('duration_minutes').notNullable();
    table.integer('passing_score').notNullable();
    table.integer('total_questions').defaultTo(0);
    table.enum('status', [
      'draft',
      'published',
      'active',
      'archived',
      'retired',
    ]);
    table.uuid('creator').notNullable();
    table.jsonb('metadata').defaultTo(knex.raw('?::jsonb', ['{}']));
    table.timestamps(true, true);

    // Indexes
    table.index('skill_id');
    table.index('difficulty');
    table.index('status');
    table.index('created_at');
  });

  // Assessment questions table
  await knex.schema.createTable('assessment_questions', (table: any) => {
    table.uuid('id').primary();
    table.uuid('assessment_id').notNullable().references('id').inTable('assessments').onDelete('CASCADE');
    table.enum('type', [
      'multiple-choice',
      'true-false',
      'code-review',
      'project-based',
      'essay',
    ]);
    table.text('content').notNullable();
    table.jsonb('options');
    table.string('correct_answer');
    table.integer('points').notNullable();
    table.integer('time_limit');
    table.text('explanation');
    table.integer('order').notNullable();

    table.index('assessment_id');
  });

  // Assessment attempts table
  await knex.schema.createTable('assessment_attempts', (table: any) => {
    table.uuid('id').primary();
    table.uuid('assessment_id').notNullable().references('id').inTable('assessments');
    table.uuid('user_id').notNullable();
    table.timestamp('started_at').notNullable();
    table.timestamp('completed_at');
    table.enum('status', ['in-progress', 'completed', 'abandoned']);
    table.decimal('score', 5, 2);
    table.jsonb('answers').defaultTo(knex.raw('?::jsonb', ['{}']));
    table.integer('time_spent'); // in seconds

    // Indexes
    table.index('assessment_id');
    table.index('user_id');
    table.index('status');
    table.index('started_at');
  });

  // Certifications table
  await knex.schema.createTable('certifications', (table: any) => {
    table.uuid('id').primary();
    table.uuid('skill_id').notNullable();
    table.uuid('user_id').notNullable();
    table.enum('level', ['foundational', 'professional', 'expert', 'master']);
    table.enum('type', [
      'skill-badge',
      'professional',
      'specialization',
      'credential',
    ]);
    table.timestamp('earned_date').notNullable();
    table.timestamp('expiry_date');
    table.enum('status', ['earned', 'expired', 'revoked', 'pending']);
    table.string('verification_token').unique();
    table.string('credential_url');
    table.string('issuer', 100);
    table.jsonb('metadata').defaultTo(knex.raw('?::jsonb', ['{}']));

    // Indexes
    table.index('skill_id');
    table.index('user_id');
    table.index('status');
    table.index('earned_date');
    table.index('expiry_date');
    table.index('verification_token');
  });

  // Badge definitions table
  await knex.schema.createTable('badge_definitions', (table: any) => {
    table.uuid('id').primary();
    table.uuid('skill_id').notNullable();
    table.enum('level', ['foundational', 'professional', 'expert', 'master']);
    table.string('name', 100).notNullable();
    table.text('description');
    table.string('icon').notNullable();
    table.string('color', 7).notNullable(); // Hex color
    table.jsonb('requirements').notNullable();
    table.integer('display_order').defaultTo(0);
    table.boolean('active').defaultTo(true);

    // Indexes
    table.index('skill_id');
    table.index('level');
    table.index('active');
  });

  // Badge awards table
  await knex.schema.createTable('badge_awards', (table: any) => {
    table.uuid('id').primary();
    table.uuid('badge_id').notNullable().references('id').inTable('badge_definitions');
    table.uuid('user_id').notNullable();
    table.timestamp('awarded_at').notNullable();

    table.index('badge_id');
    table.index('user_id');
    table.index('awarded_at');
    table.unique(['badge_id', 'user_id']);
  });

  // Portfolios table
  await knex.schema.createTable('portfolios', (table: any) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().unique();
    table.string('title', 200).notNullable();
    table.text('bio');
    table.string('profile_image');
    table.string('banner_image');
    table.boolean('published').defaultTo(false);
    table.string('public_url').unique();
    table.jsonb('stats').defaultTo(knex.raw('?::jsonb', ['{}']));
    table.jsonb('social_links');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('published');
  });

  // Portfolio items table
  await knex.schema.createTable('portfolio_items', (table: any) => {
    table.uuid('id').primary();
    table.uuid('portfolio_id').notNullable().references('id').inTable('portfolios').onDelete('CASCADE');
    table.uuid('user_id').notNullable();
    table.enum('type', ['project', 'certification', 'achievement', 'contribution']);
    table.string('title', 200).notNullable();
    table.text('description');
    table.jsonb('skills'); // Array of skill IDs
    table.timestamp('start_date');
    table.timestamp('end_date');
    table.enum('status', ['draft', 'published', 'archived']);
    table.enum('visibility', ['public', 'private', 'portfolio', 'employers-only']);
    table.jsonb('links'); // github, live, demo, documentation
    table.jsonb('media'); // thumbnails, screenshots, videos
    table.jsonb('achievements');
    table.jsonb('metrics'); // stars, forks, downloads, impact
    table.integer('display_order').defaultTo(0);
    table.timestamps(true, true);

    // Indexes
    table.index('portfolio_id');
    table.index('user_id');
    table.index('type');
    table.index('status');
    table.index('visibility');
  });

  // Portfolio views tracking
  await knex.schema.createTable('portfolio_views', (table: any) => {
    table.uuid('id').primary();
    table.uuid('portfolio_id').notNullable().references('id').inTable('portfolios');
    table.string('visitor_id');
    table.timestamp('viewed_at').notNullable();

    table.index('portfolio_id');
    table.index('viewed_at');
  });

  // Portfolio item clicks tracking
  await knex.schema.createTable('portfolio_item_clicks', (table: any) => {
    table.uuid('id').primary();
    table.uuid('portfolio_id').notNullable().references('id').inTable('portfolios');
    table.uuid('item_id').notNullable();
    table.string('visitor_id');
    table.timestamp('clicked_at').notNullable();

    table.index('portfolio_id');
    table.index('item_id');
  });

  // Skill endorsements table
  await knex.schema.createTable('skill_endorsements', (table: any) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable();
    table.uuid('skill_id').notNullable();
    table.uuid('endorsed_by').notNullable();
    table.enum('level', ['beginner', 'intermediate', 'advanced', 'expert']);
    table.text('message');
    table.boolean('verified').defaultTo(false);
    table.decimal('weight', 3, 2).defaultTo(1.0);
    table.timestamp('endorsement_date').notNullable();

    // Indexes
    table.index('user_id');
    table.index('skill_id');
    table.index('endorsed_by');
    table.unique(['user_id', 'skill_id', 'endorsed_by']);
  });

  // Certification verifications table
  await knex.schema.createTable('certification_verifications', (table: any) => {
    table.uuid('id').primary();
    table.uuid('certification_id').notNullable().references('id').inTable('certifications');
    table.uuid('verifier_id').notNullable();
    table.enum('type', [
      'peer-review',
      'employer-check',
      'automated-scan',
      'expert-review',
    ]);
    table.enum('status', ['pending', 'approved', 'rejected', 'needs-revision']);
    table.text('notes');
    table.jsonb('evidence'); // Array of evidence URLs
    table.timestamp('verified_at');
    table.timestamp('expires_at');

    // Indexes
    table.index('certification_id');
    table.index('verifier_id');
    table.index('status');
    table.index('expires_at');
  });

  // Certification revocations table
  await knex.schema.createTable('certification_revocations', (table: any) => {
    table.uuid('id').primary();
    table.uuid('certification_id').notNullable().references('id').inTable('certifications');
    table.text('reason');
    table.timestamp('revoked_at').notNullable();

    table.index('certification_id');
    table.index('revoked_at');
  });
};

export const down = async (knex: any) => {
  // Drop tables in reverse order of creation
  await knex.schema.dropTableIfExists('certification_revocations');
  await knex.schema.dropTableIfExists('certification_verifications');
  await knex.schema.dropTableIfExists('skill_endorsements');
  await knex.schema.dropTableIfExists('portfolio_item_clicks');
  await knex.schema.dropTableIfExists('portfolio_views');
  await knex.schema.dropTableIfExists('portfolio_items');
  await knex.schema.dropTableIfExists('portfolios');
  await knex.schema.dropTableIfExists('badge_awards');
  await knex.schema.dropTableIfExists('badge_definitions');
  await knex.schema.dropTableIfExists('certifications');
  await knex.schema.dropTableIfExists('assessment_attempts');
  await knex.schema.dropTableIfExists('assessment_questions');
  await knex.schema.dropTableIfExists('assessments');
};
