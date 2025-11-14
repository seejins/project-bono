import logger from '../utils/logger';

interface EnvConfig {
  NODE_ENV: string;
  PORT: string;
  DATABASE_URL?: string;
  FRONTEND_URL?: string;
  API_KEY?: string;
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
}

const requiredEnvVars = {
  production: ['NODE_ENV', 'PORT', 'DATABASE_URL', 'FRONTEND_URL'],
  development: ['NODE_ENV', 'PORT'],
} as const;

export function validateEnvironment(): void {
  const env = (process.env.NODE_ENV || 'development') as 'production' | 'development';
  const required = requiredEnvVars[env];

  const missing: string[] = [];

  for (const varName of required) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    const errorMessage = `❌ Missing required environment variables: ${missing.join(', ')}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  logger.debug('✅ Environment variables validated');
}

export function getEnvConfig(): EnvConfig {
  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || '3001',
    DATABASE_URL: process.env.DATABASE_URL,
    FRONTEND_URL: process.env.FRONTEND_URL,
    API_KEY: process.env.API_KEY,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    SESSION_SECRET: process.env.SESSION_SECRET,
  };
}

