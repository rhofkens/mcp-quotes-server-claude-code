/**
 * Resilient Get Quotes Tool
 * 
 * Enhanced version of getQuotes with full resilience patterns
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { resilientSerperClient } from '../services/resilientSerperClient.js';
import { Quote } from '../types/quotes.js';
import { QuoteSchemas, validate } from '../utils/validation.js';
import { ValidationError, wrapError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { QuoteCache } from '../utils/cache.js';

/**
 * Input schema for the getResilientQuotes tool
 */
const getResilientQuotesSchema = QuoteSchemas.getQuotesParams;

/**
 * Handler function for the getResilientQuotes tool
 */
async function getResilientQuotesHandler(params: unknown): Promise<{ 
  quotes: Quote[]; 
  metadata?: {
    cached: boolean;
    stale?: boolean;
    fallback?: boolean;
    retries?: number;
  };
}> {
  try {
    // Validate input parameters
    const validatedParams = validate(getResilientQuotesSchema, params);
    const { person, numberOfQuotes, topic } = validatedParams;
    
    logger.info('Getting quotes with resilience', { person, numberOfQuotes, topic });
    
    // Generate cache key for direct cache check
    const cacheKey = QuoteCache.generateKey(person, topic, numberOfQuotes);
    const cacheCheck = resilientSerperClient['cache'].getWithFallback(cacheKey);
    
    // If we have fresh cache, return immediately
    if (cacheCheck.data && !cacheCheck.stale) {
      logger.info('Returning fresh cached quotes', {
        person,
        count: cacheCheck.data.length,
      });
      
      return {
        quotes: cacheCheck.data.slice(0, numberOfQuotes),
        metadata: {
          cached: true,
          stale: false,
        },
      };
    }
    
    // Build search query
    const searchQuery = resilientSerperClient.buildQuoteSearchQuery(person, topic);
    
    // Track retry attempts
    let retryCount = 0;
    
    try {
      // Search for quotes using resilient client
      const searchResults = await resilientSerperClient.searchQuotes({
        query: searchQuery,
        num: numberOfQuotes * 2, // Request more to account for filtering
      });
      
      // Process search results into quotes
      const quotes: Quote[] = [];
      const seenQuotes = new Set<string>();
      
      for (const result of searchResults) {
        if (quotes.length >= numberOfQuotes) {
          break;
        }
        
        const quoteText = resilientSerperClient.extractQuoteFromSnippet(result.snippet);
        
        if (quoteText && !seenQuotes.has(quoteText)) {
          seenQuotes.add(quoteText);
          
          const quote: Quote = {
            text: quoteText,
            author: person,
          };
          
          if (result.link) {
            quote.source = result.link;
          }
          
          quotes.push(quote);
        }
      }
      
      // If we don't have enough quotes, try broader search
      if (quotes.length < numberOfQuotes) {
        logger.warn('Not enough quotes found, trying broader search', {
          found: quotes.length,
          requested: numberOfQuotes,
        });
        
        const broaderQuery = topic 
          ? resilientSerperClient.buildQuoteSearchQuery(person)
          : `famous quotes by ${person}`;
        
        const additionalResults = await resilientSerperClient.searchQuotes({
          query: broaderQuery,
          num: (numberOfQuotes - quotes.length) * 3,
        });
        
        for (const result of additionalResults) {
          if (quotes.length >= numberOfQuotes) {
            break;
          }
          
          const quoteText = resilientSerperClient.extractQuoteFromSnippet(result.snippet);
          
          if (quoteText && !seenQuotes.has(quoteText)) {
            seenQuotes.add(quoteText);
            
            const quote: Quote = {
              text: quoteText,
              author: person,
            };
            
            if (result.link) {
              quote.source = result.link;
            }
            
            quotes.push(quote);
          }
        }
      }
      
      // Cache the results
      if (quotes.length > 0) {
        resilientSerperClient['cache'].set(cacheKey, quotes);
      }
      
      logger.info('Quotes retrieved successfully with resilience', {
        person,
        requested: numberOfQuotes,
        found: quotes.length,
        topic,
        retries: retryCount,
        cached: false,
      });
      
      return {
        quotes,
        metadata: {
          cached: false,
          ...(retryCount > 0 && { retries: retryCount }),
        },
      };
    } catch (apiError) {
      // If API fails, check for stale cache
      if (cacheCheck.data) {
        logger.warn('API failed, returning stale cached quotes', {
          person,
          error: apiError instanceof Error ? apiError.message : String(apiError),
        });
        
        return {
          quotes: cacheCheck.data.slice(0, numberOfQuotes),
          metadata: {
            cached: true,
            stale: true,
            fallback: true,
          },
        };
      }
      
      // Try any cached quotes for this person
      const fallbackKey = QuoteCache.generateKey(person);
      const fallbackCache = resilientSerperClient['cache'].getWithFallback(fallbackKey);
      
      if (fallbackCache.data) {
        logger.warn('Using fallback cache for different query', {
          person,
          originalTopic: topic,
        });
        
        return {
          quotes: fallbackCache.data.slice(0, numberOfQuotes),
          metadata: {
            cached: true,
            stale: fallbackCache.stale,
            fallback: true,
          },
        };
      }
      
      throw apiError;
    }
  } catch (error) {
    // Handle validation errors
    if (error instanceof ValidationError) {
      logger.error('Validation error in getResilientQuotes', error);
      throw error;
    }
    
    // Log and wrap other errors
    logger.error('Failed to retrieve quotes with resilience', error);
    throw wrapError(error, 'Failed to retrieve quotes');
  }
}

