/**
 * Get Quotes Tool
 * 
 * MCP tool for retrieving quotes from a specific person
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { serperClient } from '../services/serperClient.js';
import { Quote, GetQuotesParams } from '../types/quotes.js';
import { QuoteSchemas, validate } from '../utils/validation.js';
import { APIError, ValidationError, wrapError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Input schema for the getQuotes tool
 */
const getQuotesSchema = QuoteSchemas.getQuotesParams;

/**
 * Handler function for the getQuotes tool
 */
async function getQuotesHandler(params: unknown): Promise<{ quotes: Quote[] }> {
  try {
    // Validate input parameters
    const validatedParams = validate(getQuotesSchema, params);
    const { person, numberOfQuotes, topic } = validatedParams;
    
    logger.info('Getting quotes', { person, numberOfQuotes, topic });
    
    // Build search query
    const searchQuery = serperClient.buildQuoteSearchQuery(person, topic);
    
    // Search for quotes using Serper API
    const searchResults = await serperClient.searchQuotes({
      query: searchQuery,
      num: numberOfQuotes * 2, // Request more to account for filtering
    });
    
    // Process search results into quotes
    const quotes: Quote[] = [];
    const seenQuotes = new Set<string>(); // To avoid duplicates
    
    for (const result of searchResults) {
      if (quotes.length >= numberOfQuotes) {
        break;
      }
      
      // Extract quote from snippet
      const quoteText = serperClient.extractQuoteFromSnippet(result.snippet);
      
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
    
    // If we don't have enough quotes, search for more generic results
    if (quotes.length < numberOfQuotes) {
      logger.warn('Not enough quotes found, trying broader search', {
        found: quotes.length,
        requested: numberOfQuotes,
      });
      
      // Try a broader search without topic
      const broaderQuery = topic 
        ? serperClient.buildQuoteSearchQuery(person)
        : `famous quotes by ${person}`;
      
      const additionalResults = await serperClient.searchQuotes({
        query: broaderQuery,
        num: (numberOfQuotes - quotes.length) * 3,
      });
      
      for (const result of additionalResults) {
        if (quotes.length >= numberOfQuotes) {
          break;
        }
        
        const quoteText = serperClient.extractQuoteFromSnippet(result.snippet);
        
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
    
    // Log final results
    logger.info('Quotes retrieved successfully', {
      person,
      requested: numberOfQuotes,
      found: quotes.length,
      topic,
    });
    
    return { quotes };
  } catch (error) {
    // Handle specific error types
    if (error instanceof ValidationError) {
      logger.error('Validation error in getQuotes', error);
      throw error;
    }
    
    if (error instanceof APIError) {
      logger.error('API error in getQuotes', error);
      throw error;
    }
    
    // Wrap unknown errors
    logger.error('Unexpected error in getQuotes', error);
    throw wrapError(error, 'Failed to retrieve quotes');
  }
}

/**
 * Tool definition for getQuotes
 */
export const getQuotesTool: Tool = {
  name: 'getQuotes',
  description: 'Retrieve quotes from a specific person. Searches for authentic quotes and returns them with attribution and source information.',
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
  handler: getQuotesHandler,
};

/**
 * Alternative handler that can be used directly (not through MCP)
 */
export async function getQuotes(params: GetQuotesParams): Promise<Quote[]> {
  const result = await getQuotesHandler(params);
  return result.quotes;
}

/**
 * Handler export for tool registry
 */
export const handleGetQuotes = getQuotesHandler;