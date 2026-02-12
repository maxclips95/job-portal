import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { logger } from './logger';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

class Database {
  private pool: any;
  private isConnected = false;

  constructor() {
    const useSsl = process.env.DB_SSL === 'true';
    const connectionString = process.env.DATABASE_URL;

    this.pool = connectionString
      ? new Pool({
          connectionString,
          ssl: useSsl ? { rejectUnauthorized: false } : undefined,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        })
      : new Pool({
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          database: process.env.DB_NAME || 'job_portal',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
          ssl: useSsl ? { rejectUnauthorized: false } : undefined,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });

    this.pool.on('error', (err: Error) => {
      logger.error('Unexpected error on idle client', err);
    });
  }

  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      client.release();
      this.isConnected = true;
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
    this.isConnected = false;
    logger.info('Database disconnected');
  }

  async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug(`Query executed in ${duration}ms`, { query: text });
      return result;
    } catch (error) {
      logger.error('Database query error', error);
      throw error;
    }
  }

  async getClient(): Promise<any> {
    return this.pool.connect();
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}

export const db = new Database();
