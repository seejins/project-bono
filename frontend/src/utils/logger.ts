/**
 * Logger utility that gates logs based on environment
 * In production, only errors are logged unless VITE_DEBUG is enabled
 */

const isDebug = import.meta.env.VITE_DEBUG === 'true' || import.meta.env.DEV;

const logger = {
  log: (...args: any[]) => {
    if (isDebug) {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDebug) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    // Always log errors, even in production
    console.error(...args);
  },
  debug: (...args: any[]) => {
    if (isDebug) {
      console.debug(...args);
    }
  },
};

export default logger;
