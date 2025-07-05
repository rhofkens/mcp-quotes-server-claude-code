/**
 * Cache Layer for Quote Responses
 * 
 * Provides in-memory caching with TTL support for API responses
 * to enable fallback mechanisms and reduce API calls
 */

import { Quote } from '../types/quotes.js';
import { logger } from './logger.js';

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
  expiresAt: number;
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
}

/**
 * Cache configuration options
 */
export interface CacheConfig {
  maxSize?: number;
  defaultTTL?: number; // in milliseconds
  enableStats?: boolean;
}

/**
 * Generic in-memory cache with TTL and LRU eviction
 */
export class Cache<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private readonly maxSize: number;
  private readonly defaultTTL: number;
  private stats: CacheStats;
  private readonly enableStats: boolean;
  
  constructor(config: CacheConfig = {}) {
    this.cache = new Map();
    this.maxSize = config.maxSize || 1000;
    this.defaultTTL = config.defaultTTL || 5 * 60 * 1000; // 5 minutes default
    this.enableStats = config.enableStats !== false;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
    };
  }
  
  /**
   * Get an item from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      if (this.enableStats) this.stats.misses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      if (this.enableStats) {
        this.stats.misses++;
        this.stats.size--;
      }
      return null;
    }
    
    // Update hit count and stats
    entry.hits++;
    if (this.enableStats) this.stats.hits++;
    
    return entry.data;
  }
  
  /**
   * Set an item in cache with optional TTL
   */
  set(key: string, data: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    
    // Evict least recently used if at max size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0,
      expiresAt,
    });
    
    if (this.enableStats) {
      this.stats.size = this.cache.size;
    }
  }
  
  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      if (this.enableStats) this.stats.size--;
      return false;
    }
    
    return true;
  }
  
  /**
   * Delete an item from cache
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result && this.enableStats) {
      this.stats.size--;
    }
    return result;
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    if (this.enableStats) {
      this.stats.size = 0;
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats(): Readonly<CacheStats> {
    return { ...this.stats };
  }
  
  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: this.cache.size,
    };
  }
  
  /**
   * Get all keys in cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
  
  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      if (this.enableStats) {
        this.stats.evictions++;
        this.stats.size--;
      }
      logger.debug('Cache eviction', { key: oldestKey });
    }
  }
  
  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
      if (this.enableStats) {
        this.stats.size--;
      }
    }
    
    if (keysToDelete.length > 0) {
      logger.debug('Cache cleanup', { removed: keysToDelete.length });
    }
  }
}

/**
 * Specialized cache for quote responses
 */
export class QuoteCache extends Cache<Quote[]> {
  constructor() {
    super({
      maxSize: 500,
      defaultTTL: 10 * 60 * 1000, // 10 minutes for quotes
      enableStats: true,
    });
    
    // Set up periodic cleanup
    setInterval(() => this.cleanup(), 60 * 1000); // Every minute
  }
  
  /**
   * Generate cache key for quote requests
   */
  static generateKey(person: string, topic?: string, numberOfQuotes?: number): string {
    const parts = ['quotes', person.toLowerCase()];
    if (topic) parts.push(topic.toLowerCase());
    if (numberOfQuotes) parts.push(`n${numberOfQuotes}`);
    return parts.join(':');
  }
  
  /**
   * Get quotes from cache with fallback to stale data
   */
  getWithFallback(key: string): { data: Quote[] | null; stale: boolean } {
    const fresh = this.get(key);
    if (fresh) {
      return { data: fresh, stale: false };
    }
    
    // Check for stale data (expired but still in memory)
    const entry = (this as any).cache.get(key);
    if (entry) {
      logger.warn('Returning stale cache data', { key, expiredAt: new Date(entry.expiresAt) });
      return { data: entry.data, stale: true };
    }
    
    return { data: null, stale: false };
  }
  
  /**
   * Warm up cache with common searches
   */
  async warmup(commonSearches: Array<{ person: string; topic?: string }>): Promise<void> {
    logger.info('Warming up quote cache', { searches: commonSearches.length });
    
    // This would be called during startup to pre-populate cache
    // Implementation would depend on having access to the search function
  }
}

// Export singleton instance
export const quoteCache = new QuoteCache();

// Export default cache for general use
export const defaultCache = new Cache({
  maxSize: 1000,
  defaultTTL: 5 * 60 * 1000,
});