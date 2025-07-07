/**
 * MCP Quotes Server - Utilities Index
 *
 * Exports all utility functions and classes.
 * Utilities provide common functionality across the application.
 */

// Configuration
export { getConfig } from './config.js'
export { validateEnvVar } from './validation.js'

// Error handling
export * from './errors.js'

// Logging
export { logger } from './logger.js'

// Validation
export { validate, QuoteSchemas } from './validation.js'

// Resilience patterns
export { Cache, QuoteCache, quoteCache, defaultCache } from './cache.js'
export type { ICacheConfig, ICacheStats } from './cache.js'

export { CircuitBreaker, CircuitState, createCircuitBreaker } from './circuitBreaker.js'
export type { ICircuitBreakerConfig, ICircuitBreakerStats } from './circuitBreaker.js'

export { retry, retryLinear, retryImmediate, createRetryWrapper, Retryable } from './retry.js'
export type { RetryConfig, RetryStats } from './retry.js'

export {
  HealthCheckManager,
  healthCheckManager,
  HealthStatus,
  createSerperHealthCheck,
  createCacheHealthCheck,
  createCircuitBreakerHealthCheck,
} from './healthCheck.js'
export type { IComponentHealth, ISystemHealth, IHealthCheckConfig } from './healthCheck.js'