/**
 * Tool definition for getResilientQuotes
 */
export const getResilientQuotesTool: Tool = {
  name: 'getResilientQuotes',
  description: 'Retrieve quotes with resilience patterns including caching, circuit breaker, and automatic retries. Provides fallback to cached data when external services are unavailable.',
  inputSchema: {
    type: 'object',
    properties: {
      person: {
        type: 'string',
        description: 'The name of the person whose quotes to retrieve',
      },
      numberOfQuotes: {
        type: 'number',
        description: 'Number of quotes to return (between 1 and 10)',
        minimum: 1,
        maximum: 10,
      },
      topic: {
        type: 'string',
        description: 'Optional topic to filter quotes by (e.g., "success", "love", "life")',
      },
    },
    required: ['person', 'numberOfQuotes'],
  },
  handler: getResilientQuotesHandler,
};

/**
 * Get health status of the resilient quotes system
 */
export async function getQuotesHealthStatus() {
  const health = await resilientSerperClient.getHealthStatus();
  
  return {
    ...health,
    recommendation: determineHealthRecommendation(health),
  };
}

/**
 * Determine health recommendation based on status
 */
function determineHealthRecommendation(health: any): string {
  const { circuitBreaker, cache } = health;
  
  if (circuitBreaker.state === 'OPEN') {
    return 'Service is down. Using cached responses only.';
  }
  
  if (circuitBreaker.state === 'HALF_OPEN') {
    return 'Service is recovering. Some requests may fail.';
  }
  
  if (circuitBreaker.failures > 3) {
    return 'Service experiencing intermittent failures. Monitor closely.';
  }
  
  const hitRate = cache.hits / (cache.hits + cache.misses);
  if (hitRate < 0.3 && cache.hits + cache.misses > 50) {
    return 'Low cache hit rate. Consider pre-warming common queries.';
  }
  
  return 'System operating normally.';
}

/**
 * Pre-warm cache with common quotes
 */
export async function prewarmQuotesCache(
  commonPeople: string[] = [
    'Albert Einstein',
    'Maya Angelou',
    'Mark Twain',
    'Oscar Wilde',
    'Gandhi',
  ]
): Promise<void> {
  logger.info('Pre-warming quotes cache', { people: commonPeople });
  
  for (const person of commonPeople) {
    try {
      await getResilientQuotesHandler({
        person,
        numberOfQuotes: 5,
      });
      
      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      logger.warn('Failed to pre-warm cache for person', {
        person,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * Handler export for tool registry
 */
export const handleGetResilientQuotes = getResilientQuotesHandler;