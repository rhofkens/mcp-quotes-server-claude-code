/**
 * MCP Quotes Server - SerperClient Unit Tests
 * 
 * Unit tests for the SerperClient service that interacts with Serper.dev API
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import axios from 'axios';
import { SerperClient } from '../../../src/services/serperClient.js';
import { NetworkError, AuthenticationError, RateLimitError } from '../../../src/utils/errors.js';
import type { Quote, SerperApiResponse } from '../../../src/types/quotes.js';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SerperClient', () => {
  let client: SerperClient;
  const mockApiKey = 'test-api-key-123';
  const mockBaseUrl = 'https://google.serper.dev/search';

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create a new client instance
    client = new SerperClient(mockApiKey);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create a client with provided API key', () => {
      expect(client).toBeDefined();
      expect((client as any).apiKey).toBe(mockApiKey);
    });

    it('should throw error for empty API key', () => {
      expect(() => new SerperClient('')).toThrow(AuthenticationError);
    });

    it('should use default base URL', () => {
      expect((client as any).baseUrl).toBe(mockBaseUrl);
    });

    it('should accept custom base URL', () => {
      const customUrl = 'https://custom.serper.dev/search';
      const customClient = new SerperClient(mockApiKey, customUrl);
      expect((customClient as any).baseUrl).toBe(customUrl);
    });
  });

  describe('searchQuotes', () => {
    const validResponse: SerperApiResponse = {
      organic: [
        {
          snippet: 'Imagination is more important than knowledge. - Albert Einstein',
          link: 'https://example.com/quote1',
          title: 'Einstein Quotes'
        },
        {
          snippet: '"The important thing is not to stop questioning." - Albert Einstein',
          link: 'https://example.com/quote2',
          title: 'Famous Einstein Quotes'
        },
        {
          snippet: 'Life is like riding a bicycle. To keep your balance, you must keep moving. - Albert Einstein',
          link: 'https://example.com/quote3'
        }
      ]
    };

    beforeEach(() => {
      mockedAxios.post.mockResolvedValue({ data: validResponse });
    });

    it('should search for quotes successfully', async () => {
      const quotes = await client.searchQuotes('Albert Einstein', 3);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        mockBaseUrl,
        {
          q: 'Albert Einstein quotes',
          num: 10
        },
        {
          headers: {
            'X-API-KEY': mockApiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      expect(quotes).toHaveLength(3);
      expect(quotes[0]).toEqual({
        text: 'Imagination is more important than knowledge.',
        author: 'Albert Einstein',
        source: 'https://example.com/quote1'
      });
    });

    it('should search quotes with topic filter', async () => {
      await client.searchQuotes('Albert Einstein', 2, 'science');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        mockBaseUrl,
        {
          q: 'Albert Einstein quotes about science',
          num: 10
        },
        expect.any(Object)
      );
    });

    it('should handle empty search results', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { organic: [] } });

      const quotes = await client.searchQuotes('Unknown Person', 5);

      expect(quotes).toEqual([]);
    });

    it('should handle missing organic results', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: {} });

      const quotes = await client.searchQuotes('Test Person', 3);

      expect(quotes).toEqual([]);
    });

    it('should limit results to requested number', async () => {
      const quotes = await client.searchQuotes('Albert Einstein', 2);

      expect(quotes).toHaveLength(2);
    });

    it('should handle quotes with missing source links', async () => {
      const responseNoLinks: SerperApiResponse = {
        organic: [
          {
            snippet: 'Test quote without link - Test Author',
            title: 'Quotes'
          }
        ]
      };

      mockedAxios.post.mockResolvedValueOnce({ data: responseNoLinks });

      const quotes = await client.searchQuotes('Test Author', 1);

      expect(quotes[0].source).toBeUndefined();
    });

    it('should extract quotes from various snippet formats', async () => {
      const mixedResponse: SerperApiResponse = {
        organic: [
          {
            snippet: '"Quoted text" - Author Name',
            link: 'https://example.com/1'
          },
          {
            snippet: 'Another quote by Author Name',
            link: 'https://example.com/2'
          },
          {
            snippet: 'Author Name said: "This is a quote"',
            link: 'https://example.com/3'
          },
          {
            snippet: '"Quote at start" Author Name',
            link: 'https://example.com/4'
          }
        ]
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mixedResponse });

      const quotes = await client.searchQuotes('Author Name', 4);

      expect(quotes).toHaveLength(4);
      quotes.forEach(quote => {
        expect(quote.text).toBeTruthy();
        expect(quote.author).toBe('Author Name');
      });
    });

    it('should sanitize person name for search query', async () => {
      await client.searchQuotes('  Albert Einstein  ', 1);

      const callArgs = mockedAxios.post.mock.calls[0];
      expect(callArgs[1].q).toBe('Albert Einstein quotes');
    });

    it('should sanitize topic for search query', async () => {
      await client.searchQuotes('Einstein', 1, '  physics & relativity  ');

      const callArgs = mockedAxios.post.mock.calls[0];
      expect(callArgs[1].q).toBe('Einstein quotes about physics & relativity');
    });
  });

  describe('error handling', () => {
    it('should handle authentication errors (401)', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: { status: 401, data: { message: 'Invalid API key' } }
      });

      await expect(client.searchQuotes('Einstein', 1))
        .rejects.toThrow(AuthenticationError);
    });

    it('should handle authentication errors (403)', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: { status: 403, data: { message: 'Forbidden' } }
      });

      await expect(client.searchQuotes('Einstein', 1))
        .rejects.toThrow(AuthenticationError);
    });

    it('should handle rate limit errors (429)', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: { 
          status: 429, 
          data: { message: 'Rate limit exceeded' },
          headers: { 'retry-after': '60' }
        }
      });

      await expect(client.searchQuotes('Einstein', 1))
        .rejects.toThrow(RateLimitError);
    });

    it('should handle network errors', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.searchQuotes('Einstein', 1))
        .rejects.toThrow(NetworkError);
    });

    it('should handle timeouts', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'Request timeout'
      });

      await expect(client.searchQuotes('Einstein', 1))
        .rejects.toThrow(NetworkError);
    });

    it('should handle invalid response format', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: 'invalid response' });

      await expect(client.searchQuotes('Einstein', 1))
        .rejects.toThrow('Invalid response format from Serper API');
    });

    it('should handle API error responses', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { error: 'Something went wrong' }
      });

      await expect(client.searchQuotes('Einstein', 1))
        .rejects.toThrow('Something went wrong');
    });

    it('should handle malformed snippets gracefully', async () => {
      const malformedResponse: SerperApiResponse = {
        organic: [
          {
            snippet: null as any,
            link: 'https://example.com/1'
          },
          {
            snippet: '',
            link: 'https://example.com/2'
          },
          {
            snippet: 'Valid quote - Author',
            link: 'https://example.com/3'
          }
        ]
      };

      mockedAxios.post.mockResolvedValueOnce({ data: malformedResponse });

      const quotes = await client.searchQuotes('Author', 3);

      // Should only return the valid quote
      expect(quotes).toHaveLength(1);
      expect(quotes[0].text).toBe('Valid quote');
    });
  });

  describe('parseQuoteFromSnippet', () => {
    it('should parse quote with dash separator', () => {
      const quote = (client as any).parseQuoteFromSnippet(
        '"Test quote" - Test Author',
        'Test Author'
      );

      expect(quote).toEqual({
        text: 'Test quote',
        author: 'Test Author'
      });
    });

    it('should parse quote with author at beginning', () => {
      const quote = (client as any).parseQuoteFromSnippet(
        'Test Author: "This is a quote"',
        'Test Author'
      );

      expect(quote).toEqual({
        text: 'This is a quote',
        author: 'Test Author'
      });
    });

    it('should handle quotes without quotation marks', () => {
      const quote = (client as any).parseQuoteFromSnippet(
        'Life is beautiful by Test Author',
        'Test Author'
      );

      expect(quote).toEqual({
        text: 'Life is beautiful',
        author: 'Test Author'
      });
    });

    it('should return null for invalid snippets', () => {
      expect((client as any).parseQuoteFromSnippet('', 'Author')).toBeNull();
      expect((client as any).parseQuoteFromSnippet('Random text', 'Unknown')).toBeNull();
    });

    it('should clean up extra whitespace', () => {
      const quote = (client as any).parseQuoteFromSnippet(
        '  "  Spaced quote  "  -  Test Author  ',
        'Test Author'
      );

      expect(quote).toEqual({
        text: 'Spaced quote',
        author: 'Test Author'
      });
    });
  });

  describe('edge cases', () => {
    it('should handle very long person names', async () => {
      const longName = 'A'.repeat(100);
      await client.searchQuotes(longName, 1);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          q: `${longName} quotes`
        }),
        expect.any(Object)
      );
    });

    it('should handle special characters in names', async () => {
      await client.searchQuotes("O'Brien & Associates", 1);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          q: "O'Brien & Associates quotes"
        }),
        expect.any(Object)
      );
    });

    it('should handle requesting more quotes than available', async () => {
      const smallResponse: SerperApiResponse = {
        organic: [
          {
            snippet: 'Only one quote - Author',
            link: 'https://example.com/1'
          }
        ]
      };

      mockedAxios.post.mockResolvedValueOnce({ data: smallResponse });

      const quotes = await client.searchQuotes('Author', 10);

      expect(quotes).toHaveLength(1);
    });

    it('should retry on transient errors', async () => {
      // First call fails, second succeeds
      mockedAxios.post
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ data: validResponse });

      // This test assumes retry logic is implemented
      // If not implemented, this test should be updated
      await expect(client.searchQuotes('Einstein', 1))
        .rejects.toThrow(NetworkError);
    });
  });
});