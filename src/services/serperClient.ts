/**
 * Serper API Client
 * 
 * Service for searching quotes using the Serper.dev search API
 */

import axios, { AxiosError } from 'axios';

import type { ISerperApiResponse, ISerperSearchResult } from '../types/quotes.js';
import { 
  APIError, 
  ErrorCode,
  withRetry,
  CircuitBreaker,
  withTimeout,
  logError,
  ErrorContextBuilder,
  generateRequestId
} from '../utils/errorHandling.js';
import { logger } from '../utils/logger.js';
import { validateEnvVar } from '../utils/validation.js';

/**
 * Serper API configuration
 */
export interface ISerperConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

/**
 * Serper search parameters
 */
export interface ISerperSearchParams {
  query: string;
  num?: number;
}

/**
 * Client for interacting with Serper.dev API
 */
export class SerperClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly circuitBreaker: CircuitBreaker;
  
  constructor(config?: Partial<ISerperConfig>) {
    // Get API key from environment or config
    this.apiKey = config?.apiKey || validateEnvVar('SERPER_API_KEY', process.env['SERPER_API_KEY']);
    this.baseUrl = config?.baseUrl || 'https://google.serper.dev';
    this.timeout = config?.timeout || 10000; // 10 seconds default
    
    // Initialize circuit breaker for API protection
    this.circuitBreaker = new CircuitBreaker(
      5,     // Open after 5 failures
      60000, // Stay open for 1 minute
      30000  // Try half-open after 30 seconds
    );
  }
  
  /**
   * Search for quotes using Serper API with enhanced error handling
   */
  async searchQuotes(params: ISerperSearchParams): Promise<ISerperSearchResult[]> {
    const requestId = generateRequestId();
    const context = new ErrorContextBuilder()
      .setOperation('searchQuotes')
      .setInput({ query: params.query, num: params.num })
      .setEnvironment()
      .build();
    
    logger.info('Starting quote search', { requestId, params });
    
    try {
      // Execute with circuit breaker protection
      return await this.circuitBreaker.execute(async () => {
        // Wrap with retry logic for transient failures
        return await withRetry(
          async () => {
            // Add timeout protection
            const response = await withTimeout(
              axios.post<ISerperApiResponse>(
                `${this.baseUrl}/search`,
                {
                  q: params.query,
                  num: params.num || 10,
                },
                {
                  headers: {
                    'X-API-KEY': this.apiKey,
                    'Content-Type': 'application/json',
                    'X-Request-ID': requestId,
                  },
                  timeout: this.timeout,
                }
              ),
              this.timeout,
              'Serper API request timed out'
            );
            
            // Check for API errors in response
            if (response.data.error) {
              throw new APIError(
                `Serper API error: ${response.data.error}`,
                ErrorCode.API_ERROR,
                'serper',
                { 
                  error: response.data.error,
                  requestId 
                }
              );
            }
            
            // Log successful response
            logger.info('Quote search completed', {
              requestId,
              resultsCount: response.data.organic?.length || 0,
            });
            
            // Return organic results or empty array
            return response.data.organic || [];
          },
          {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            retryableErrors: [
              ErrorCode.API_TIMEOUT,
              ErrorCode.API_RATE_LIMIT,
            ],
            onRetry: (error, attempt) => {
              logger.warn('Retrying Serper API request', {
                requestId,
                attempt,
                error: error.message,
              });
            },
          }
        );
      });
    } catch (error) {
      // Log the error with context
      logError(error, context);
      
      if (error instanceof APIError) {
        throw error;
      }
      
      if (error instanceof AxiosError) {
        // Handle specific Axios errors with enhanced context
        if (error.code === 'ECONNABORTED') {
          throw new APIError(
            'Serper API request timed out',
            ErrorCode.API_TIMEOUT,
            'serper',
            { 
              timeout: this.timeout,
              requestId,
              query: params.query 
            }
          );
        }
        
        if (error.response) {
          const status = error.response.status;
          const retryAfter = error.response.headers['retry-after'];
          
          if (status === 401) {
            throw new APIError(
              'Invalid Serper API key',
              ErrorCode.API_UNAUTHORIZED,
              'serper',
              { requestId }
            );
          }
          
          if (status === 429) {
            throw new APIError(
              'Serper API rate limit exceeded',
              ErrorCode.API_RATE_LIMIT,
              'serper',
              {
                retryAfter: retryAfter ? parseInt(retryAfter) : 60,
                requestId,
              }
            );
          }
          
          throw new APIError(
            `Serper API error: ${error.response.statusText}`,
            ErrorCode.API_ERROR,
            'serper',
            {
              status,
              statusText: error.response.statusText,
              data: error.response.data,
              requestId,
            }
          );
        }
        
        // Network errors
        throw new APIError(
          `Network error connecting to Serper API: ${error.message}`,
          ErrorCode.API_ERROR,
          'serper',
          { 
            originalError: error.message,
            requestId,
            code: error.code 
          }
        );
      }
      
      // Unknown errors
      throw new APIError(
        'Unexpected error while searching quotes',
        ErrorCode.API_ERROR,
        'serper',
        { 
          originalError: String(error),
          requestId 
        }
      );
    }
  }
  
  /**
   * Build a search query for finding quotes
   */
  buildQuoteSearchQuery(person: string, topic?: string): string {
    // Build a targeted search query for quotes
    const baseQuery = `"${person}" quotes`;
    
    if (topic) {
      // Add topic filter to the query
      return `${baseQuery} about "${topic}"`;
    }
    
    return baseQuery;
  }
  
  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): { state: string; canExecute: boolean } {
    const state = this.circuitBreaker.getState();
    return {
      state,
      canExecute: state !== 'open',
    };
  }
  
  /**
   * Reset circuit breaker (for manual intervention)
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
    logger.info('Circuit breaker manually reset');
  }
  
  /**
   * Extract quote text from search result snippet
   * Attempts to find quoted text within the snippet
   */
  extractQuoteFromSnippet(snippet: string): string | null {
    // Try to find text within quotation marks
    const doubleQuoteMatch = snippet.match(/"([^"]+)"/);
    if (doubleQuoteMatch && doubleQuoteMatch[1] && doubleQuoteMatch[1].length > 20) {
      return doubleQuoteMatch[1];
    }
    
    // Try single quotes
    const singleQuoteMatch = snippet.match(/'([^']+)'/);
    if (singleQuoteMatch && singleQuoteMatch[1] && singleQuoteMatch[1].length > 20) {
      return singleQuoteMatch[1];
    }
    
    // Try to find text after common quote indicators
    const indicators = ['said:', 'wrote:', 'stated:', 'declared:', 'remarked:'];
    for (const indicator of indicators) {
      const index = snippet.toLowerCase().indexOf(indicator);
      if (index !== -1) {
        const afterIndicator = snippet.substring(index + indicator.length).trim();
        // Take the first sentence or up to 200 characters
        const sentenceEnd = afterIndicator.search(/[.!?]/);
        if (sentenceEnd > 20) {
          return afterIndicator.substring(0, sentenceEnd + 1).trim();
        }
      }
    }
    
    // If no quote markers found, return the snippet itself if it's reasonable length
    if (snippet.length > 20 && snippet.length < 300) {
      return snippet;
    }
    
    return null;
  }
}

// Export a singleton instance with default configuration
export const serperClient = new SerperClient();