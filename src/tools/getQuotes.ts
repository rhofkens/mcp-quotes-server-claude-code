/**
 * Get Quotes Tool
 *
 * MCP tool for retrieving quotes from a specific person
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js'

import { serperClient } from '../services/serperClient.js'
import type { IQuote, IGetQuotesParams } from '../types/quotes.js'
import {
  APIError,
  ValidationError,
  wrapError,
  createStructuredError,
  ErrorContextBuilder,
  generateRequestId,
  logError,
  ErrorAggregator,
  withTimeout,
} from '../utils/errorHandling.js'
import { logger } from '../utils/logger.js'
import { QuoteSchemas, validate } from '../utils/validation.js'

/**
 * Input schema for the getQuotes tool
 */
const getQuotesSchema = QuoteSchemas.getQuotesParams

/**
 * Handler function for the getQuotes tool with enhanced error handling
 */
async function getQuotesHandler(params: unknown): Promise<{ quotes: IQuote[] }> {
  const requestId = generateRequestId()
  const errorAggregator = new ErrorAggregator()

  try {
    // Validate input parameters
    const validatedParams = validate(getQuotesSchema, params)
    const { person, numberOfQuotes, topic } = validatedParams

    // Build error context
    const context = new ErrorContextBuilder()
      .setOperation('getQuotes')
      .setInput({ person, numberOfQuotes, topic })
      .setEnvironment()
      .build()

    logger.info('Getting quotes', {
      requestId,
      person,
      numberOfQuotes,
      topic,
    })

    // Check circuit breaker status
    const cbStatus = serperClient.getCircuitBreakerStatus()
    if (!cbStatus.canExecute) {
      logger.warn('Circuit breaker is open, API temporarily unavailable', {
        requestId,
        state: cbStatus.state,
      })
    }

    // Build search query
    const searchQuery = serperClient.buildQuoteSearchQuery(person, topic)

    // Search for quotes using Serper API with timeout
    const searchResults = await withTimeout(
      serperClient.searchQuotes({
        query: searchQuery,
        num: numberOfQuotes * 2, // Request more to account for filtering
      }),
      30000, // 30 second overall timeout
      'Quote search operation timed out'
    )

    // Process search results into quotes
    const quotes: IQuote[] = []
    const seenQuotes = new Set<string>() // To avoid duplicates

    for (const result of searchResults) {
      if (quotes.length >= numberOfQuotes) {
        break
      }

      try {
        // Extract quote from snippet
        const quoteText = serperClient.extractQuoteFromSnippet(result.snippet)

        if (quoteText && !seenQuotes.has(quoteText)) {
          seenQuotes.add(quoteText)

          const quote: IQuote = {
            text: quoteText,
            author: person,
          }

          if (result.link) {
            quote.source = result.link
          }

          quotes.push(quote)
        }
      } catch (parseError) {
        // Aggregate parsing errors but don't fail the entire operation
        errorAggregator.add(
          parseError instanceof Error ? parseError : new Error(String(parseError)),
          { snippet: result.snippet }
        )
      }
    }

    // If we don't have enough quotes, search for more generic results
    if (quotes.length < numberOfQuotes) {
      logger.warn('Not enough quotes found, trying broader search', {
        requestId,
        found: quotes.length,
        requested: numberOfQuotes,
      })

      try {
        // Try a broader search without topic
        const broaderQuery = topic
          ? serperClient.buildQuoteSearchQuery(person)
          : `famous quotes by ${person}`

        const additionalResults = await withTimeout(
          serperClient.searchQuotes({
            query: broaderQuery,
            num: (numberOfQuotes - quotes.length) * 3,
          }),
          20000, // 20 second timeout for additional search
          'Additional quote search timed out'
        )

        for (const result of additionalResults) {
          if (quotes.length >= numberOfQuotes) {
            break
          }

          try {
            const quoteText = serperClient.extractQuoteFromSnippet(result.snippet)

            if (quoteText && !seenQuotes.has(quoteText)) {
              seenQuotes.add(quoteText)

              const quote: IQuote = {
                text: quoteText,
                author: person,
              }

              if (result.link) {
                quote.source = result.link
              }

              quotes.push(quote)
            }
          } catch (parseError) {
            // Aggregate parsing errors
            errorAggregator.add(
              parseError instanceof Error ? parseError : new Error(String(parseError)),
              { snippet: result.snippet }
            )
          }
        }
      } catch (additionalSearchError) {
        // Log but don't fail if additional search fails
        logger.warn('Additional search failed', {
          requestId,
          error: additionalSearchError,
        })

        // Add to context for debugging
        if (context.relatedErrors) {
          new ErrorContextBuilder().addRelatedError(
            'ADDITIONAL_SEARCH_FAILED',
            additionalSearchError instanceof Error
              ? additionalSearchError.message
              : String(additionalSearchError)
          )
        }
      }
    }

    // Log parsing errors if any
    if (errorAggregator.hasErrors()) {
      logger.warn('Some quotes could not be parsed', {
        requestId,
        errors: errorAggregator.getErrors().length,
      })
    }

    // Log final results
    logger.info('Quotes retrieved successfully', {
      requestId,
      person,
      requested: numberOfQuotes,
      found: quotes.length,
      topic,
      parsingErrors: errorAggregator.getErrors().length,
    })

    return { quotes }
  } catch (error) {
    // Build comprehensive error context
    const context = new ErrorContextBuilder()
      .setOperation('getQuotes')
      .setInput(params as Record<string, unknown>)
      .setEnvironment()
      .build()

    // Handle specific error types
    if (error instanceof ValidationError) {
      logError(error, context)

      // Return structured error for validation failures
      const structured = createStructuredError(error, context, requestId)
      throw new ValidationError(structured.error.userMessage, error.field, structured.error.details)
    }

    if (error instanceof APIError) {
      logError(error, context)

      // Add circuit breaker status to error details
      const cbStatus = serperClient.getCircuitBreakerStatus()
      error.details = {
        ...error.details,
        circuitBreakerState: cbStatus.state,
        requestId,
      }

      throw error
    }

    // Wrap unknown errors with context
    logError(error, context, 'error')
    const wrappedError = wrapError(error, 'Failed to retrieve quotes')
    wrappedError.details = {
      ...wrappedError.details,
      requestId,
    }

    throw wrappedError
  }
}

/**
 * Tool definition for getQuotes
 */
export const getQuotesTool: Tool = {
  name: 'getQuotes',
  description:
    'Retrieve quotes from a specific person. Searches for authentic quotes and returns them with attribution and source information.',
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
}

/**
 * Alternative handler that can be used directly (not through MCP)
 */
export async function getQuotes(params: IGetQuotesParams): Promise<IQuote[]> {
  const result = await getQuotesHandler(params)
  return result.quotes
}

/**
 * Handler export for tool registry
 */
export const handleGetQuotes = getQuotesHandler
