const isProduction = process.env.NODE_ENV === 'production';
const isDebug = process.env.DEBUG === 'true';

const shouldLog = (level: 'debug' | 'log' | 'warn' | 'error') => {
  if (level === 'error') return true; // Always log errors
  if (isProduction && !isDebug) return false; // No logging in production unless DEBUG=true
  return true;
};

export const logger = {
  debug: (...args: any[]) => {
    if (shouldLog('debug')) {
      console.debug(...args);
    }
  },

  log: (...args: any[]) => {
    if (shouldLog('log')) {
      console.log(...args);
    }
  },

  warn: (...args: any[]) => {
    if (shouldLog('warn')) {
      console.warn(...args);
    }
  },

  error: (...args: any[]) => {
    if (shouldLog('error')) {
      console.error(...args);
    }
  },
};

export default logger;

