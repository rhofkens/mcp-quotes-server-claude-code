/**
 * Logger configuration using Winston
 * 
 * Logs to files only - console output would interfere with MCP STDIO protocol
 */

import path from 'path';

import winston from 'winston';

import { getConfig, type Config } from './config.js';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');

// Lazy config getter with defaults
let cachedConfig: Config | null = null;
function getSafeConfig(): Partial<Config> {
  try {
    if (!cachedConfig) {
      cachedConfig = getConfig();
    }
    return cachedConfig;
  } catch {
    // Return defaults if config loading fails
    return {
      logLevel: 'info',
      nodeEnv: 'development'
    };
  }
}

/**
 * Create Winston logger instance configured for MCP
 * IMPORTANT: No console output - would interfere with MCP STDIO protocol
 */
let loggerInstance: winston.Logger | null = null;

function getLogger(): winston.Logger {
  if (!loggerInstance) {
    const config = getSafeConfig();
    loggerInstance = winston.createLogger({
      level: config.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        // File transport for all logs
        new winston.transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: path.join(logsDir, 'combined.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      ],
      // Prevent unhandled promise rejection from stopping the process
      exitOnError: false
    });

    // Add file transport for debug logs in development
    if (config.nodeEnv === 'development') {
      loggerInstance.add(new winston.transports.File({
        filename: path.join(logsDir, 'debug.log'),
        level: 'debug',
        maxsize: 5242880, // 5MB
        maxFiles: 3
      }));
    }
  }
  return loggerInstance;
}

/**
 * Create a child logger with additional context
 */
export function createLogger(context: Record<string, any>) {
  return getLogger().child(context);
}

/**
 * Performance logger for tracking operation durations
 */
export class PerformanceLogger {
  private timers: Map<string, number> = new Map();

  start(operation: string): void {
    this.timers.set(operation, Date.now());
    getLogger().debug('Performance timer started', { operation });
  }

  end(operation: string, metadata?: Record<string, any>): void {
    const startTime = this.timers.get(operation);
    if (!startTime) {
      getLogger().warn('Performance timer not found', { operation });
      return;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(operation);
    
    getLogger().info('Operation completed', {
      operation,
      duration,
      ...metadata
    });
  }
}

/**
 * Request logger for MCP/HTTP requests
 */
export class RequestLogger {
  logRequest(method: string, params: any, id?: string | number): void {
    getLogger().info('Request received', {
      type: 'request',
      method,
      id,
      params: this.sanitizeParams(params)
    });
  }

  logResponse(method: string, result: any, id?: string | number, duration?: number): void {
    getLogger().info('Response sent', {
      type: 'response',
      method,
      id,
      duration,
      hasResult: result !== undefined
    });
  }

  logError(method: string, error: any, id?: string | number): void {
    getLogger().error('Request error', {
      type: 'error',
      method,
      id,
      error: error.message || error,
      stack: error.stack
    });
  }

  private sanitizeParams(params: any): any {
    if (!params) {return params;}
    
    // Remove sensitive data like API keys
    const sanitized = { ...params };
    if (sanitized.apiKey) {sanitized.apiKey = '***';}
    if (sanitized.token) {sanitized.token = '***';}
    if (sanitized.serperApiKey) {sanitized.serperApiKey = '***';}
    
    return sanitized;
  }
}

// Export a proxy object that looks like a logger but initializes lazily
export const logger = new Proxy({} as winston.Logger, {
  get(_target, prop) {
    const actualLogger = getLogger();
    return Reflect.get(actualLogger, prop);
  }
});
export const performanceLogger = new PerformanceLogger();
export const requestLogger = new RequestLogger();