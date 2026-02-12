import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

type SqlMigration = {
  name: string;
  filePath: string;
};

const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend', '.env'),
  path.resolve(__dirname, '..', '..', '.env'),
];

for (const envPath of envCandidates) {
  dotenv.config({ path: envPath });
}

const useSsl = process.env.DB_SSL === 'true';
const connectionString = process.env.DATABASE_URL;

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'job_portal',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres_password',
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    });

const migrationDirCandidates = [
  path.resolve(process.cwd(), 'src', 'database', 'migrations'),
  path.resolve(process.cwd(), 'backend', 'src', 'database', 'migrations'),
  path.resolve(__dirname, '..', '..', 'src', 'database', 'migrations'),
];

const resolveMigrationDir = (): string => {
  for (const dir of migrationDirCandidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }
  throw new Error('Could not resolve migration directory');
};

const getSqlMigrations = (): SqlMigration[] => {
  const migrationDir = resolveMigrationDir();

  return fs
    .readdirSync(migrationDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => ({
      name: file,
      filePath: path.join(migrationDir, file),
    }));
};

const ensureMigrationsTable = async (): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
};

const hasMigrationRun = async (name: string): Promise<boolean> => {
  const result = await pool.query(
    'SELECT 1 FROM schema_migrations WHERE name = $1 LIMIT 1',
    [name]
  );
  return result.rows.length > 0;
};

const applyMigration = async (migration: SqlMigration): Promise<void> => {
  if (await hasMigrationRun(migration.name)) {
    console.log(`Skipping already applied migration: ${migration.name}`);
    return;
  }

  const sql = fs.readFileSync(migration.filePath, 'utf8');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (name) VALUES ($1)',
      [migration.name]
    );
    await client.query('COMMIT');
    console.log(`Applied migration: ${migration.name}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const run = async (): Promise<void> => {
  try {
    await ensureMigrationsTable();
    const migrations = getSqlMigrations();

    if (migrations.length === 0) {
      console.log('No SQL migration files found.');
      return;
    }

    for (const migration of migrations) {
      await applyMigration(migration);
    }

    console.log('Migrations completed.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

if (require.main === module) {
  run();
}

export { run as runMigrations };
