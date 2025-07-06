/**
 * Comprehensive Error Handling Utilities
 * 
 * Advanced error handling with retry logic, structured responses, and debugging capabilities
 */

import { BaseError, ErrorCode, APIError } from './errors.js';
import { logger } from './logger.js';

/**
 * Configuration for retry logic
 */
export interface IRetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors?: ErrorCode[];
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: IRetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000,    // 30 seconds
  backoffMultiplier: 2,
  retryableErrors: [
    ErrorCode.API_TIMEOUT,
    ErrorCode.API_RATE_LIMIT,
    ErrorCode.RESOURCE_UNAVAILABLE,
  ],
};

/**
 * Structured error response format
 */
export interface IStructuredErrorResponse {
  error: {
    code: string;
    message: string;
    userMessage: string;
    timestamp: string;
    requestId?: string;
    details?: Record<string, unknown>;
    context?: IErrorContext;
    recovery?: IErrorRecovery;
  };
}

/**
 * Error context information for debugging
 */
export interface IErrorContext {
  operation: string;
  input?: Record<string, unknown>;
  environment?: {
    nodeVersion: string;
    platform: string;
    timestamp: string;
  };
  stackTrace?: string[];
  relatedErrors?: Array<{
    code: string;
    message: string;
    timestamp: string;
  }>;
}

/**
 * Error recovery suggestions
 */
export interface IErrorRecovery {
  suggestions: string[];
  retryable: boolean;
  retryAfter?: number;
  alternativeActions?: string[];
  documentation?: string;
}

/**
 * Error context builder
 */
export class ErrorContextBuilder {
  private context: Partial<IErrorContext> = {};
  
  setOperation(operation: string): this {
    this.context.operation = operation;
    return this;
  }
  
  setInput(input: Record<string, unknown>): this {
    this.context.input = input;
    return this;
  }
  
  setEnvironment(): this {
    this.context.environment = {
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString(),
    };
    return this;
  }
  
  setStackTrace(error: Error): this {
    if (error.stack) {
      this.context.stackTrace = error.stack
        .split('\n')
        .filter(line => line.trim())
        .slice(0, 10); // Limit stack trace depth
    }
    return this;
  }
  
  addRelatedError(code: string, message: string): this {
    if (!this.context.relatedErrors) {
      this.context.relatedErrors = [];
    }
    this.context.relatedErrors.push({
      code,
      message,
      timestamp: new Date().toISOString(),
    });
    return this;
  }
  
  build(): IErrorContext {
    return {
      operation: this.context.operation || 'unknown',
      ...this.context,
    };
  }
}

/**
 * Generate recovery suggestions based on error type
 */
export function generateRecoverySuggestions(error: BaseError): ErrorRecovery {
  const recovery: ErrorRecovery = {
    suggestions: [],
    retryable: false,
    alternativeActions: [],
  };
  
  switch (error.code) {
    case ErrorCode.API_RATE_LIMIT:
      recovery.suggestions = [
        'Wait for the rate limit to reset',
        'Consider implementing request queuing',
        'Upgrade your API plan for higher limits',
      ];
      recovery.retryable = true;
      recovery.retryAfter = 60; // Default to 60 seconds
      break;
      
    case ErrorCode.API_TIMEOUT:
      recovery.suggestions = [
        'Check your internet connection',
        'Try again with a smaller request',
        'Increase the timeout configuration',
      ];
      recovery.retryable = true;
      break;
      
    case ErrorCode.API_UNAUTHORIZED:
      recovery.suggestions = [
        'Verify your API key is correct',
        'Check if your API key has expired',
        'Ensure the API key has the required permissions',
      ];
      recovery.retryable = false;
      recovery.documentation = 'https://serper.dev/docs/authentication';
      break;
      
    case ErrorCode.VALIDATION_ERROR:
      recovery.suggestions = [
        'Check the input parameters match the expected format',
        'Ensure all required fields are provided',
        'Verify data types are correct',
      ];
      recovery.retryable = false;
      break;
      
    case ErrorCode.MISSING_ENV_VAR:
      recovery.suggestions = [
        'Set the required environment variable',
        'Check the .env file configuration',
        'Verify environment variable names are correct',
      ];
      recovery.retryable = false;
      recovery.documentation = 'https://docs.example.com/configuration';
      break;
      
    default:
      recovery.suggestions = [
        'Try the operation again',
        'Check the logs for more details',
        'Contact support if the issue persists',
      ];
      recovery.retryable = true;
  }
  
  return recovery;
}

/**
 * Create a structured error response
 */
export function createStructuredError(
  error: unknown,
  context?: IErrorContext,
  requestId?: string
): IStructuredErrorResponse {
  const baseError = error instanceof BaseError 
    ? error 
    : new BaseError(
        error instanceof Error ? error.message : String(error),
        ErrorCode.UNKNOWN_ERROR
      );
  
  const recovery = generateRecoverySuggestions(baseError);
  
  return {
    error: {
      code: baseError.code,
      message: baseError.message,
      userMessage: baseError.getUserMessage(),
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
      ...(baseError.details && { details: baseError.details }),
      ...(context && { context }),
      recovery,
    },
  };
}

