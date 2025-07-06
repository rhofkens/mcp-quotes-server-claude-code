/**
 * Health Check and Status Monitoring
 * 
 * Provides health checking capabilities for external services
 * and internal system components
 */

import axios from 'axios';

import type { ICacheStats } from './cache.js';
import { CircuitState } from './circuitBreaker.js';
import type { ICircuitBreakerStats } from './circuitBreaker.js';
import { logger } from './logger.js';

/**
 * Health status levels
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
}

/**
 * Individual component health check result
 */
export interface IComponentHealth {
  name: string;
  status: HealthStatus;
  message?: string;
  details?: Record<string, unknown>;
  lastChecked: Date;
  responseTime?: number;
}

/**
 * Overall system health
 */
export interface ISystemHealth {
  status: HealthStatus;
  timestamp: Date;
  components: IComponentHealth[];
  version?: string;
  uptime?: number;
}

/**
 * Health check configuration
 */
export interface IHealthCheckConfig {
  interval?: number;          // Check interval in ms
  timeout?: number;           // Health check timeout in ms
  includeDetails?: boolean;   // Include detailed stats
}

/**
 * Health check manager
 */
export class HealthCheckManager {
  private checks: Map<string, () => Promise<IComponentHealth>>;
  private lastResults: Map<string, IComponentHealth>;
  private checkInterval?: NodeJS.Timeout;
  private startTime: number;
  private config: Required<IHealthCheckConfig>;
  
  constructor(config: IHealthCheckConfig = {}) {
    this.checks = new Map();
    this.lastResults = new Map();
    this.startTime = Date.now();
    this.config = {
      interval: config.interval || 60000, // 1 minute default
      timeout: config.timeout || 10000,   // 10 seconds default
      includeDetails: config.includeDetails !== false,
    };
  }
  
  /**
   * Register a health check
   */
  register(name: string, check: () => Promise<IComponentHealth>): void {
    this.checks.set(name, check);
    logger.info('Health check registered', { name });
  }
  
  /**
   * Unregister a health check
   */
  unregister(name: string): boolean {
    const result = this.checks.delete(name);
    this.lastResults.delete(name);
    return result;
  }
  
  /**
   * Run all health checks
   */
  async runChecks(): Promise<ISystemHealth> {
    const results: IComponentHealth[] = [];
    
    // Run all checks in parallel with timeout
    const checkPromises = Array.from(this.checks.entries()).map(
      async ([name, check]) => {
        const startTime = Date.now();
        
        try {
          const result = await Promise.race([
            check(),
            this.timeout(name),
          ]);
          
          result.responseTime = Date.now() - startTime;
          this.lastResults.set(name, result);
          return result;
        } catch (error) {
          const errorResult: IComponentHealth = {
            name,
            status: HealthStatus.UNHEALTHY,
            message: error instanceof Error ? error.message : 'Health check failed',
            lastChecked: new Date(),
            responseTime: Date.now() - startTime,
          };
          
          this.lastResults.set(name, errorResult);
          return errorResult;
        }
      }
    );
    
    results.push(...await Promise.all(checkPromises));
    
    // Determine overall status
    const hasUnhealthy = results.some(r => r.status === HealthStatus.UNHEALTHY);
    const hasDegraded = results.some(r => r.status === HealthStatus.DEGRADED);
    
    let overallStatus: HealthStatus;
    if (hasUnhealthy) {
      overallStatus = HealthStatus.UNHEALTHY;
    } else if (hasDegraded) {
      overallStatus = HealthStatus.DEGRADED;
    } else {
      overallStatus = HealthStatus.HEALTHY;
    }
    
    return {
      status: overallStatus,
      timestamp: new Date(),
      components: results,
      uptime: Date.now() - this.startTime,
      version: process.env['npm_package_version'] || 'unknown',
    };
  }
  
  /**
   * Get last health check results
   */
  getLastResults(): ISystemHealth {
    const components = Array.from(this.lastResults.values());
    
    const hasUnhealthy = components.some(c => c.status === HealthStatus.UNHEALTHY);
    const hasDegraded = components.some(c => c.status === HealthStatus.DEGRADED);
    
    return {
      status: hasUnhealthy ? HealthStatus.UNHEALTHY : 
              hasDegraded ? HealthStatus.DEGRADED : 
              HealthStatus.HEALTHY,
      timestamp: new Date(),
      components,
      uptime: Date.now() - this.startTime,
      version: process.env['npm_package_version'] || 'unknown',
    };
  }
  
