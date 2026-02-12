import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient: RedisClientType | null = null;

export const initRedis = async (): Promise<RedisClientType> => {
  if (redisClient) {
    return redisClient;
  }

  redisClient = createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
  }) as any;

  redisClient.on('error', (err) => console.log('Redis Client Error', err));
  await (redisClient as any).connect?.();
  console.log('✓ Redis connected');

  return redisClient;
};

export const getRedisClient = (): RedisClientType | null => {
  return redisClient;
};

export default redisClient;