/**
 * Retry logic with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<IRetryConfig> = {}
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if error is retryable
      if (!isRetryableError(error, retryConfig.retryableErrors)) {
        throw error;
      }
      
      // Don't retry if we've exhausted attempts
      if (attempt === retryConfig.maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, attempt),
        retryConfig.maxDelay
      );
      
      // Log retry attempt
      logger.warn(`Retrying operation after ${delay}ms`, {
        attempt: attempt + 1,
        maxRetries: retryConfig.maxRetries,
        error: lastError.message,
      });
      
      // Call retry callback if provided
      if (retryConfig.onRetry) {
        retryConfig.onRetry(lastError, attempt + 1);
      }
      
      // Wait before retrying
      await sleep(delay);
    }
  }
  
  // All retries exhausted
  throw new BaseError(
    `Operation failed after ${retryConfig.maxRetries} retries: ${lastError?.message}`,
    ErrorCode.INTERNAL_ERROR,
    500,
    {
      lastError: lastError?.message,
      attempts: retryConfig.maxRetries + 1,
    }
  );
}

/**
 * Check if an error is retryable
 */
function isRetryableError(
  error: unknown,
  retryableErrors: ErrorCode[] = []
): boolean {
  if (error instanceof BaseError) {
    return retryableErrors.includes(error.code);
  }
  
  // Network errors are usually retryable
  if (error instanceof Error) {
    const networkErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];
    return networkErrors.some(code => error.message.includes(code));
  }
  
  return false;
}

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Enhanced error logger with context
 */
export function logError(
  error: unknown,
  context?: Partial<ErrorContext>,
  severity: 'error' | 'warn' | 'fatal' = 'error'
): void {
  const baseError = error instanceof BaseError 
    ? error 
    : new BaseError(
        error instanceof Error ? error.message : String(error),
        ErrorCode.UNKNOWN_ERROR
      );
  
  const errorContext = new ErrorContextBuilder()
    .setOperation(context?.operation || 'unknown')
    .setInput(context?.input || {})
    .setEnvironment()
    .setStackTrace(baseError)
    .build();
  
  const logData = {
    code: baseError.code,
    message: baseError.message,
    statusCode: baseError.statusCode,
    details: baseError.details,
    context: errorContext,
  };
  
  switch (severity) {
    case 'warn':
      logger.warn('Error occurred', logData);
      break;
    case 'fatal':
      logger.error('Fatal error occurred', logData);
      // In production, you might want to trigger alerts here
      break;
    default:
      logger.error('Error occurred', logData);
  }
}

/**
 * Circuit breaker pattern for API calls
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private readonly threshold = 5,
    _breakerTimeout = 60000, // 1 minute (unused but kept for compatibility)
    private readonly resetTimeout = 30000 // 30 seconds
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new APIError(
          'Circuit breaker is open - service temporarily unavailable',
          ErrorCode.RESOURCE_UNAVAILABLE
        );
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'open';
      logger.warn('Circuit breaker opened', {
        failures: this.failures,
        threshold: this.threshold,
      });
    }
  }
  
  getState(): string {
    return this.state;
  }
  
  reset(): void {
    this.failures = 0;
    this.state = 'closed';
    this.lastFailureTime = 0;
  }
}

/**
 * Error aggregator for batch operations
 */
export class ErrorAggregator {
  private errors: Array<{ error: Error; context?: unknown }> = [];
  
  add(error: Error, context?: unknown): void {
    this.errors.push({ error, context });
  }
  
  hasErrors(): boolean {
    return this.errors.length > 0;
  }
  
  getErrors(): Array<{ error: Error; context?: unknown }> {
    return [...this.errors];
  }
  
  clear(): void {
    this.errors = [];
  }
  
  /**
   * Throw an aggregated error if any errors exist
   */
  throwIfAny(message: string): void {
    if (this.hasErrors()) {
      throw new BaseError(
        message,
        ErrorCode.INTERNAL_ERROR,
        500,
        {
          errors: this.errors.map(({ error, context }) => ({
            message: error.message,
            type: error.name,
            context,
          })),
          count: this.errors.length,
        }
      );
    }
  }
}

/**
 * Timeout wrapper for async operations
 */
export function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new APIError(errorMessage, ErrorCode.API_TIMEOUT));
    }, timeoutMs);
  });
  
  return Promise.race([operation, timeoutPromise]);
}

/**
 * Error boundary for async operations
 */
export async function errorBoundary<T>(
  operation: () => Promise<T>,
  fallback?: T,
  onError?: (error: Error) => void
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    if (onError) {
      onError(err);
    } else {
      logError(err, { operation: 'errorBoundary' }, 'warn');
    }
    
    return fallback;
  }
}

/**
 * Create a request ID for tracking
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Export all error types for convenience
 */
export * from './errors.js';