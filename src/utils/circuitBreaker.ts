/**
 * Circuit Breaker Pattern Implementation
 * 
 * Provides fault tolerance for external API calls by preventing
 * cascading failures and allowing systems to recover
 */

import { logger } from './logger.js';
import { APIError, ErrorCode } from './errors.js';

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject all requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold?: number;      // Number of failures before opening
  successThreshold?: number;      // Number of successes to close from half-open
  timeout?: number;              // Time before trying half-open (ms)
  monitoringPeriod?: number;     // Time window for failure counting (ms)
  fallbackFunction?: () => any;  // Fallback when circuit is open
  healthCheckFunction?: () => Promise<boolean>; // Optional health check
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  totalRequests: number;
  rejectedRequests: number;
  fallbacksExecuted: number;
}

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker<T = any> {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | undefined;
  private lastSuccessTime: number | undefined;
  private nextAttempt: number | undefined;
  private readonly config: Required<CircuitBreakerConfig>;
  private stats = {
    totalRequests: 0,
    rejectedRequests: 0,
    fallbacksExecuted: 0,
  };
  
  constructor(config: CircuitBreakerConfig = {}) {
    this.config = {
      failureThreshold: config.failureThreshold || 5,
      successThreshold: config.successThreshold || 2,
      timeout: config.timeout || 60000, // 1 minute
      monitoringPeriod: config.monitoringPeriod || 60000, // 1 minute
      fallbackFunction: config.fallbackFunction || (() => {
        throw new APIError(
          'Circuit breaker is open and no fallback provided',
          ErrorCode.API_ERROR,
          'circuit-breaker'
        );
      }),
      healthCheckFunction: config.healthCheckFunction || (async () => true),
    };
  }
  
  /**
   * Execute a function with circuit breaker protection
   */
  async execute<R = T>(fn: () => Promise<R>): Promise<R> {
    this.stats.totalRequests++;
    
    // Check if we should reset failure count based on monitoring period
    if (this.lastFailureTime && 
        Date.now() - this.lastFailureTime > this.config.monitoringPeriod) {
      this.failureCount = 0;
    }
    
    switch (this.state) {
      case CircuitState.OPEN:
        return this.handleOpenState();
        
      case CircuitState.HALF_OPEN:
        return this.handleHalfOpenState(fn);
        
      case CircuitState.CLOSED:
      default:
        return this.handleClosedState(fn);
    }
  }
  
  /**
   * Handle request when circuit is open
   */
  private async handleOpenState<R>(): Promise<R> {
    const now = Date.now();
    
    // Check if timeout has passed
    if (this.nextAttempt && now >= this.nextAttempt) {
      logger.info('Circuit breaker attempting half-open state');
      this.state = CircuitState.HALF_OPEN;
      
      // Try health check if configured
      try {
        const isHealthy = await this.config.healthCheckFunction();
        if (isHealthy) {
          this.successCount = 0;
          logger.info('Health check passed, circuit breaker now half-open');
        } else {
          this.open();
          throw new Error('Health check failed');
        }
      } catch (error) {
        this.open();
        logger.error('Health check failed', error);
      }
    }
    
    // Circuit is still open, use fallback
    this.stats.rejectedRequests++;
    this.stats.fallbacksExecuted++;
    logger.warn('Circuit breaker open, using fallback');
    
    return this.config.fallbackFunction() as R;
  }
  
  /**
   * Handle request when circuit is half-open
   */
  private async handleHalfOpenState<R>(fn: () => Promise<R>): Promise<R> {
    try {
      const result = await fn();
      this.onSuccess();
      
      // Check if we should close the circuit
      if (this.successCount >= this.config.successThreshold) {
        this.close();
      }
      
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }
  
  /**
   * Handle request when circuit is closed
   */
  private async handleClosedState<R>(fn: () => Promise<R>): Promise<R> {
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      
      // Check if we should open the circuit
      if (this.failureCount >= this.config.failureThreshold) {
        this.open();
      }
      
      throw error;
    }
  }
  
  /**
   * Record successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;
    this.successCount++;
    this.lastSuccessTime = Date.now();
    logger.debug('Circuit breaker success recorded', {
      state: this.state,
      successCount: this.successCount,
    });
  }
  
  /**
   * Record failed execution
   */
  private onFailure(error: unknown): void {
    this.failureCount++;
    this.successCount = 0;
    this.lastFailureTime = Date.now();
    logger.warn('Circuit breaker failure recorded', {
      state: this.state,
      failureCount: this.failureCount,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  
  /**
   * Open the circuit
   */
  private open(): void {
    this.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.config.timeout;
    logger.error('Circuit breaker opened', {
      failures: this.failureCount,
      nextAttempt: new Date(this.nextAttempt),
    });
  }
  
  /**
   * Close the circuit
   */
  private close(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = undefined;
    logger.info('Circuit breaker closed');
  }
  
  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }
  
  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failureCount,
      successes: this.successCount,
      lastFailureTime: this.lastFailureTime || 0,
      lastSuccessTime: this.lastSuccessTime || 0,
      totalRequests: this.stats.totalRequests,
      rejectedRequests: this.stats.rejectedRequests,
      fallbacksExecuted: this.stats.fallbacksExecuted,
    };
  }
  
  /**
   * Reset circuit breaker to initial state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.nextAttempt = undefined;
    this.stats = {
      totalRequests: 0,
      rejectedRequests: 0,
      fallbacksExecuted: 0,
    };
    logger.info('Circuit breaker reset');
  }
  
  /**
   * Force circuit to open state (for testing/maintenance)
   */
  forceOpen(): void {
    this.open();
  }
  
  /**
   * Force circuit to closed state (for testing/recovery)
   */
  forceClose(): void {
    this.close();
  }
}

/**
 * Factory function to create configured circuit breakers
 */
export function createCircuitBreaker<T = any>(
  name: string,
  config?: CircuitBreakerConfig
): CircuitBreaker<T> {
  logger.info('Creating circuit breaker', { name, config });
  return new CircuitBreaker<T>(config);
}