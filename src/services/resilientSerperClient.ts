/**
 * Resilient Serper API Client
 * 
 * Enhanced version of SerperClient with resilience patterns:
 * - Circuit breaker for fault tolerance
 * - Retry logic with exponential backoff
 * - Response caching with fallback
 * - Health monitoring
 */

import { SerperClient, SerperConfig, SerperSearchParams } from './serperClient.js';
import { SerperSearchResult } from '../types/quotes.js';
import { CircuitBreaker, createCircuitBreaker } from '../utils/circuitBreaker.js';
import { createRetryWrapper } from '../utils/retry.js';
import { QuoteCache, quoteCache } from '../utils/cache.js';
import { 
  healthCheckManager, 
  createSerperHealthCheck,
  createCircuitBreakerHealthCheck,
  createCacheHealthCheck,
} from '../utils/healthCheck.js';
import { logger } from '../utils/logger.js';
import { APIError, ErrorCode } from '../utils/errors.js';

/**
 * Resilient client configuration
 */
export interface ResilientSerperConfig extends SerperConfig {
  enableCache?: boolean;
  enableCircuitBreaker?: boolean;
  enableRetry?: boolean;
  cacheTTL?: number;
  maxRetries?: number;
}

/**
 * Resilient Serper API Client
 */
export class ResilientSerperClient extends SerperClient {
  private apiCircuitBreaker: CircuitBreaker<SerperSearchResult[]>;
  private cache: QuoteCache;
  private retryWrapper: <T>(fn: () => Promise<T>) => Promise<T>;
  private resilientConfig: ResilientSerperConfig;
  
  constructor(config?: ResilientSerperConfig) {
    super(config);
    
    this.resilientConfig = {
      enableCache: true,
      enableCircuitBreaker: true,
      enableRetry: true,
      cacheTTL: 10 * 60 * 1000, // 10 minutes
      maxRetries: 3,
      apiKey: config?.apiKey || '',
      baseUrl: config?.baseUrl || 'https://google.serper.dev',
      timeout: config?.timeout || 30000,
    };
    
    // Initialize cache
    this.cache = quoteCache;
    
    // Initialize circuit breaker
    this.apiCircuitBreaker = createCircuitBreaker<SerperSearchResult[]>('serper-api', {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000, // 1 minute
      monitoringPeriod: 5 * 60 * 1000, // 5 minutes
      fallbackFunction: () => this.getCachedFallback(),
      healthCheckFunction: async () => {
        try {
          // Quick health check search
          await super.searchQuotes({ query: 'test', num: 1 });
          return true;
        } catch {
          return false;
        }
      },
    });
    
    // Initialize retry wrapper
    this.retryWrapper = createRetryWrapper({
      maxAttempts: this.resilientConfig.maxRetries || 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      jitter: true,
      ...(this.resilientConfig.enableCircuitBreaker && { circuitBreaker: this.apiCircuitBreaker }),
      onRetry: (error, attempt) => {
        logger.warn('Retrying Serper API call', {
          attempt,
          error: error instanceof Error ? error.message : String(error),
        });
      },
    });
    
    // Register health checks
    this.registerHealthChecks();
  }
  
  /**
   * Enhanced search with resilience patterns
   */
  override async searchQuotes(params: SerperSearchParams): Promise<SerperSearchResult[]> {
    const cacheKey = this.generateCacheKey(params);
    
    // Try cache first if enabled
    if (this.resilientConfig.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        logger.debug('Cache hit for search', { query: params.query });
        // Transform cached quotes back to search results
        return this.quotesToSearchResults(cached);
      }
    }
    
