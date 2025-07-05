/**
 * MCP Quotes Server
 * 
 * Main server implementation using MCP SDK
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { logger } from './utils/logger.js';
import { toolRegistry } from './tools/index.js';
import { resourceRegistry } from './resources/index.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

// Load package.json
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

export class QuotesServer {
  private server: Server;
  private transport: StdioServerTransport;
  
  constructor() {
    logger.info('Creating MCP Quotes Server', {
      name: packageJson.name,
      version: packageJson.version
    });
    
    // Initialize MCP Server
    this.server = new Server(
      {
        name: packageJson.name,
        version: packageJson.version
      },
      {
        capabilities: {
          tools: {},
          resources: {}
        }
      }
    );
    
    // Initialize STDIO transport
    this.transport = new StdioServerTransport();
    
    // Register handlers
    this.registerHandlers();
  }
  
  private registerHandlers(): void {
    // Tool call handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      logger.info('Tool call received', { tool: name, args });
      
      const tool = toolRegistry[name];
      if (!tool) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
      }
      
      try {
        const result = await tool.handler(args);
        logger.info('Tool call succeeded', { tool: name });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        logger.error('Tool call failed', { tool: name, error });
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
    
    // Resource list handler
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      logger.info('Listing resources');
      return {
        resources: Object.values(resourceRegistry).map(r => r.definition)
      };
    });
    
    // Resource read handler
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      logger.info('Resource read requested', { uri });
      
      const resource = resourceRegistry[uri];
      if (!resource) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown resource: ${uri}`
        );
      }
      
      try {
        const result = await resource.handler(uri);
        logger.info('Resource read succeeded', { uri });
        return {
          contents: [
            {
              uri,
              mimeType: resource.definition.mimeType || 'application/json',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        logger.error('Resource read failed', { uri, error });
        throw new McpError(
          ErrorCode.InternalError,
          `Resource read failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
    
    // Register all tools
    const toolList = Object.values(toolRegistry).map(t => t.definition);
    toolList.forEach(tool => {
      logger.info('Registered tool', { name: tool.name });
    });
    
    // Register all resources
    const resourceList = Object.values(resourceRegistry).map(r => r.definition);
    resourceList.forEach(resource => {
      logger.info('Registered resource', { uri: resource.uri });
    });
  }
  
  async start(): Promise<void> {
    logger.info('Starting MCP Quotes Server...');
    
    try {
      // Connect the transport to the server
      await this.server.connect(this.transport);
      
      logger.info('MCP Quotes Server started successfully', {
        tools: Object.keys(toolRegistry),
        resources: Object.keys(resourceRegistry)
      });
    } catch (error) {
      logger.error('Failed to start server', error);
      throw error;
    }
  }
  
  async stop(): Promise<void> {
    logger.info('Stopping MCP Quotes Server...');
    
    try {
      await this.server.close();
      logger.info('MCP Quotes Server stopped successfully');
    } catch (error) {
      logger.error('Error stopping server', error);
      throw error;
    }
  }
}

/**
 * Factory function to create a quotes server instance
 */
export async function createQuotesServer(): Promise<QuotesServer> {
  return new QuotesServer();
}