/**
 * MCP Quotes Server - Server Unit Tests
 * 
 * Unit tests for the main server class.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { QuotesServer } from '../../src/server.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Mock the MCP SDK Server
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(() => ({
    setRequestHandler: jest.fn(),
    start: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined)
  })),
  StdioServerTransport: jest.fn()
}));

// Mock tools
jest.mock('../../src/tools/getQuotes.js', () => ({
  getQuotesTool: {
    name: 'getQuotes',
    description: 'Search for quotes',
    inputSchema: { type: 'object' }
  },
  handleGetQuotes: jest.fn().mockResolvedValue({ quotes: [] })
}));

// Mock resources
jest.mock('../../src/resources/promptTemplate.js', () => ({
  promptTemplateResource: {
    uri: 'quote-prompt://default',
    name: 'Quote Content Prompt',
    description: 'A reusable prompt template',
    mimeType: 'text/plain'
  },
  handlePromptTemplate: jest.fn().mockResolvedValue({
    template: 'test template',
    variables: []
  })
}));

// Mock logger
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock config
jest.mock('../../src/utils/config.js', () => ({
  config: {
    server: {
      name: 'mcp-quotes-server',
      version: '1.0.0',
      description: 'MCP server for searching quotes'
    },
    serper: {
      apiKey: 'test-api-key'
    }
  }
}));

describe('QuotesServer', () => {
  let server: QuotesServer;
  let mockMcpServer: jest.Mocked<Server>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = new QuotesServer();
    mockMcpServer = (server as any).server;
  });

  afterEach(async () => {
    // Cleanup
    if (server) {
      await server.stop();
    }
  });

  describe('constructor', () => {
    it('should create a server instance', () => {
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(QuotesServer);
    });

    it('should initialize MCP server', () => {
      expect(Server).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'mcp-quotes-server',
          version: '1.0.0'
        }),
        expect.objectContaining({
          capabilities: expect.objectContaining({
            tools: {},
            resources: {}
          })
        })
      );
    });

    it('should set up request handlers', () => {
      expect(mockMcpServer.setRequestHandler).toHaveBeenCalledTimes(3);
      expect(mockMcpServer.setRequestHandler).toHaveBeenCalledWith('tools/list', expect.any(Function));
      expect(mockMcpServer.setRequestHandler).toHaveBeenCalledWith('tools/call', expect.any(Function));
      expect(mockMcpServer.setRequestHandler).toHaveBeenCalledWith('resources/list', expect.any(Function));
    });
  });

  describe('tool registration', () => {
    it('should handle tools/list request', async () => {
      const listHandler = mockMcpServer.setRequestHandler.mock.calls
        .find(call => call[0] === 'tools/list')?.[1];
      
      expect(listHandler).toBeDefined();
      
      const result = await listHandler!();
      
      expect(result).toEqual({
        tools: [
          {
            name: 'getQuotes',
            description: 'Search for quotes',
            inputSchema: { type: 'object' }
          }
        ]
      });
    });

    it('should handle tools/call request for getQuotes', async () => {
      const callHandler = mockMcpServer.setRequestHandler.mock.calls
        .find(call => call[0] === 'tools/call')?.[1];
      
      expect(callHandler).toBeDefined();
      
      const { handleGetQuotes } = require('../../src/tools/getQuotes.js');
      
      const result = await callHandler!({
        name: 'getQuotes',
        arguments: {
          person: 'Einstein',
          numberOfQuotes: 3
        }
      });
      
      expect(handleGetQuotes).toHaveBeenCalledWith({
        person: 'Einstein',
        numberOfQuotes: 3
      });
      
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Found 0 quotes')
          }
        ]
      });
    });

    it('should handle unknown tool error', async () => {
      const callHandler = mockMcpServer.setRequestHandler.mock.calls
        .find(call => call[0] === 'tools/call')?.[1];
      
      await expect(callHandler!({
        name: 'unknownTool',
        arguments: {}
      })).rejects.toThrow('Unknown tool: unknownTool');
    });

    it('should handle tool execution errors', async () => {
      const { handleGetQuotes } = require('../../src/tools/getQuotes.js');
      handleGetQuotes.mockRejectedValueOnce(new Error('API error'));
      
      const callHandler = mockMcpServer.setRequestHandler.mock.calls
        .find(call => call[0] === 'tools/call')?.[1];
      
      const result = await callHandler!({
        name: 'getQuotes',
        arguments: {
          person: 'Einstein',
          numberOfQuotes: 3
        }
      });
      
      expect(result.content[0].text).toContain('Error searching quotes');
      expect(result.content[0].text).toContain('API error');
    });
  });

  describe('resource registration', () => {
    it('should handle resources/list request', async () => {
      const listHandler = mockMcpServer.setRequestHandler.mock.calls
        .find(call => call[0] === 'resources/list')?.[1];
      
      expect(listHandler).toBeDefined();
      
      const result = await listHandler!();
      
      expect(result).toEqual({
        resources: [
          {
            uri: 'quote-prompt://default',
            name: 'Quote Content Prompt',
            description: 'A reusable prompt template',
            mimeType: 'text/plain'
          }
        ]
      });
    });

    it('should handle resources/read request for promptTemplate', async () => {
      const readHandler = mockMcpServer.setRequestHandler.mock.calls
        .find(call => call[0] === 'resources/read')?.[1];
      
      expect(readHandler).toBeDefined();
      
      const { handlePromptTemplate } = require('../../src/resources/promptTemplate.js');
      
      const result = await readHandler!({
        uri: 'quote-prompt://default'
      });
      
      expect(handlePromptTemplate).toHaveBeenCalled();
      
      expect(result).toEqual({
        contents: [
          {
            uri: 'quote-prompt://default',
            mimeType: 'text/plain',
            text: expect.any(String)
          }
        ]
      });
    });

    it('should handle unknown resource error', async () => {
      const readHandler = mockMcpServer.setRequestHandler.mock.calls
        .find(call => call[0] === 'resources/read')?.[1];
      
      await expect(readHandler!({
        uri: 'unknown://resource'
      })).rejects.toThrow('Unknown resource: unknown://resource');
    });

    it('should handle resource read errors', async () => {
      const { handlePromptTemplate } = require('../../src/resources/promptTemplate.js');
      handlePromptTemplate.mockRejectedValueOnce(new Error('Read error'));
      
      const readHandler = mockMcpServer.setRequestHandler.mock.calls
        .find(call => call[0] === 'resources/read')?.[1];
      
      await expect(readHandler!({
        uri: 'quote-prompt://default'
      })).rejects.toThrow('Read error');
    });
  });

  describe('server lifecycle', () => {
    it('should start the server', async () => {
      await server.start();
      
      expect(mockMcpServer.start).toHaveBeenCalled();
      expect((server as any).isRunning).toBe(true);
    });

    it('should not start if already running', async () => {
      await server.start();
      await server.start(); // Second call
      
      expect(mockMcpServer.start).toHaveBeenCalledTimes(1);
    });

    it('should stop the server', async () => {
      await server.start();
      await server.stop();
      
      expect(mockMcpServer.close).toHaveBeenCalled();
      expect((server as any).isRunning).toBe(false);
    });

    it('should not stop if not running', async () => {
      await server.stop();
      
      expect(mockMcpServer.close).not.toHaveBeenCalled();
    });

    it('should handle start errors', async () => {
      mockMcpServer.start.mockRejectedValueOnce(new Error('Start failed'));
      
      await expect(server.start()).rejects.toThrow('Start failed');
      expect((server as any).isRunning).toBe(false);
    });

    it('should handle stop errors', async () => {
      await server.start();
      mockMcpServer.close.mockRejectedValueOnce(new Error('Stop failed'));
      
      await expect(server.stop()).rejects.toThrow('Stop failed');
      // Server should still be marked as stopped even if close fails
      expect((server as any).isRunning).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle missing tool arguments', async () => {
      const callHandler = mockMcpServer.setRequestHandler.mock.calls
        .find(call => call[0] === 'tools/call')?.[1];
      
      await expect(callHandler!({
        name: 'getQuotes'
        // Missing arguments
      })).rejects.toThrow();
    });

    it('should handle invalid tool arguments', async () => {
      const callHandler = mockMcpServer.setRequestHandler.mock.calls
        .find(call => call[0] === 'tools/call')?.[1];
      
      const result = await callHandler!({
        name: 'getQuotes',
        arguments: 'invalid' as any // Should be an object
      });
      
      expect(result.content[0].text).toContain('Error');
    });

    it('should handle concurrent requests', async () => {
      const callHandler = mockMcpServer.setRequestHandler.mock.calls
        .find(call => call[0] === 'tools/call')?.[1];
      
      const promises = Array(5).fill(null).map(() => 
        callHandler!({
          name: 'getQuotes',
          arguments: {
            person: 'Einstein',
            numberOfQuotes: 1
          }
        })
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.content).toBeDefined();
      });
    });
  });

  describe('integration', () => {
    it('should support full tool workflow', async () => {
      // List tools
      const listHandler = mockMcpServer.setRequestHandler.mock.calls
        .find(call => call[0] === 'tools/list')?.[1];
      
      const toolsList = await listHandler!();
      expect(toolsList.tools).toHaveLength(1);
      
      // Call tool
      const callHandler = mockMcpServer.setRequestHandler.mock.calls
        .find(call => call[0] === 'tools/call')?.[1];
      
      const result = await callHandler!({
        name: toolsList.tools[0].name,
        arguments: {
          person: 'Einstein',
          numberOfQuotes: 2
        }
      });
      
      expect(result.content).toBeDefined();
    });

    it('should support full resource workflow', async () => {
      // List resources
      const listHandler = mockMcpServer.setRequestHandler.mock.calls
        .find(call => call[0] === 'resources/list')?.[1];
      
      const resourcesList = await listHandler!();
      expect(resourcesList.resources).toHaveLength(1);
      
      // Read resource
      const readHandler = mockMcpServer.setRequestHandler.mock.calls
        .find(call => call[0] === 'resources/read')?.[1];
      
      const result = await readHandler!({
        uri: resourcesList.resources[0].uri
      });
      
      expect(result.contents).toBeDefined();
      expect(result.contents[0].uri).toBe(resourcesList.resources[0].uri);
    });
  });
});