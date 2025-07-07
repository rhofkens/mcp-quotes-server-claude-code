/**
 * Unit tests for getQuotes tool
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals'

// Set up environment for testing
process.env['SERPER_API_KEY'] = 'test-api-key'

// Create mock implementations with proper typing
const mockSearchQuotes = jest.fn() as jest.MockedFunction<(params: any) => Promise<any[]>>
const mockBuildQuoteSearchQuery = jest.fn() as jest.MockedFunction<
  (person: string, topic?: string) => string
>
const mockExtractQuoteFromSnippet = jest.fn() as jest.MockedFunction<
  (snippet: string) => string | null
>
const mockGetCircuitBreakerStatus = jest.fn() as jest.MockedFunction<() => any>

// Use unstable_mockModule for ES modules
await jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

await jest.unstable_mockModule('../../../src/services/serperClient.js', () => ({
  serperClient: {
    searchQuotes: mockSearchQuotes,
    buildQuoteSearchQuery: mockBuildQuoteSearchQuery,
    extractQuoteFromSnippet: mockExtractQuoteFromSnippet,
    getCircuitBreakerStatus: mockGetCircuitBreakerStatus,
  },
  SerperClient: jest.fn().mockImplementation(() => ({
    searchQuotes: mockSearchQuotes,
    buildQuoteSearchQuery: mockBuildQuoteSearchQuery,
    extractQuoteFromSnippet: mockExtractQuoteFromSnippet,
    getCircuitBreakerStatus: mockGetCircuitBreakerStatus,
  })),
}))

// Import modules after mocking
const { ValidationError, NetworkError, AuthenticationError } = await import(
  '../../../src/utils/errors.js'
)
const { getQuotesTool, getQuotes, handleGetQuotes } = await import(
  '../../../src/tools/getQuotes.js'
)

// Import types
import type { ISerperSearchResult } from '../../../src/types/quotes.js'

describe('getQuotes Tool', () => {
  // Common mock search results
  const defaultMockSearchResults: ISerperSearchResult[] = [
    {
      snippet: '"Imagination is more important than knowledge."',
      link: 'https://example.com/einstein-quotes',
    },
    {
      snippet: '"Life is like riding a bicycle. To keep your balance, you must keep moving."',
      link: 'https://example.com/einstein-bicycle',
    },
    {
      snippet: '"The important thing is not to stop questioning."',
      link: 'https://example.com/einstein-curiosity',
    },
  ]

  beforeEach(() => {
    // Use fake timers to control async behavior
    jest.useFakeTimers()
    jest.clearAllMocks()

    // Reset all mock implementations
    mockSearchQuotes.mockReset()
    mockBuildQuoteSearchQuery.mockReset()
    mockExtractQuoteFromSnippet.mockReset()
    mockGetCircuitBreakerStatus.mockReset()

    // Set default return value for circuit breaker
    mockGetCircuitBreakerStatus.mockReturnValue({
      state: 'CLOSED',
      canExecute: true,
      consecutiveFailures: 0,
      lastFailureTime: null,
      nextResetTime: null,
    })
  })

  afterEach(() => {
    // Clear all timers to prevent open handles
    jest.clearAllTimers()
    jest.useRealTimers()
    // Restore all mocks
    jest.restoreAllMocks()
  })

  describe('Tool Definition', () => {
    it('should have correct name and description', () => {
      expect(getQuotesTool.name).toBe('getQuotes')
      expect(getQuotesTool.description).toContain('quotes')
    })

    it('should have correct input schema', () => {
      expect(getQuotesTool.inputSchema).toBeDefined()
      expect(getQuotesTool.inputSchema.type).toBe('object')
      expect(getQuotesTool.inputSchema['required']).toEqual(['person', 'numberOfQuotes'])
    })

    it('should define person parameter correctly', () => {
      const properties = getQuotesTool.inputSchema.properties
      expect(properties?.['person']).toEqual({
        type: 'string',
        description: expect.any(String),
      })
    })

    it('should define numberOfQuotes parameter correctly', () => {
      const properties = getQuotesTool.inputSchema.properties
      expect(properties?.['numberOfQuotes']).toEqual({
        type: 'number',
        description: expect.any(String),
        minimum: 1,
        maximum: 10,
      })
    })

    it('should define optional topic parameter', () => {
      const properties = getQuotesTool.inputSchema.properties
      expect(properties?.['topic']).toEqual({
        type: 'string',
        description: expect.any(String),
      })
    })
  })

  describe('Parameter Validation', () => {
    it('should reject missing person parameter', async () => {
      await expect(
        handleGetQuotes({
          numberOfQuotes: 3,
        })
      ).rejects.toThrow(ValidationError)
    })

    it('should reject missing numberOfQuotes parameter', async () => {
      await expect(
        handleGetQuotes({
          person: 'Albert Einstein',
        })
      ).rejects.toThrow(ValidationError)
    })

    it('should reject invalid numberOfQuotes (too low)', async () => {
      await expect(
        handleGetQuotes({
          person: 'Albert Einstein',
          numberOfQuotes: 0,
        })
      ).rejects.toThrow(ValidationError)
    })

    it('should reject invalid numberOfQuotes (too high)', async () => {
      await expect(
        handleGetQuotes({
          person: 'Albert Einstein',
          numberOfQuotes: 11,
        })
      ).rejects.toThrow(ValidationError)
    })

    it('should reject non-string person', async () => {
      await expect(
        handleGetQuotes({
          person: 123,
          numberOfQuotes: 3,
        })
      ).rejects.toThrow(ValidationError)
    })

    it('should reject non-number numberOfQuotes', async () => {
      await expect(
        handleGetQuotes({
          person: 'Albert Einstein',
          numberOfQuotes: '3',
        })
      ).rejects.toThrow(ValidationError)
    })

    it('should accept valid parameters without topic', async () => {
      const mockSearchResults: ISerperSearchResult[] = [
        { snippet: '"Imagination is more important than knowledge."', link: 'https://example.com' },
      ]

      mockBuildQuoteSearchQuery.mockReturnValue('search query')
      mockSearchQuotes.mockResolvedValue(mockSearchResults)
      mockExtractQuoteFromSnippet.mockReturnValue('Imagination is more important than knowledge.')

      const result = await handleGetQuotes({
        person: 'Albert Einstein',
        numberOfQuotes: 1,
      })

      expect(result.quotes).toHaveLength(1)
    })

    it('should accept valid parameters with topic', async () => {
      const mockSearchResults: ISerperSearchResult[] = [
        { snippet: '"Science without religion is lame."', link: 'https://example.com' },
      ]

      mockBuildQuoteSearchQuery.mockReturnValue('search query')
      mockSearchQuotes.mockResolvedValue(mockSearchResults)
      mockExtractQuoteFromSnippet.mockReturnValue('Science without religion is lame.')

      const result = await handleGetQuotes({
        person: 'Albert Einstein',
        numberOfQuotes: 1,
        topic: 'religion',
      })

      expect(result.quotes).toHaveLength(1)
    })
  })

  describe('Quote Retrieval', () => {
    beforeEach(() => {
      mockBuildQuoteSearchQuery.mockReturnValue('search query')
      mockExtractQuoteFromSnippet.mockImplementation((snippet: string) => {
        const match = snippet.match(/"([^"]+)"/)
        return match && match[1] ? match[1] : null
      })
    })

    it('should return requested number of quotes', async () => {
      mockSearchQuotes.mockResolvedValueOnce(defaultMockSearchResults)

      const result = await handleGetQuotes({
        person: 'Albert Einstein',
        numberOfQuotes: 3,
      })

      expect(result.quotes).toHaveLength(3)
      expect(result.quotes[0]).toHaveProperty('text')
      expect(result.quotes[0]).toHaveProperty('author')
      expect(result.quotes[0]).toHaveProperty('source')
    })

    it('should include person as author', async () => {
      mockSearchQuotes.mockResolvedValueOnce(defaultMockSearchResults)

      const result = await handleGetQuotes({
        person: 'Albert Einstein',
        numberOfQuotes: 2,
      })

      expect(result.quotes[0]?.author).toBe('Albert Einstein')
      expect(result.quotes[1]?.author).toBe('Albert Einstein')
    })

    it('should include source URL when available', async () => {
      mockSearchQuotes.mockResolvedValueOnce(defaultMockSearchResults)

      const result = await handleGetQuotes({
        person: 'Albert Einstein',
        numberOfQuotes: 1,
      })

      expect(result.quotes[0]?.source).toBe('https://example.com/einstein-quotes')
    })

    it('should filter duplicates', async () => {
      const duplicateResults: ISerperSearchResult[] = [
        { snippet: '"Same quote"', link: 'https://example1.com' },
        { snippet: '"Same quote"', link: 'https://example2.com' },
        { snippet: '"Different quote"', link: 'https://example3.com' },
      ]

      // First search returns duplicates
      mockSearchQuotes.mockResolvedValueOnce(duplicateResults)
      // Second broader search returns no additional results
      mockSearchQuotes.mockResolvedValueOnce([])

      const result = await handleGetQuotes({
        person: 'Test Person',
        numberOfQuotes: 3,
      })

      expect(result.quotes).toHaveLength(2)
      expect(result.quotes[0]?.text).toBe('Same quote')
      expect(result.quotes[1]?.text).toBe('Different quote')
    })

    it('should handle fewer results than requested', async () => {
      const oneResult: ISerperSearchResult[] = [defaultMockSearchResults[0]!]
      mockSearchQuotes.mockResolvedValueOnce(oneResult).mockResolvedValueOnce([]) // No additional results

      const result = await handleGetQuotes({
        person: 'Albert Einstein',
        numberOfQuotes: 5,
      })

      expect(result.quotes.length).toBeLessThanOrEqual(5)
      expect(result.quotes.length).toBeGreaterThan(0)
    })

    it('should use topic in search query', async () => {
      mockSearchQuotes.mockResolvedValueOnce(defaultMockSearchResults)

      await handleGetQuotes({
        person: 'Albert Einstein',
        numberOfQuotes: 1,
        topic: 'science',
      })

      expect(mockBuildQuoteSearchQuery).toHaveBeenCalledWith('Albert Einstein', 'science')
    })

    it('should try broader search if not enough quotes found', async () => {
      mockSearchQuotes
        .mockResolvedValueOnce([]) // First search returns nothing
        .mockResolvedValueOnce(defaultMockSearchResults) // Broader search returns results

      const result = await handleGetQuotes({
        person: 'Albert Einstein',
        numberOfQuotes: 2,
        topic: 'specific topic',
      })

      expect(mockSearchQuotes).toHaveBeenCalledTimes(2)
      expect(result.quotes.length).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockBuildQuoteSearchQuery.mockReturnValue('search query')
      mockSearchQuotes.mockRejectedValueOnce(
        new NetworkError('Network connection failed', 'serper')
      )

      await expect(
        handleGetQuotes({
          person: 'Albert Einstein',
          numberOfQuotes: 3,
        })
      ).rejects.toThrow('Network connection failed')
    })

    it('should handle authentication errors', async () => {
      mockBuildQuoteSearchQuery.mockReturnValue('search query')
      mockSearchQuotes.mockRejectedValueOnce(new AuthenticationError('Invalid API key', 'serper'))

      await expect(
        handleGetQuotes({
          person: 'Albert Einstein',
          numberOfQuotes: 3,
        })
      ).rejects.toThrow('Invalid API key')
    })

    it('should handle generic errors', async () => {
      mockBuildQuoteSearchQuery.mockReturnValue('search query')
      mockSearchQuotes.mockRejectedValueOnce(new Error('Something went wrong'))

      await expect(
        handleGetQuotes({
          person: 'Albert Einstein',
          numberOfQuotes: 3,
        })
      ).rejects.toThrow()
    })

    it('should handle search results with no extractable quotes', async () => {
      const badResults: ISerperSearchResult[] = [
        { snippet: 'No quotes here' },
        { snippet: 'Still no quotes' },
      ]

      mockSearchQuotes.mockResolvedValueOnce(badResults).mockResolvedValueOnce([]) // No additional results
      mockExtractQuoteFromSnippet.mockReturnValue(null)

      const result = await handleGetQuotes({
        person: 'Test Person',
        numberOfQuotes: 3,
      })

      expect(result.quotes).toEqual([])
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty search results', async () => {
      mockBuildQuoteSearchQuery.mockReturnValue('search query')
      mockSearchQuotes.mockResolvedValueOnce([]).mockResolvedValueOnce([])

      const result = await handleGetQuotes({
        person: 'Unknown Person',
        numberOfQuotes: 3,
      })

      expect(result.quotes).toEqual([])
    })

    it('should handle person names with special characters', async () => {
      mockSearchQuotes.mockResolvedValueOnce(defaultMockSearchResults)

      mockExtractQuoteFromSnippet.mockImplementation((snippet: string) => {
        const match = snippet.match(/"([^"]+)"/)
        return match && match[1] ? match[1] : null
      })

      const result = await handleGetQuotes({
        person: 'Martin Luther King, Jr.',
        numberOfQuotes: 1,
      })

      expect(result.quotes[0]?.author).toBe('Martin Luther King, Jr.')
    })

    it('should handle very long person names', async () => {
      const longName = 'A'.repeat(100)
      mockSearchQuotes.mockResolvedValueOnce(defaultMockSearchResults)

      mockExtractQuoteFromSnippet.mockImplementation((snippet: string) => {
        const match = snippet.match(/"([^"]+)"/)
        return match && match[1] ? match[1] : null
      })

      const result = await handleGetQuotes({
        person: longName,
        numberOfQuotes: 1,
      })

      expect(result.quotes[0]?.author).toBe(longName)
    })

    it('should handle search results without links', async () => {
      const noLinkResults: ISerperSearchResult[] = [{ snippet: '"Quote without source"' }]

      mockSearchQuotes.mockResolvedValueOnce(noLinkResults)
      mockExtractQuoteFromSnippet.mockReturnValue('Quote without source')

      const result = await handleGetQuotes({
        person: 'Test Person',
        numberOfQuotes: 1,
      })

      expect(result.quotes[0]?.text).toBe('Quote without source')
      expect(result.quotes[0]?.source).toBeUndefined()
    })
  })

  describe('getQuotes helper function', () => {
    it('should return array of quotes directly', async () => {
      const mockSearchResults: ISerperSearchResult[] = [
        { snippet: '"Test quote"', link: 'https://example.com' },
      ]

      mockBuildQuoteSearchQuery.mockReturnValue('search query')
      mockSearchQuotes.mockResolvedValue(mockSearchResults)
      mockExtractQuoteFromSnippet.mockReturnValue('Test quote')

      const quotes = await getQuotes({
        person: 'Test Person',
        numberOfQuotes: 1,
      })

      expect(Array.isArray(quotes)).toBe(true)
      expect(quotes).toHaveLength(1)
      expect(quotes[0]?.text).toBe('Test quote')
    })
  })
})
