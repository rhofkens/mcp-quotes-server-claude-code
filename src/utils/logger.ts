/**
 * Logger configuration using Winston
 * 
 * Logs to files only - console output would interfere with MCP STDIO protocol
 */

import path from 'path';

import winston from 'winston';

import { config } from './config.js';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');

/**
 * Create Winston logger instance configured for MCP
 * IMPORTANT: No console output - would interfere with MCP STDIO protocol
 */
const logger = winston.createLogger({
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
  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'debug.log'),
    level: 'debug',
    maxsize: 5242880, // 5MB
    maxFiles: 3
  }));
}

/**
 * Create a child logger with additional context
 */
export function createLogger(context: Record<string, any>) {
  return logger.child(context);
}

/**
 * Performance logger for tracking operation durations
 */
export class PerformanceLogger {
  private timers: Map<string, number> = new Map();

  start(operation: string): void {
    this.timers.set(operation, Date.now());
    logger.debug('Performance timer started', { operation });
  }

  end(operation: string, metadata?: Record<string, any>): void {
    const startTime = this.timers.get(operation);
    if (!startTime) {
      logger.warn('Performance timer not found', { operation });
      return;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(operation);
    
    logger.info('Operation completed', {
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
    logger.info('Request received', {
      type: 'request',
      method,
      id,
      params: this.sanitizeParams(params)
    });
  }

  logResponse(method: string, result: any, id?: string | number, duration?: number): void {
    logger.info('Response sent', {
      type: 'response',
      method,
      id,
      duration,
      hasResult: result !== undefined
    });
  }

  logError(method: string, error: any, id?: string | number): void {
    logger.error('Request error', {
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

// Export singleton instances
export { logger };
export const performanceLogger = new PerformanceLogger();
export const requestLogger = new RequestLogger();