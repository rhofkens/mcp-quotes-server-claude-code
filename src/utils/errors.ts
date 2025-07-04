/**
 * Error Handling Utilities
 * 
 * Custom error classes and error handling utilities for the MCP Quotes Server
 */

import { isDevelopment } from './config.js';

/**
 * Error codes for categorizing different error types
 */
export enum ErrorCode {
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_PARAMETER = 'MISSING_PARAMETER',
  TYPE_MISMATCH = 'TYPE_MISMATCH',
  
  // API errors
  API_ERROR = 'API_ERROR',
  API_TIMEOUT = 'API_TIMEOUT',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_UNAUTHORIZED = 'API_UNAUTHORIZED',
  API_NOT_FOUND = 'API_NOT_FOUND',
  
  // Configuration errors
  CONFIG_ERROR = 'CONFIG_ERROR',
  MISSING_ENV_VAR = 'MISSING_ENV_VAR',
  INVALID_CONFIG = 'INVALID_CONFIG',
  
  // MCP specific errors
  MCP_ERROR = 'MCP_ERROR',
  MCP_METHOD_NOT_FOUND = 'MCP_METHOD_NOT_FOUND',
  MCP_INVALID_PARAMS = 'MCP_INVALID_PARAMS',
  MCP_INTERNAL_ERROR = 'MCP_INTERNAL_ERROR',
  
  // Resource errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_UNAVAILABLE = 'RESOURCE_UNAVAILABLE',
}

/**
 * Base error class for all custom errors
 */
export class BaseError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
  
  /**
   * Convert error to JSON representation
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      ...(isDevelopment() && { stack: this.stack }),
    };
  }
  
  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    // Override in subclasses for custom user messages
    return this.message;
  }
}

/**
 * MCP protocol specific errors
 */
export class MCPError extends BaseError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.MCP_ERROR,
    details?: Record<string, unknown>
  ) {
    super(message, code, 500, details);
  }
  
  override getUserMessage(): string {
    switch (this.code) {
      case ErrorCode.MCP_METHOD_NOT_FOUND:
        return 'The requested method is not available';
      case ErrorCode.MCP_INVALID_PARAMS:
        return 'Invalid parameters provided';
      case ErrorCode.MCP_INTERNAL_ERROR:
        return 'An internal server error occurred';
      default:
        return 'An error occurred while processing your request';
    }
  }
}

/**
 * Validation errors for input validation failures
 */
export class ValidationError extends BaseError {
  constructor(
    message: string,
    public field?: string,
    details?: Record<string, unknown>
  ) {
    super(
      message,
      ErrorCode.VALIDATION_ERROR,
      400,
      { ...details, field }
    );
  }
  
  override getUserMessage(): string {
    if (this.field) {
      return `Invalid value for field '${this.field}': ${this.message}`;
    }
    return `Validation error: ${this.message}`;
  }
}

/**
 * API errors for external service failures
 */
export class APIError extends BaseError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.API_ERROR,
    public service?: string,
    details?: Record<string, unknown>
  ) {
    const statusCode = APIError.getStatusCodeForErrorCode(code);
    super(message, code, statusCode, { ...details, service });
  }
  
  private static getStatusCodeForErrorCode(code: ErrorCode): number {
    switch (code) {
      case ErrorCode.API_UNAUTHORIZED:
        return 401;
      case ErrorCode.API_NOT_FOUND:
        return 404;
      case ErrorCode.API_RATE_LIMIT:
        return 429;
      case ErrorCode.API_TIMEOUT:
        return 504;
      default:
        return 502; // Bad Gateway for generic API errors
    }
  }
  
  override getUserMessage(): string {
    switch (this.code) {
      case ErrorCode.API_TIMEOUT:
        return 'The request timed out. Please try again.';
      case ErrorCode.API_RATE_LIMIT:
        return 'Rate limit exceeded. Please try again later.';
      case ErrorCode.API_UNAUTHORIZED:
        return 'Authentication failed. Please check your API credentials.';
      case ErrorCode.API_NOT_FOUND:
        return 'The requested resource was not found.';
      default:
        return 'An error occurred while communicating with external services.';
    }
  }
}

/**
 * Configuration errors
 */
export class ConfigError extends BaseError {
  constructor(
    message: string,
    public variable?: string,
    details?: Record<string, unknown>
  ) {
    super(
      message,
      ErrorCode.CONFIG_ERROR,
      500,
      { ...details, variable }
    );
  }
  
  override getUserMessage(): string {
    if (this.variable) {
      return `Configuration error: Missing or invalid ${this.variable}`;
    }
    return 'Configuration error: Please check your environment settings';
  }
}

/**
 * Error formatter for consistent error messages
 */
export class ErrorFormatter {
  /**
   * Format error for logging
   */
  static formatForLog(error: Error): string {
    if (error instanceof BaseError) {
      return JSON.stringify(error.toJSON(), null, 2);
    }
    
    return JSON.stringify({
      name: error.name,
      message: error.message,
      stack: error.stack,
    }, null, 2);
  }
  
  /**
   * Format error for user display
   */
  static formatForUser(error: Error): string {
    if (error instanceof BaseError) {
      return error.getUserMessage();
    }
    
    // Generic message for unknown errors
    return 'An unexpected error occurred. Please try again.';
  }
  
  /**
   * Extract error details for debugging
   */
  static extractDetails(error: unknown): Record<string, unknown> {
    if (error instanceof BaseError) {
      return error.details || {};
    }
    
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        ...(isDevelopment() && { stack: error.stack }),
      };
    }
    
    return {
      error: String(error),
    };
  }
}

/**
 * Wrap an error with additional context
 */
export function wrapError(
  error: unknown,
  message: string,
  code?: ErrorCode
): BaseError {
  if (error instanceof BaseError) {
    // Preserve original error but add context
    return new BaseError(
      `${message}: ${error.message}`,
      code || error.code,
      error.statusCode,
      {
        ...error.details,
        originalError: error.toJSON(),
      }
    );
  }
  
  if (error instanceof Error) {
    return new BaseError(
      `${message}: ${error.message}`,
      code || ErrorCode.INTERNAL_ERROR,
      500,
      {
        originalError: error.message,
        ...(isDevelopment() && { stack: error.stack }),
      }
    );
  }
  
  return new BaseError(
    message,
    code || ErrorCode.UNKNOWN_ERROR,
    500,
    {
      originalError: String(error),
    }
  );
}

/**
 * Type guard to check if error is a BaseError
 */
export function isBaseError(error: unknown): error is BaseError {
  return error instanceof BaseError;
}

/**
 * Type guard to check if error has a code property
 */
export function hasErrorCode(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as any).code === 'string'
  );
}

/**
 * Convert unknown error to BaseError
 */
export function toBaseError(error: unknown): BaseError {
  if (error instanceof BaseError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new BaseError(
      error.message,
      ErrorCode.INTERNAL_ERROR,
      500,
      {
        originalError: error.name,
        ...(isDevelopment() && { stack: error.stack }),
      }
    );
  }
  
  return new BaseError(
    'An unknown error occurred',
    ErrorCode.UNKNOWN_ERROR,
    500,
    {
      originalError: String(error),
    }
  );
}