    try {
      // Execute search with resilience patterns
      const searchFunction = () => super.searchQuotes(params);
      
      let results: SerperSearchResult[];
      
      if (this.resilientConfig.enableRetry) {
        results = await this.retryWrapper(searchFunction);
      } else if (this.resilientConfig.enableCircuitBreaker) {
        results = await this.apiCircuitBreaker.execute(searchFunction);
      } else {
        results = await searchFunction();
      }
      
      // Cache successful results
      if (this.resilientConfig.enableCache && results.length > 0) {
        const quotes = this.searchResultsToQuotes(results, params.query);
        this.cache.set(cacheKey, quotes, this.resilientConfig.cacheTTL);
        logger.debug('Cached search results', { 
          query: params.query, 
          count: results.length 
        });
      }
      
      return results;
    } catch (error) {
      logger.error('Search failed, attempting fallback', {
        query: params.query,
        error: error instanceof Error ? error.message : String(error),
      });
      
      // Try stale cache as last resort
      if (this.resilientConfig.enableCache) {
        const { data, stale } = this.cache.getWithFallback(cacheKey);
        if (data) {
          logger.warn('Using stale cache data', { 
            query: params.query, 
            stale 
          });
          return this.quotesToSearchResults(data);
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Build enhanced quote search with caching awareness
   */
  override buildQuoteSearchQuery(person: string, topic?: string): string {
    // Use parent implementation
    const query = super.buildQuoteSearchQuery(person, topic);
    
    // Pre-warm cache for common variations if this is a new search
    if (this.resilientConfig.enableCache) {
      this.prewarmCache(person, topic);
    }
    
    return query;
  }
  
  /**
   * Get system health status
   */
  async getHealthStatus() {
    return {
      circuitBreaker: this.apiCircuitBreaker.getStats(),
      cache: this.cache.getStats(),
      config: {
        cacheEnabled: this.resilientConfig.enableCache,
        circuitBreakerEnabled: this.resilientConfig.enableCircuitBreaker,
        retryEnabled: this.resilientConfig.enableRetry,
      },
    };
  }
  
  /**
   * Reset all resilience components
   */
  reset(): void {
    this.apiCircuitBreaker.reset();
    this.cache.clear();
    this.cache.resetStats();
    logger.info('Resilient client reset');
  }
  
  /**
   * Generate cache key for search params
   */
  private generateCacheKey(params: SerperSearchParams): string {
    return `serper:${params.query}:${params.num || 10}`;
  }
  
  /**
   * Convert search results to quotes for caching
   */
  private searchResultsToQuotes(
    results: SerperSearchResult[], 
    query: string
  ): import('../types/quotes.js').Quote[] {
    const quotes: import('../types/quotes.js').Quote[] = [];
    
    for (const result of results) {
      const quoteText = this.extractQuoteFromSnippet(result.snippet);
      if (quoteText) {
        // Extract person name from query
        const personMatch = query.match(/"([^"]+)"/);
        const person = personMatch?.[1] || 'Unknown';
        
        quotes.push({
          text: quoteText,
          author: person,
          ...(result.link && { source: result.link }),
        });
      }
    }
    
    return quotes;
  }
  
  /**
   * Convert cached quotes back to search results
   */
  private quotesToSearchResults(
    quotes: import('../types/quotes.js').Quote[]
  ): SerperSearchResult[] {
    return quotes.map(quote => ({
      title: `${quote.author} Quote`,
      link: quote.source || '',
      snippet: `"${quote.text}"`,
      position: 0,
    }));
  }
  
  /**
   * Get cached fallback data
   */
  private getCachedFallback(): SerperSearchResult[] {
    logger.warn('Circuit breaker open, searching cache for any fallback data');
    
    // Try to find any cached data that might be relevant
    const cacheKeys = this.cache.keys();
    
    if (cacheKeys.length > 0) {
      // Return the most recently accessed cache entry
      for (const key of cacheKeys) {
        const { data } = this.cache.getWithFallback(key);
        if (data && data.length > 0) {
          logger.info('Found fallback cache data', { key });
          return this.quotesToSearchResults(data);
        }
      }
    }
    
    // No cache available, return empty array
    logger.error('No fallback cache data available');
    throw new APIError(
      'Service unavailable and no cached data available',
      ErrorCode.API_ERROR,
      'serper',
      { circuitBreakerOpen: true }
    );
  }
  
  /**
   * Pre-warm cache with related searches
   */
  private async prewarmCache(person: string, topic?: string): Promise<void> {
    // This is a background operation, don't await
    setImmediate(async () => {
      try {
        // If searching with a topic, also cache without topic
        if (topic) {
          const genericKey = `serper:"${person}" quotes:10`;
          if (!this.cache.has(genericKey)) {
            logger.debug('Pre-warming cache for generic search', { person });
            // Don't use resilient search here to avoid recursion
            const results = await super.searchQuotes({
              query: `"${person}" quotes`,
              num: 10,
            });
            
            if (results.length > 0) {
              const quotes = this.searchResultsToQuotes(results, `"${person}" quotes`);
              this.cache.set(genericKey, quotes);
            }
          }
        }
      } catch (error) {
        // Pre-warming is best effort, don't propagate errors
        logger.debug('Cache pre-warming failed', { 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    });
  }
  
  /**
   * Register health checks
   */
  private registerHealthChecks(): void {
    // Circuit breaker health check
    if (this.resilientConfig.enableCircuitBreaker) {
      healthCheckManager.register(
        'serper-circuit-breaker',
        createCircuitBreakerHealthCheck(
          'serper-api',
          () => this.apiCircuitBreaker.getStats()
        )
      );
    }
    
    // Cache health check
    if (this.resilientConfig.enableCache) {
      healthCheckManager.register(
        'quote-cache',
        createCacheHealthCheck(() => this.cache.getStats())
      );
    }
    
    // API health check
    if (this.resilientConfig.apiKey) {
      healthCheckManager.register(
        'serper-api',
        createSerperHealthCheck(
          this.resilientConfig.apiKey,
          this.resilientConfig.baseUrl
        )
      );
    }
  }
}

// Export singleton instance with default configuration
export const resilientSerperClient = new ResilientSerperClient();