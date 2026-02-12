/**
 * Database Migrations
 * Run with: npm run migrate
 */

import { db } from '@/utils/database';
import { logger } from '@/utils/logger';

export const migrations = [
  {
    name: '001_create_users_table',
    up: `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(50) NOT NULL DEFAULT 'candidate' CHECK (role IN ('candidate', 'employer', 'admin')),
        status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'deleted')),
        email_verified BOOLEAN DEFAULT FALSE,
        email_verified_at TIMESTAMP,
        phone_verified BOOLEAN DEFAULT FALSE,
        phone_verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX users_email_idx (email),
        INDEX users_role_idx (role),
        INDEX users_status_idx (status)
      );
    `,
    down: `DROP TABLE IF EXISTS users;`,
  },
  {
    name: '002_create_otp_logs_table',
    up: `
      CREATE TABLE IF NOT EXISTS otp_logs (
        id UUID PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp_code VARCHAR(10) NOT NULL,
        purpose VARCHAR(50) NOT NULL CHECK (purpose IN ('registration', 'login', 'forgot_password', 'email_verification')),
        is_verified BOOLEAN DEFAULT FALSE,
        verified_at TIMESTAMP,
        attempt_count INT DEFAULT 0,
        max_attempts INT DEFAULT 5,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX otp_logs_email_idx (email),
        INDEX otp_logs_expires_at_idx (expires_at)
      );
    `,
    down: `DROP TABLE IF EXISTS otp_logs;`,
  },
  {
    name: '003_create_password_reset_tokens_table',
    up: `
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        used_at TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX password_reset_tokens_user_id_idx (user_id),
        INDEX password_reset_tokens_expires_at_idx (expires_at)
      );
    `,
    down: `DROP TABLE IF EXISTS password_reset_tokens;`,
  },
];

export const runMigrations = async (): Promise<void> => {
  try {
    await db.connect();

    for (const migration of migrations) {
      try {
        await db.query(migration.up);
        logger.info(`Migration completed: ${migration.name}`);
      } catch (error) {
        logger.error(`Migration failed: ${migration.name}`, error);
        throw error;
      }
    }

    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Migration error', error);
    process.exit(1);
  } finally {
    await db.disconnect();
  }
};

if (require.main === module) {
  runMigrations();
}
