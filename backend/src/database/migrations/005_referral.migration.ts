/**
 * Database Migration: Referral System
 */

export const up = async (knex: any) => {
  // Referrals table
  await knex.schema.createTable('referrals', (table: any) => {
    table.uuid('id').primary();
    table.uuid('referrer_id').notNullable();
    table.uuid('referee_id');
    table.string('referral_code', 20).unique().notNullable();
    table.string('referral_link').notNullable();
    table.enum('status', ['pending', 'active', 'completed', 'expired', 'cancelled']);
    table.timestamp('created_at').notNullable();
    table.timestamp('accepted_at');
    table.timestamp('expires_at').notNullable();
    table.jsonb('metadata');

    table.index('referrer_id');
    table.index('referral_code');
    table.index('status');
  });

  // Rewards table
  await knex.schema.createTable('rewards', (table: any) => {
    table.uuid('id').primary();
    table.uuid('referral_id').references('id').inTable('referrals');
    table.uuid('user_id').notNullable();
    table.enum('reward_type', ['credit', 'bonus-credits', 'discount', 'premium-access']);
    table.decimal('amount', 10, 2).notNullable();
    table.string('currency', 3).defaultTo('USD');
    table.enum('status', ['pending', 'earned', 'redeemed', 'expired']);
    table.timestamp('earned_at').notNullable();
    table.timestamp('redeemed_at');
    table.timestamp('expires_at');
    table.text('description');

    table.index('user_id');
    table.index('status');
  });

  // Payment methods table
  await knex.schema.createTable('payment_info', (table: any) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable();
    table.enum('method', ['credit-card', 'bank-transfer', 'paypal', 'stripe']);
    table.string('stripe_payment_method_id');
    table.jsonb('bank_details');
    table.string('paypal_email');
    table.boolean('is_verified').defaultTo(false);
    table.boolean('primary').defaultTo(false);
    table.timestamps(true, true);

    table.index('user_id');
  });

  // Payouts table
  await knex.schema.createTable('payouts', (table: any) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable();
    table.uuid('payment_info_id').references('id').inTable('payment_info');
    table.decimal('amount', 10, 2).notNullable();
    table.string('currency', 3).defaultTo('USD');
    table.enum('status', ['pending', 'processing', 'completed', 'failed', 'refunded']);
    table.enum('frequency', ['weekly', 'monthly', 'quarterly', 'on-demand']);
    table.jsonb('reward_ids');
    table.string('stripe_payout_id');
    table.timestamp('requested_at').notNullable();
    table.timestamp('completed_at');
    table.text('failure_reason');
    table.jsonb('metadata');

    table.index('user_id');
    table.index('status');
  });

  // Community members table
  await knex.schema.createTable('community_members', (table: any) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().unique();
    table.timestamp('joined_at').notNullable();
    table.enum('level', ['bronze', 'silver', 'gold', 'platinum']).defaultTo('bronze');
    table.integer('total_contributions').defaultTo(0);
    table.integer('total_points').defaultTo(0);
    table.integer('helpful_count').defaultTo(0);
    table.integer('followers').defaultTo(0);
    table.integer('following').defaultTo(0);
    table.jsonb('badges');
    table.boolean('verified').defaultTo(false);

    table.index('user_id');
    table.index('level');
    table.index('total_points');
  });

  // Community posts table
  await knex.schema.createTable('community_posts', (table: any) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable();
    table.enum('type', ['discussion', 'question', 'resource', 'job-tip', 'success-story']);
    table.string('title', 200).notNullable();
    table.text('content').notNullable();
    table.jsonb('tags');
    table.integer('likes').defaultTo(0);
    table.integer('comments').defaultTo(0);
    table.integer('shares').defaultTo(0);
    table.timestamps(true, true);

    table.index('user_id');
    table.index('type');
    table.index('created_at');
  });

  // Post likes table
  await knex.schema.createTable('post_likes', (table: any) => {
    table.uuid('id').primary();
    table.uuid('post_id').references('id').inTable('community_posts');
    table.uuid('user_id').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('post_id');
    table.index('user_id');
    table.unique(['post_id', 'user_id']);
  });

  // Community comments table
  await knex.schema.createTable('community_comments', (table: any) => {
    table.uuid('id').primary();
    table.uuid('post_id').references('id').inTable('community_posts');
    table.uuid('user_id').notNullable();
    table.text('content').notNullable();
    table.integer('likes').defaultTo(0);
    table.integer('replies').defaultTo(0);
    table.timestamps(true, true);

    table.index('post_id');
    table.index('user_id');
  });

  // Contributions table
  await knex.schema.createTable('contributions', (table: any) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable();
    table.enum('type', ['post', 'comment', 'resource', 'mentoring', 'event']);
    table.uuid('reference_id');
    table.string('title').notNullable();
    table.text('description');
    table.integer('points_earned').defaultTo(0);
    table.timestamp('created_at').notNullable();

    table.index('user_id');
    table.index('type');
  });
};

export const down = async (knex: any) => {
  await knex.schema.dropTableIfExists('contributions');
  await knex.schema.dropTableIfExists('community_comments');
  await knex.schema.dropTableIfExists('post_likes');
  await knex.schema.dropTableIfExists('community_posts');
  await knex.schema.dropTableIfExists('community_members');
  await knex.schema.dropTableIfExists('payouts');
  await knex.schema.dropTableIfExists('payment_info');
  await knex.schema.dropTableIfExists('rewards');
  await knex.schema.dropTableIfExists('referrals');
};
