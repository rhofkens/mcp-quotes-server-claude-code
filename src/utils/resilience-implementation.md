# Resilience Implementation Guide

## Overview

This implementation provides comprehensive resilience patterns for the MCP Quotes Server:

1. **Circuit Breaker Pattern** - Prevents cascading failures
2. **Retry Logic** - Handles transient failures with exponential backoff
3. **Response Caching** - Reduces API calls and provides fallback data
4. **Health Monitoring** - Tracks system health and component status

## Components

### 1. Cache Layer (`cache.ts`)

The cache provides:
- In-memory storage with TTL support
- LRU eviction when reaching capacity
- Stale data fallback for degraded service
- Performance statistics tracking

```typescript
// Usage example
import { quoteCache, QuoteCache } from './utils/cache.js';

// Store quotes
const cacheKey = QuoteCache.generateKey('Einstein', 'science', 5);
quoteCache.set(cacheKey, quotes, 600000); // 10 minutes TTL

// Retrieve with fallback
const { data, stale } = quoteCache.getWithFallback(cacheKey);
if (data) {
  // Use cached data (may be stale)
}
```

### 2. Circuit Breaker (`circuitBreaker.ts`)

The circuit breaker has three states:
- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Service failing, requests immediately rejected
- **HALF_OPEN**: Testing if service recovered

```typescript
import { createCircuitBreaker } from './utils/circuitBreaker.js';

const breaker = createCircuitBreaker('api-service', {
  failureThreshold: 5,      // Open after 5 failures
  successThreshold: 2,      // Close after 2 successes
  timeout: 60000,          // Try half-open after 1 minute
  fallbackFunction: () => getCachedData()
});

// Use circuit breaker
const result = await breaker.execute(() => apiCall());
```

### 3. Retry Logic (`retry.ts`)

Provides intelligent retry with:
- Exponential backoff with jitter
- Configurable retry conditions
- Circuit breaker integration
- Retry statistics

```typescript
import { retry } from './utils/retry.js';

const result = await retry(
  () => apiCall(),
  {
    maxAttempts: 3,
    initialDelay: 1000,
    backoffFactor: 2,
    jitter: true,
    circuitBreaker: breaker
  }
);
```

### 4. Health Monitoring (`healthCheck.ts`)

Monitors system health:
- Component-level health checks
- Aggregate system health status
- Periodic health monitoring
- Performance metrics

```typescript
import { healthCheckManager } from './utils/healthCheck.js';

// Register health checks
healthCheckManager.register('api', createSerperHealthCheck(apiKey));
healthCheckManager.register('cache', createCacheHealthCheck(() => cache.getStats()));

// Start monitoring
healthCheckManager.startPeriodicChecks();

// Get health status
const health = await healthCheckManager.runChecks();
```

## Integration Pattern

The `ResilientSerperClient` demonstrates full integration:

```typescript
class ResilientSerperClient extends SerperClient {
  constructor() {
    // Initialize cache
    this.cache = new QuoteCache();
    
    // Initialize circuit breaker with fallback
    this.circuitBreaker = createCircuitBreaker({
      fallbackFunction: () => this.getCachedFallback()
    });
    
    // Create retry wrapper with circuit breaker
    this.retryWrapper = createRetryWrapper({
      circuitBreaker: this.circuitBreaker
    });
  }
  
  async searchQuotes(params) {
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    
    try {
      // Execute with resilience patterns
      const results = await this.retryWrapper(
        () => super.searchQuotes(params)
      );
      
      // Cache successful results
      this.cache.set(cacheKey, results);
      return results;
      
    } catch (error) {
      // Fall back to stale cache
      const { data, stale } = this.cache.getWithFallback(cacheKey);
      if (data) return data;
      
      throw error;
    }
  }
}
```

## Failure Scenarios

### 1. API Timeout
- Retry mechanism attempts with exponential backoff
- Circuit breaker tracks failures
- Falls back to cached data if available

### 2. API Rate Limit (429)
- Marked as retryable error
- Exponential backoff reduces request rate
- Circuit opens after threshold to prevent further calls

### 3. Service Outage
- Circuit breaker opens after failure threshold
- All requests immediately return cached data
- Periodic health checks test recovery
- Circuit enters half-open to test recovery

### 4. Partial Degradation
- Some requests succeed, some fail
- Circuit remains closed but tracks failure rate
- Cache provides recent successful responses
- Health monitoring shows degraded status

## Configuration

### Environment Variables
```bash
SERPER_API_KEY=your-api-key
CACHE_MAX_SIZE=1000
CACHE_DEFAULT_TTL=600000
CIRCUIT_FAILURE_THRESHOLD=5
CIRCUIT_TIMEOUT=60000
RETRY_MAX_ATTEMPTS=3
HEALTH_CHECK_INTERVAL=60000
```

### Tuning Guidelines

1. **Cache TTL**: Balance freshness vs API load
   - Shorter for dynamic content (5-10 min)
   - Longer for stable content (30-60 min)

2. **Circuit Breaker Thresholds**:
   - Lower threshold (3-5) for critical services
   - Higher threshold (10-15) for less critical
   - Adjust timeout based on recovery time

3. **Retry Configuration**:
   - Max 3-5 attempts for user-facing requests
   - Exponential backoff 2x with jitter
   - Longer delays for rate-limited APIs

## Monitoring

### Key Metrics

1. **Cache Performance**:
   - Hit rate (target > 60%)
   - Eviction rate
   - Memory usage

2. **Circuit Breaker**:
   - State transitions
   - Failure/success counts
   - Time in each state

3. **API Performance**:
   - Response times
   - Error rates by type
   - Retry success rate

### Health Check Endpoints

```typescript
// Overall health
GET /health
{
  "status": "healthy|degraded|unhealthy",
  "components": [...],
  "uptime": 3600000
}

// Detailed metrics
GET /metrics
{
  "cache": { "hits": 450, "misses": 50, "hitRate": 0.9 },
  "circuitBreaker": { "state": "CLOSED", "failures": 0 },
  "api": { "avgResponseTime": 250, "errorRate": 0.02 }
}
```

## Testing

### Unit Tests
- Test each resilience component in isolation
- Mock failures for circuit breaker
- Verify cache eviction and TTL

### Integration Tests
- Test full failure scenarios
- Verify fallback mechanisms
- Measure recovery times

### Chaos Testing
- Randomly inject failures
- Verify system degrades gracefully
- Test recovery mechanisms

## Best Practices

1. **Always cache successful responses** - Even with short TTL
2. **Use stale cache as last resort** - Better than no data
3. **Monitor all components** - Early warning of issues
4. **Tune thresholds based on SLAs** - Balance availability vs freshness
5. **Log all resilience events** - For debugging and analysis
6. **Test failure scenarios regularly** - Ensure patterns work as expected

## Future Enhancements

1. **Distributed Cache** - Redis for multi-instance deployments
2. **Persistent Cache** - Survive restarts
3. **Adaptive Thresholds** - ML-based circuit breaker tuning
4. **Request Priority** - Different retry/cache policies by importance
5. **Multi-region Fallback** - Geographic redundancy