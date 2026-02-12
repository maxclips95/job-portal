const MIN_SECRET_LENGTH = 24;

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.trim();
};

export const validateRuntimeEnv = (): void => {
  const jwtSecret = requireEnv('JWT_SECRET');
  const refreshSecret = requireEnv('REFRESH_TOKEN_SECRET');

  if (jwtSecret.length < MIN_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters`);
  }
  if (refreshSecret.length < MIN_SECRET_LENGTH) {
    throw new Error(`REFRESH_TOKEN_SECRET must be at least ${MIN_SECRET_LENGTH} characters`);
  }

  const rawCors = process.env.CORS_ORIGIN || 'http://localhost:3000';
  const origins = rawCors
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error('CORS_ORIGIN must include at least one origin');
  }
};
