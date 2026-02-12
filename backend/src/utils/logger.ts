import morgan from 'morgan';
import { Request, Response } from 'express';

enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export class Logger {
  private logLevel = process.env.LOG_LEVEL || 'debug';
  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel.toUpperCase());
  }

  private withContext(message: string): string {
    return this.context ? `[${this.context}] ${message}` : message;
  }

  debug(message: string, meta?: unknown): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(`[${new Date().toISOString()}] [DEBUG] ${this.withContext(message)}`, meta || '');
    }
  }

  info(message: string, meta?: unknown): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(`[${new Date().toISOString()}] [INFO] ${this.withContext(message)}`, meta || '');
    }
  }

  warn(message: string, meta?: unknown): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(`[${new Date().toISOString()}] [WARN] ${this.withContext(message)}`, meta || '');
    }
  }

  error(message: string, error?: unknown): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(`[${new Date().toISOString()}] [ERROR] ${this.withContext(message)}`);
      if (error instanceof Error) {
        console.error(error.stack);
      } else {
        console.error(error);
      }
    }
  }
}

export const logger = new Logger('App');

export const morganMiddleware = morgan((tokens: any, req: Request, res: Response) => {
  return [
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    tokens['response-time'](req, res),
    'ms',
  ].join(' ');
});