  /**
   * Start periodic health checks
   */
  startPeriodicChecks(): void {
    if (this.checkInterval) {
      return; // Already running
    }
    
    // Run initial check
    this.runChecks().catch(error => {
      logger.error('Initial health check failed', error);
    });
    
    // Schedule periodic checks
    this.checkInterval = setInterval(() => {
      this.runChecks().catch(error => {
        logger.error('Periodic health check failed', error);
      });
    }, this.config.interval);
    
    logger.info('Periodic health checks started', { 
      interval: this.config.interval 
    });
  }
  
  /**
   * Stop periodic health checks
   */
  stopPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
      logger.info('Periodic health checks stopped');
    }
  }
  
  /**
   * Timeout helper for health checks
   */
  private timeout(name: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Health check '${name}' timed out after ${this.config.timeout}ms`));
      }, this.config.timeout);
    });
  }
}

/**
 * Built-in health checks
 */

/**
 * Create Serper API health check
 */
export function createSerperHealthCheck(
  apiKey: string,
  baseUrl = 'https://google.serper.dev'
): () => Promise<IComponentHealth> {
  return async () => {
    const startTime = Date.now();
    
    try {
      // Simple search to test API
      const response = await axios.post(
        `${baseUrl}/search`,
        { q: 'test', num: 1 },
        {
          headers: { 'X-API-KEY': apiKey },
          timeout: 5000,
        }
      );
      
      const responseTime = Date.now() - startTime;
      
      if (response.status === 200 && !('error' in response.data)) {
        return {
          name: 'serper-api',
          status: HealthStatus.HEALTHY,
          message: 'Serper API is responding normally',
          details: { responseTime },
          lastChecked: new Date(),
          responseTime,
        };
      } else {
        return {
          name: 'serper-api',
          status: HealthStatus.DEGRADED,
          message: 'Serper API returned unexpected response',
          details: { 
            status: response.status,
            error: ('error' in response.data) ? response.data.error as unknown : undefined,
          },
          lastChecked: new Date(),
          responseTime,
        };
      }
    } catch (error) {
      return {
        name: 'serper-api',
        status: HealthStatus.UNHEALTHY,
        message: error instanceof Error ? error.message : 'Serper API health check failed',
        lastChecked: new Date(),
        responseTime: Date.now() - startTime,
      };
    }
  };
}

/**
 * Create cache health check
 */
export function createCacheHealthCheck(
  getStats: () => ICacheStats
): () => Promise<IComponentHealth> {
  return () => {
    const stats = getStats();
    const hitRate = stats.hits + stats.misses > 0
      ? stats.hits / (stats.hits + stats.misses)
      : 0;
    
    let status: HealthStatus;
    let message: string;
    
    if (hitRate < 0.1 && stats.hits + stats.misses > 100) {
      status = HealthStatus.DEGRADED;
      message = 'Cache hit rate is very low';
    } else if (stats.size > 900 && stats.evictions > 100) {
      status = HealthStatus.DEGRADED;
      message = 'Cache is near capacity with high eviction rate';
    } else {
      status = HealthStatus.HEALTHY;
      message = 'Cache is operating normally';
    }
    
    return Promise.resolve({
      name: 'cache',
      status,
      message,
      details: {
        ...stats,
        hitRate: Math.round(hitRate * 100) / 100,
      },
      lastChecked: new Date(),
    });
  };
}

/**
 * Create circuit breaker health check
 */
export function createCircuitBreakerHealthCheck(
  name: string,
  getStats: () => CircuitBreakerStats
): () => Promise<IComponentHealth> {
  return () => {
    const stats = getStats();
    let status: HealthStatus;
    let message: string;
    
    switch (stats.state) {
      case CircuitState.OPEN:
        status = HealthStatus.UNHEALTHY;
        message = 'Circuit breaker is open';
        break;
        
      case CircuitState.HALF_OPEN:
        status = HealthStatus.DEGRADED;
        message = 'Circuit breaker is half-open (testing recovery)';
        break;
        
      case CircuitState.CLOSED:
        if (stats.failures > 0) {
          status = HealthStatus.DEGRADED;
          message = `Circuit breaker has ${stats.failures} recent failures`;
        } else {
          status = HealthStatus.HEALTHY;
          message = 'Circuit breaker is functioning normally';
        }
        break;
        
      default:
        status = HealthStatus.HEALTHY;
        message = 'Circuit breaker is functioning normally';
    }
    
    return Promise.resolve({
      name: `circuit-breaker-${name}`,
      status,
      message,
      details: stats,
      lastChecked: new Date(),
    });
  };
}

// Export singleton health check manager
export const healthCheckManager = new HealthCheckManager();