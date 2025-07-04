/**
 * Serper API Client
 * 
 * Service for searching quotes using the Serper.dev search API
 */

import axios, { AxiosError } from 'axios';
import { APIError, ErrorCode } from '../utils/errors.js';
import { SerperApiResponse, SerperSearchResult } from '../types/quotes.js';
import { validateEnvVar } from '../utils/validation.js';

/**
 * Serper API configuration
 */
export interface SerperConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

/**
 * Serper search parameters
 */
export interface SerperSearchParams {
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
  
  constructor(config?: Partial<SerperConfig>) {
    // Get API key from environment or config
    this.apiKey = config?.apiKey || validateEnvVar('SERPER_API_KEY', process.env['SERPER_API_KEY']);
    this.baseUrl = config?.baseUrl || 'https://google.serper.dev';
    this.timeout = config?.timeout || 10000; // 10 seconds default
  }
  
  /**
   * Search for quotes using Serper API
   */
  async searchQuotes(params: SerperSearchParams): Promise<SerperSearchResult[]> {
    try {
      const response = await axios.post<SerperApiResponse>(
        `${this.baseUrl}/search`,
        {
          q: params.query,
          num: params.num || 10,
        },
        {
          headers: {
            'X-API-KEY': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: this.timeout,
        }
      );
      
      // Check for API errors in response
      if (response.data.error) {
        throw new APIError(
          `Serper API error: ${response.data.error}`,
          ErrorCode.API_ERROR,
          'serper',
          { error: response.data.error }
        );
      }
      
      // Return organic results or empty array
      return response.data.organic || [];
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      
      if (error instanceof AxiosError) {
        // Handle specific Axios errors
        if (error.code === 'ECONNABORTED') {
          throw new APIError(
            'Serper API request timed out',
            ErrorCode.API_TIMEOUT,
            'serper',
            { timeout: this.timeout }
          );
        }
        
        if (error.response) {
          const status = error.response.status;
          
          if (status === 401) {
            throw new APIError(
              'Invalid Serper API key',
              ErrorCode.API_UNAUTHORIZED,
              'serper'
            );
          }
          
          if (status === 429) {
            throw new APIError(
              'Serper API rate limit exceeded',
              ErrorCode.API_RATE_LIMIT,
              'serper',
              {
                retryAfter: error.response.headers['retry-after'],
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
            }
          );
        }
        
        // Network errors
        throw new APIError(
          `Network error connecting to Serper API: ${error.message}`,
          ErrorCode.API_ERROR,
          'serper',
          { originalError: error.message }
        );
      }
      
      // Unknown errors
      throw new APIError(
        'Unexpected error while searching quotes',
        ErrorCode.API_ERROR,
        'serper',
        { originalError: String(error) }
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