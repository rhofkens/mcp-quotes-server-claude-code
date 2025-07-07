/**
 * Retry Utility with Exponential Backoff
 *
 * Provides configurable retry logic with circuit breaker integration
 */

import type { CircuitBreaker } from './circuitBreaker.js'
import { CircuitState } from './circuitBreaker.js'
import { APIError, ErrorCode } from './errors.js'
import { logger } from './logger.js'

/**
 * Retry configuration options
 */
export interface RetryConfig {
  maxAttempts?: number
  initialDelay?: number // Initial delay in ms
  maxDelay?: number // Maximum delay in ms
  backoffFactor?: number // Exponential backoff factor
  jitter?: boolean // Add randomness to delays
  retryableErrors?: Array<string | number> // Specific errors to retry
  circuitBreaker?: CircuitBreaker // Optional circuit breaker integration
  onRetry?: (error: unknown, attempt: number) => void // Retry callback
}

/**
 * Retry statistics
 */
export interface RetryStats {
  attempts: number
  totalDelay: number
  lastError?: unknown
  succeeded: boolean
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  jitter: true,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'ENOTFOUND',
    'EHOSTUNREACH',
    'EPIPE',
    'ECONNABORTED',
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
  ],
  circuitBreaker: undefined as any,
  onRetry: () => {},
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown, retryableErrors: Array<string | number>): boolean {
  if (error instanceof APIError) {
    // Check API error codes
    if (error.code === ErrorCode.API_TIMEOUT || error.code === ErrorCode.API_RATE_LIMIT) {
      return true
    }

    // Check status code if available
    const status = error.details?.['status']
    if (status && typeof status === 'number' && retryableErrors.includes(status)) {
      return true
    }
  }

  // Check axios error codes
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as any).code
    if (retryableErrors.includes(code)) {
      return true
    }
  }

  // Check HTTP status codes
  if (error && typeof error === 'object' && 'response' in error) {
    const status = (error as any).response?.status
    if (status && retryableErrors.includes(status)) {
      return true
    }
  }

  return false
}

/**
 * Calculate delay with optional jitter
 */
function calculateDelay(attempt: number, config: Required<RetryConfig>): number {
  const exponentialDelay = Math.min(
    config.initialDelay * Math.pow(config.backoffFactor, attempt - 1),
    config.maxDelay
  )

  if (config.jitter) {
    // Add random jitter (±25%)
    const jitter = exponentialDelay * 0.25
    return exponentialDelay + (Math.random() * 2 - 1) * jitter
  }

  return exponentialDelay
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Execute a function with retry logic
 */
export async function retry<T>(fn: () => Promise<T>, config?: RetryConfig): Promise<T> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }
  const stats: RetryStats = {
    attempts: 0,
    totalDelay: 0,
    succeeded: false,
  }

  // If circuit breaker is provided and open, fail fast
  if (fullConfig.circuitBreaker && fullConfig.circuitBreaker.getState() === CircuitState.OPEN) {
    throw new APIError('Circuit breaker is open, failing fast', ErrorCode.API_ERROR, 'retry')
  }

  let lastError: unknown

  for (let attempt = 1; attempt <= fullConfig.maxAttempts; attempt++) {
    stats.attempts = attempt

    try {
      logger.debug('Retry attempt', { attempt, maxAttempts: fullConfig.maxAttempts })

      // Execute function (with circuit breaker if configured)
      const result = fullConfig.circuitBreaker
        ? await fullConfig.circuitBreaker.execute(fn)
        : await fn()

      stats.succeeded = true

      if (attempt > 1) {
        logger.info('Retry succeeded', {
          attempt,
          totalDelay: stats.totalDelay,
        })
      }

      return result
    } catch (error) {
      lastError = error
      stats.lastError = error

      // Check if error is retryable
      if (!isRetryableError(error, fullConfig.retryableErrors)) {
        logger.warn('Non-retryable error encountered', {
          error: error instanceof Error ? error.message : String(error),
          attempt,
        })
        throw error
      }

      // Check if we've exhausted retries
      if (attempt >= fullConfig.maxAttempts) {
        logger.error('All retry attempts exhausted', {
          attempts: attempt,
          totalDelay: stats.totalDelay,
          error: error instanceof Error ? error.message : String(error),
        })
        throw error
      }

      // Calculate delay
      const delay = calculateDelay(attempt, fullConfig)
      stats.totalDelay += delay

      // Call retry callback
      fullConfig.onRetry(error, attempt)

      logger.warn('Retryable error, waiting before retry', {
        attempt,
        nextAttempt: attempt + 1,
        delay,
        error: error instanceof Error ? error.message : String(error),
      })

      // Wait before retrying
      await sleep(delay)
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Retry failed with unknown error')
}

/**
 * Retry decorator for class methods
 */
export function Retryable(config?: RetryConfig) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      return retry(() => originalMethod.apply(this, args), config)
    }

    return descriptor
  }
}

/**
 * Create a retry wrapper with preset configuration
 */
export function createRetryWrapper(config: RetryConfig) {
  return <T>(fn: () => Promise<T>): Promise<T> => {
    return retry(fn, config)
  }
}

/**
 * Retry with linear backoff (for simpler cases)
 */
export async function retryLinear<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delay = 1000
): Promise<T> {
  return retry(fn, {
    maxAttempts,
    initialDelay: delay,
    backoffFactor: 1, // Linear backoff
    jitter: false,
  })
}

/**
 * Retry with immediate first attempt then exponential backoff
 */
export async function retryImmediate<T>(
  fn: () => Promise<T>,
  config?: Omit<RetryConfig, 'initialDelay'>
): Promise<T> {
  try {
    // Try immediately first
    return await fn()
  } catch (error) {
    // If it fails, use normal retry with exponential backoff
    return retry(fn, {
      ...config,
      maxAttempts: (config?.maxAttempts || 3) - 1, // Subtract the immediate attempt
    })
  }
}
