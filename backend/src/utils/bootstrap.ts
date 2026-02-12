import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/utils/database';
import { logger } from '@/utils/logger';

export const ensureDefaultAdminUser = async (): Promise<void> => {
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim();
  const adminPassword = (process.env.ADMIN_PASSWORD || '').trim();

  if (!adminEmail || !adminPassword) {
    logger.warn('Skipping default admin bootstrap: ADMIN_EMAIL or ADMIN_PASSWORD missing');
    return;
  }

  const existing = await db.query(
    'SELECT id, role FROM users WHERE email = $1 LIMIT 1',
    [adminEmail]
  );

  if (existing.rows.length > 0) {
    if (existing.rows[0].role !== 'admin') {
      await db.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [
        'admin',
        existing.rows[0].id,
      ]);
      logger.info(`Default admin role enforced for existing user: ${adminEmail}`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await db.query(
    `
      INSERT INTO users (
        id, email, password_hash, first_name, last_name, phone, role, status,
        email_verified, phone_verified, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
      )
    `,
    [
      uuidv4(),
      adminEmail,
      passwordHash,
      'System',
      'Admin',
      '',
      'admin',
      'active',
      true,
      false,
    ]
  );

  logger.info(`Default admin user created: ${adminEmail}`);
};
