import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { db } from '@/utils/database';
import { logger, morganMiddleware } from '@/utils/logger';
import { errorHandler } from '@/middleware/error';
import {
  globalApiRateLimit,
  sanitizeRequestInputs,
  setSecurityHeaders,
} from '@/middleware/security';
import authRoutes from '@/routes/auth.routes';
import jobRoutes from '@/routes/job.routes';
import applicationRoutes from '@/routes/application.routes';
import aiRoutes from '@/routes/ai.routes';
import screeningRoutes from '@/routes/screening.routes';
import adminRoutes from '@/routes/admin.routes';
import candidateRoutes from '@/routes/candidate.routes';
import analyticsRoutes from '@/routes/analytics.routes';
import referralRoutes from '@/routes/referral.routes';
import certificationRoutes from '@/routes/certification.routes';
import { ensureDefaultAdminUser } from '@/utils/bootstrap';
import { validateRuntimeEnv } from '@/utils/env.guard';

// Load environment variables from common run locations.
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app: Express = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

validateRuntimeEnv();

app.disable('x-powered-by');
app.set('trust proxy', 1);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(setSecurityHeaders);
app.use(
  cors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      if (!origin || allowedOrigins.includes(origin) || !isProduction) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Request logging
app.use(morganMiddleware);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(sanitizeRequestInputs);
app.use('/api', globalApiRateLimit);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    database: db.isHealthy() ? 'connected' : 'disconnected',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/screening', screeningRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/certification', certificationRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    timestamp: new Date(),
  });
});

// Error handler (must be last)
app.use(errorHandler);

export const startServer = async (): Promise<void> => {
  try {
    await db.connect();
    await ensureDefaultAdminUser();

    app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await db.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await db.disconnect();
  process.exit(0);
});

export default app;

if (require.main === module) {
  startServer();
}

