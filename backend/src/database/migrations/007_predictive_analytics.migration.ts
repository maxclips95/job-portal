import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Career predictions table
  await knex.schema.createTable('career_predictions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('current_role', 100);
    table.json('predicted_roles').defaultTo('[]');
    table.json('career_path').defaultTo('[]');
    table.decimal('confidence_score', 5, 2).defaultTo(0);
    table.timestamp('generated_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('generated_at');
    table.unique(['user_id', 'generated_at']);
  });

  // Skill recommendations table
  await knex.schema.createTable('skill_recommendations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('skill_name', 100).notNullable();
    table.decimal('relevance_score', 5, 2).notNullable();
    table.enum('difficulty', ['beginner', 'intermediate', 'advanced', 'expert']).defaultTo('beginner');
    table.integer('market_demand').defaultTo(50);
    table.integer('salary_boost').defaultTo(0);
    table.json('learning_resources').defaultTo('[]');
    table.json('prerequisite_skills').defaultTo('[]');
    table.integer('time_to_mastery').defaultTo(100); // hours
    table.boolean('adopted').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('skill_name');
    table.index('relevance_score');
    table.unique(['user_id', 'skill_name']);
  });

  // Skill gaps table
  await knex.schema.createTable('skill_gaps', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('skill_name', 100).notNullable();
    table.integer('current_level').defaultTo(0);
    table.integer('required_level').notNullable();
    table.integer('gap').notNullable();
    table.enum('priority', ['critical', 'high', 'medium', 'low']).defaultTo('medium');
    table.json('recommended_resources').defaultTo('[]');
    table.integer('estimated_time_to_learn').defaultTo(0); // hours
    table.string('target_role', 100);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('priority');
    table.index(['user_id', 'target_role']);
  });

  // Career insights table
  await knex.schema.createTable('career_insights', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('insight').notNullable();
    table.decimal('confidence', 3, 2).notNullable();
    table.json('action_items').defaultTo('[]');
    table.text('expected_outcome');
    table.enum('insight_type', ['skill_gaps', 'market_trends', 'growth_opportunities', 'salary']).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('insight_type');
  });

  // Learning resources table
  await knex.schema.createTable('learning_resources', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('skill_name', 100).notNullable();
    table.enum('type', ['course', 'book', 'tutorial', 'certification', 'project', 'mentorship']).notNullable();
    table.string('title', 200).notNullable();
    table.string('provider', 150).notNullable();
    table.integer('duration').defaultTo(0); // hours
    table.integer('cost').defaultTo(0); // cents
    table.decimal('rating', 3, 1).defaultTo(0);
    table.text('description');
    table.string('url', 500);
    table.json('prerequisites').defaultTo('[]');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('skill_name');
    table.index('type');
    table.index('rating');
  });

  // Learning paths table
  await knex.schema.createTable('learning_paths', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('title', 200).notNullable();
    table.text('description');
    table.json('target_skills').notNullable();
    table.integer('current_progress_percent').defaultTo(0);
    table.integer('estimated_completion_hours').defaultTo(0);
    table.timestamp('start_date').defaultTo(knex.fn.now());
    table.timestamp('target_completion_date');
    table.enum('status', ['active', 'paused', 'completed', 'archived']).defaultTo('active');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('status');
  });

  // Skill progress tracking table
  await knex.schema.createTable('skill_progress', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('skill_name', 100).notNullable();
    table.integer('progress_percentage').defaultTo(0);
    table.integer('hours_logged').defaultTo(0);
    table.integer('resources_completed').defaultTo(0);
    table.decimal('average_score', 5, 2).defaultTo(0);
    table.timestamp('last_activity').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('skill_name');
    table.unique(['user_id', 'skill_name']);
  });

  // Analytics metrics table
  await knex.schema.createTable('analytics_metrics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('metric_name', 100).notNullable();
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.decimal('value', 10, 2).notNullable();
    table.enum('trend', ['up', 'down', 'stable']).defaultTo('stable');
    table.decimal('trend_percentage', 5, 2).defaultTo(0);
    table.timestamp('recorded_at').defaultTo(knex.fn.now());

    table.index('metric_name');
    table.index(['user_id', 'metric_name']);
    table.index('recorded_at');
  });

  // Prediction accuracy tracking table
  await knex.schema.createTable('prediction_accuracy', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('metric_name', 100).notNullable();
    table.decimal('predicted_value', 10, 2).notNullable();
    table.decimal('actual_value', 10, 2).notNullable();
    table.integer('accuracy').defaultTo(0); // 0-100 percent
    table.timestamp('recorded_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('metric_name');
  });

  // Recommendation feedback table
  await knex.schema.createTable('recommendation_feedback', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('recommendation_id').notNullable().references('id').inTable('skill_recommendations').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('skill_name', 100).notNullable();
    table.integer('satisfaction_score').notNullable(); // 1-5
    table.boolean('adopted').defaultTo(false);
    table.integer('days_to_adoption');
    table.text('feedback_text');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('recommendation_id');
    table.index('user_id');
    table.index('skill_name');
  });

  // Bias reports table
  await knex.schema.createTable('bias_reports', (table) => {
    table.uuid('id').primary();
    table.timestamp('generated_at').defaultTo(knex.fn.now());
    table.decimal('overall_bias_score', 5, 2).defaultTo(0);
    table.integer('biases_detected').defaultTo(0);
    table.json('recommendations').defaultTo('[]');
    table.json('report_data').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('generated_at');
  });

  // Bias metrics tracking table
  await knex.schema.createTable('bias_metrics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('bias_report_id').references('id').inTable('bias_reports').onDelete('CASCADE');
    table.string('metric_name', 100).notNullable();
    table.enum('bias_type', ['gender', 'age', 'ethnicity', 'education', 'experience', 'location']).notNullable();
    table.boolean('detected_bias').defaultTo(false);
    table.decimal('bias_score', 5, 2).defaultTo(0);
    table.json('affected_groups').defaultTo('[]');
    table.json('recommendations').defaultTo('[]');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('bias_report_id');
    table.index('bias_type');
  });

  // Salary data table for benchmarking
  await knex.schema.createTable('salary_data', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('role', 100).notNullable();
    table.string('industry', 100);
    table.string('location', 150);
    table.string('region', 100);
    table.integer('years_experience').defaultTo(0);
    table.decimal('salary', 12, 2).notNullable();
    table.decimal('recommended_salary', 12, 2);
    table.json('key_skills').defaultTo('[]');
    table.json('benefits').defaultTo('[]');
    table.string('gender');
    table.string('education_level');
    table.timestamp('recorded_at').defaultTo(knex.fn.now());

    table.index('role');
    table.index('years_experience');
    table.index('salary');
    table.index(['role', 'years_experience']);
  });

  // Skills market trends table
  await knex.schema.createTable('skill_market_trends', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('skill_name', 100).notNullable();
    table.string('industry', 100);
    table.integer('demand_score').defaultTo(50); // 0-100
    table.integer('average_salary').defaultTo(0);
    table.integer('job_openings').defaultTo(0);
    table.integer('growth_rate_percent').defaultTo(0);
    table.timestamp('recorded_at').defaultTo(knex.fn.now());

    table.index('skill_name');
    table.index('demand_score');
    table.index(['skill_name', 'industry']);
  });

  // Role requirements table
  await knex.schema.createTable('role_required_skills', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('role', 100).notNullable();
    table.string('skill_name', 100).notNullable();
    table.integer('required_level').defaultTo(1); // 1-5
    table.integer('importance').defaultTo(3); // 1-5
    table.json('alternatives').defaultTo('[]'); // Alternative skills
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('role');
    table.index('skill_name');
    table.unique(['role', 'skill_name']);
  });

  // Career transitions history
  await knex.schema.createTable('career_transitions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('from_role', 100).notNullable();
    table.string('to_role', 100).notNullable();
    table.integer('years_to_transition').defaultTo(1);
    table.json('skills_acquired').defaultTo('[]');
    table.timestamp('transition_date').defaultTo(knex.fn.now());

    table.index('from_role');
    table.index('to_role');
  });

  // Skills table (if not already exists)
  const hasSkillsTable = await knex.schema.hasTable('skills');
  if (!hasSkillsTable) {
    await knex.schema.createTable('skills', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name', 100).unique().notNullable();
      table.text('description');
      table.enum('category', ['technical', 'soft', 'domain', 'tool']).defaultTo('technical');
      table.integer('difficulty').defaultTo(1); // 1-5
      table.integer('market_demand').defaultTo(50);
      table.integer('salary_boost').defaultTo(0);
      table.json('prerequisite_skills').defaultTo('[]');
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.index('name');
      table.index('category');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order of creation
  await knex.schema.dropTableIfExists('career_transitions');
  await knex.schema.dropTableIfExists('role_required_skills');
  await knex.schema.dropTableIfExists('skill_market_trends');
  await knex.schema.dropTableIfExists('salary_data');
  await knex.schema.dropTableIfExists('bias_metrics');
  await knex.schema.dropTableIfExists('bias_reports');
  await knex.schema.dropTableIfExists('recommendation_feedback');
  await knex.schema.dropTableIfExists('prediction_accuracy');
  await knex.schema.dropTableIfExists('analytics_metrics');
  await knex.schema.dropTableIfExists('skill_progress');
  await knex.schema.dropTableIfExists('learning_paths');
  await knex.schema.dropTableIfExists('learning_resources');
  await knex.schema.dropTableIfExists('career_insights');
  await knex.schema.dropTableIfExists('skill_gaps');
  await knex.schema.dropTableIfExists('skill_recommendations');
  await knex.schema.dropTableIfExists('career_predictions');
}
