/**
 * 🔒 Production-Safe Logger
 * 
 * Logging hanya aktif di development mode.
 * Di production, semua logs akan dinonaktifkan untuk keamanan.
 */

// 🔒 PRODUCTION MODE: Disable ALL logs (set to false to enable)
const ENABLE_LOGGING = false; // ✅ DISABLED for clean console

// 🔒 PRODUCTION MODE: Disable all logs
const noOp = () => {};

export const logger = {
  log: ENABLE_LOGGING ? console.log.bind(console) : noOp,
  warn: ENABLE_LOGGING ? console.warn.bind(console) : noOp,
  error: ENABLE_LOGGING ? console.error.bind(console) : noOp,
  info: ENABLE_LOGGING ? console.info.bind(console) : noOp,
  debug: ENABLE_LOGGING ? console.debug.bind(console) : noOp,
  
  // ✅ For critical errors that SHOULD show in production (also disabled for clean console)
  critical: ENABLE_LOGGING ? (message: string, ...args: any[]) => {
    console.error(`[CRITICAL ERROR] ${message}`, ...args);
  } : noOp
};

// Helper to check if logging is enabled
export const isLoggingEnabled = ENABLE_LOGGING;

// Export default
export default logger;