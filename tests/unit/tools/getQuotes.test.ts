/**
 * Unit tests for getQuotes tool
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { getQuotesTool, getQuotes, handleGetQuotes } from '../../../src/tools/getQuotes.js';
import { SerperClient } from '../../../src/services/serperClient.js';
import { ValidationError, NetworkError, AuthenticationError } from '../../../src/utils/errors.js';
import type { SerperSearchResult } from '../../../src/types/quotes.js';

// Mock the SerperClient
jest.mock('../../../src/services/serperClient.js');

// Mock the logger
jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('getQuotes Tool', () => {
  let mockClient: jest.Mocked<SerperClient>;
  
  // Common mock search results
  const defaultMockSearchResults: SerperSearchResult[] = [
    {
      snippet: '"Imagination is more important than knowledge."',
      link: 'https://example.com/einstein-quotes'
    },
    {
      snippet: '"Life is like riding a bicycle. To keep your balance, you must keep moving."',
      link: 'https://example.com/einstein-bicycle'
    },
    {
      snippet: '"The important thing is not to stop questioning."',
      link: 'https://example.com/einstein-curiosity'
    }
  ];
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a mock client instance
    mockClient = {
      searchQuotes: jest.fn(),
      buildQuoteSearchQuery: jest.fn(),
      extractQuoteFromSnippet: jest.fn(),
      getCircuitBreakerStatus: jest.fn().mockReturnValue({
        state: 'CLOSED',
        canExecute: true,
        consecutiveFailures: 0,
        lastFailureTime: null,
        nextResetTime: null
      })
    } as unknown as jest.Mocked<SerperClient>;
    
    // Mock the serperClient export
    (SerperClient as unknown as jest.Mock).mockImplementation(() => mockClient);
    jest.mocked(require('../../../src/services/serperClient.js')).serperClient = mockClient;
  });
  
  describe('Tool Definition', () => {
    it('should have correct name and description', () => {
      expect(getQuotesTool.name).toBe('getQuotes');
      expect(getQuotesTool.description).toContain('quotes');
    });
    
    it('should have correct input schema', () => {
      expect(getQuotesTool.inputSchema).toBeDefined();
      expect(getQuotesTool.inputSchema.type).toBe('object');
      expect(getQuotesTool.inputSchema['required']).toEqual(['person', 'numberOfQuotes']);
    });
    
    it('should define person parameter correctly', () => {
      const properties = getQuotesTool.inputSchema.properties;
      expect(properties?.['person']).toEqual({
        type: 'string',
        description: expect.any(String)
      });
    });
    
    it('should define numberOfQuotes parameter correctly', () => {
      const properties = getQuotesTool.inputSchema.properties;
      expect(properties?.['numberOfQuotes']).toEqual({
        type: 'number',
        description: expect.any(String),
        minimum: 1,
        maximum: 10
      });
    });
    
    it('should define optional topic parameter', () => {
      const properties = getQuotesTool.inputSchema.properties;
      expect(properties?.['topic']).toEqual({
        type: 'string',
        description: expect.any(String)
      });
    });
  });
  
  describe('Parameter Validation', () => {
    it('should reject missing person parameter', async () => {
      await expect(handleGetQuotes({
        numberOfQuotes: 3
      })).rejects.toThrow(ValidationError);
    });
    
    it('should reject missing numberOfQuotes parameter', async () => {
      await expect(handleGetQuotes({
        person: 'Albert Einstein'
      })).rejects.toThrow(ValidationError);
    });
    
    it('should reject invalid numberOfQuotes (too low)', async () => {
      await expect(handleGetQuotes({
        person: 'Albert Einstein',
        numberOfQuotes: 0
      })).rejects.toThrow(ValidationError);
    });
    
    it('should reject invalid numberOfQuotes (too high)', async () => {
      await expect(handleGetQuotes({
        person: 'Albert Einstein',
        numberOfQuotes: 11
      })).rejects.toThrow(ValidationError);
    });
    
    it('should reject non-string person', async () => {
      await expect(handleGetQuotes({
        person: 123,
        numberOfQuotes: 3
      })).rejects.toThrow(ValidationError);
    });
    
    it('should reject non-number numberOfQuotes', async () => {
      await expect(handleGetQuotes({
        person: 'Albert Einstein',
        numberOfQuotes: '3'
      })).rejects.toThrow(ValidationError);
    });
    
    it('should accept valid parameters without topic', async () => {
      const mockSearchResults: SerperSearchResult[] = [
        { snippet: '"Imagination is more important than knowledge."', link: 'https://example.com' }
      ];
      
      mockClient.buildQuoteSearchQuery.mockReturnValue('search query');
      mockClient.searchQuotes.mockResolvedValue(mockSearchResults);
      mockClient.extractQuoteFromSnippet.mockReturnValue('Imagination is more important than knowledge.');
      
      const result = await handleGetQuotes({
        person: 'Albert Einstein',
        numberOfQuotes: 1
      });
      
      expect(result.quotes).toHaveLength(1);
    });
    
    it('should accept valid parameters with topic', async () => {
      const mockSearchResults: SerperSearchResult[] = [
        { snippet: '"Science without religion is lame."', link: 'https://example.com' }
      ];
      
      mockClient.buildQuoteSearchQuery.mockReturnValue('search query');
      mockClient.searchQuotes.mockResolvedValue(mockSearchResults);
      mockClient.extractQuoteFromSnippet.mockReturnValue('Science without religion is lame.');
      
      const result = await handleGetQuotes({
        person: 'Albert Einstein',
        numberOfQuotes: 1,
        topic: 'religion'
      });
      
      expect(result.quotes).toHaveLength(1);
    });
  });
  
  describe('Quote Retrieval', () => {
    beforeEach(() => {
      mockClient.buildQuoteSearchQuery.mockReturnValue('search query');
      mockClient.extractQuoteFromSnippet.mockImplementation((snippet) => {
        const match = snippet.match(/"([^"]+)"/);
        return match && match[1] ? match[1] : null;
      });
    });
    
    it('should return requested number of quotes', async () => {
      mockClient.searchQuotes.mockResolvedValueOnce(defaultMockSearchResults);
      
      const result = await handleGetQuotes({
        person: 'Albert Einstein',
        numberOfQuotes: 3
      });
      
      expect(result.quotes).toHaveLength(3);
      expect(result.quotes[0]).toHaveProperty('text');
      expect(result.quotes[0]).toHaveProperty('author');
      expect(result.quotes[0]).toHaveProperty('source');
    });
    
    it('should include person as author', async () => {
      mockClient.searchQuotes.mockResolvedValueOnce(defaultMockSearchResults);
      
      const result = await handleGetQuotes({
        person: 'Albert Einstein',
        numberOfQuotes: 2
      });
      
      expect(result.quotes[0]?.author).toBe('Albert Einstein');
      expect(result.quotes[1]?.author).toBe('Albert Einstein');
    });
    
    it('should include source URL when available', async () => {
      mockClient.searchQuotes.mockResolvedValueOnce(defaultMockSearchResults);
      
      const result = await handleGetQuotes({
        person: 'Albert Einstein',
        numberOfQuotes: 1
      });
      
      expect(result.quotes[0]?.source).toBe('https://example.com/einstein-quotes');
    });
    
    it('should filter duplicates', async () => {
      const duplicateResults: SerperSearchResult[] = [
        { snippet: '"Same quote"', link: 'https://example1.com' },
        { snippet: '"Same quote"', link: 'https://example2.com' },
        { snippet: '"Different quote"', link: 'https://example3.com' }
      ];
      
      // First search returns duplicates
      mockClient.searchQuotes.mockResolvedValueOnce(duplicateResults);
      // Second broader search returns no additional results
      mockClient.searchQuotes.mockResolvedValueOnce([]);
      
      const result = await handleGetQuotes({
        person: 'Test Person',
        numberOfQuotes: 3
      });
      
      expect(result.quotes).toHaveLength(2);
      expect(result.quotes[0]?.text).toBe('Same quote');
      expect(result.quotes[1]?.text).toBe('Different quote');
    });
    
    it('should handle fewer results than requested', async () => {
      const oneResult: SerperSearchResult[] = [defaultMockSearchResults[0]!];
      mockClient.searchQuotes
        .mockResolvedValueOnce(oneResult)
        .mockResolvedValueOnce([]); // No additional results
      
      const result = await handleGetQuotes({
        person: 'Albert Einstein',
        numberOfQuotes: 5
      });
      
      expect(result.quotes.length).toBeLessThanOrEqual(5);
      expect(result.quotes.length).toBeGreaterThan(0);
    });
    
    it('should use topic in search query', async () => {
      mockClient.searchQuotes.mockResolvedValueOnce(defaultMockSearchResults);
      
      await handleGetQuotes({
        person: 'Albert Einstein',
        numberOfQuotes: 1,
        topic: 'science'
      });
      
      expect(mockClient.buildQuoteSearchQuery).toHaveBeenCalledWith('Albert Einstein', 'science');
    });
    
    it('should try broader search if not enough quotes found', async () => {
      mockClient.searchQuotes
        .mockResolvedValueOnce([]) // First search returns nothing
        .mockResolvedValueOnce(defaultMockSearchResults); // Broader search returns results
      
      const result = await handleGetQuotes({
        person: 'Albert Einstein',
        numberOfQuotes: 2,
        topic: 'specific topic'
      });
      
      expect(mockClient.searchQuotes).toHaveBeenCalledTimes(2);
      expect(result.quotes.length).toBeGreaterThan(0);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockClient.buildQuoteSearchQuery.mockReturnValue('search query');
      mockClient.searchQuotes.mockRejectedValueOnce(
        new NetworkError('Network connection failed', 'serper')
      );
      
      await expect(handleGetQuotes({
        person: 'Albert Einstein',
        numberOfQuotes: 3
      })).rejects.toThrow('Network connection failed');
    });
    
    it('should handle authentication errors', async () => {
      mockClient.buildQuoteSearchQuery.mockReturnValue('search query');
      mockClient.searchQuotes.mockRejectedValueOnce(
        new AuthenticationError('Invalid API key', 'serper')
      );
      
      await expect(handleGetQuotes({
        person: 'Albert Einstein',
        numberOfQuotes: 3
      })).rejects.toThrow('Invalid API key');
    });
    
    it('should handle generic errors', async () => {
      mockClient.buildQuoteSearchQuery.mockReturnValue('search query');
      mockClient.searchQuotes.mockRejectedValueOnce(
        new Error('Something went wrong')
      );
      
      await expect(handleGetQuotes({
        person: 'Albert Einstein',
        numberOfQuotes: 3
      })).rejects.toThrow();
    });
    
    it('should handle search results with no extractable quotes', async () => {
      const badResults: SerperSearchResult[] = [
        { snippet: 'No quotes here' },
        { snippet: 'Still no quotes' }
      ];
      
      mockClient.searchQuotes
        .mockResolvedValueOnce(badResults)
        .mockResolvedValueOnce([]); // No additional results
      mockClient.extractQuoteFromSnippet.mockReturnValue(null);
      
      const result = await handleGetQuotes({
        person: 'Test Person',
        numberOfQuotes: 3
      });
      
      expect(result.quotes).toEqual([]);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle empty search results', async () => {
      mockClient.buildQuoteSearchQuery.mockReturnValue('search query');
      mockClient.searchQuotes
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      
      const result = await handleGetQuotes({
        person: 'Unknown Person',
        numberOfQuotes: 3
      });
      
      expect(result.quotes).toEqual([]);
    });
    
    it('should handle person names with special characters', async () => {
      mockClient.searchQuotes.mockResolvedValueOnce(defaultMockSearchResults);
      
      mockClient.extractQuoteFromSnippet.mockImplementation((snippet) => {
        const match = snippet.match(/"([^"]+)"/);
        return match && match[1] ? match[1] : null;
      });
      
      const result = await handleGetQuotes({
        person: "Martin Luther King, Jr.",
        numberOfQuotes: 1
      });
      
      expect(result.quotes[0]?.author).toBe("Martin Luther King, Jr.");
    });
    
    it('should handle very long person names', async () => {
      const longName = 'A'.repeat(100);
      mockClient.searchQuotes.mockResolvedValueOnce(defaultMockSearchResults);
      
      mockClient.extractQuoteFromSnippet.mockImplementation((snippet) => {
        const match = snippet.match(/"([^"]+)"/);
        return match && match[1] ? match[1] : null;
      });
      
      const result = await handleGetQuotes({
        person: longName,
        numberOfQuotes: 1
      });
      
      expect(result.quotes[0]?.author).toBe(longName);
    });
    
    it('should handle search results without links', async () => {
      const noLinkResults: SerperSearchResult[] = [
        { snippet: '"Quote without source"' }
      ];
      
      mockClient.searchQuotes.mockResolvedValueOnce(noLinkResults);
      mockClient.extractQuoteFromSnippet.mockReturnValue('Quote without source');
      
      const result = await handleGetQuotes({
        person: 'Test Person',
        numberOfQuotes: 1
      });
      
      expect(result.quotes[0]?.text).toBe('Quote without source');
      expect(result.quotes[0]?.source).toBeUndefined();
    });
  });
  
  describe('getQuotes helper function', () => {
    it('should return array of quotes directly', async () => {
      const mockSearchResults: SerperSearchResult[] = [
        { snippet: '"Test quote"', link: 'https://example.com' }
      ];
      
      mockClient.buildQuoteSearchQuery.mockReturnValue('search query');
      mockClient.searchQuotes.mockResolvedValue(mockSearchResults);
      mockClient.extractQuoteFromSnippet.mockReturnValue('Test quote');
      
      const quotes = await getQuotes({
        person: 'Test Person',
        numberOfQuotes: 1
      });
      
      expect(Array.isArray(quotes)).toBe(true);
      expect(quotes).toHaveLength(1);
      expect(quotes[0]?.text).toBe('Test quote');
    });
  });
});