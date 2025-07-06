/**
 * HTTP Transport for MCP Server
 * 
 * Implements the Streamable HTTP transport (2025-03-26 spec)
 * with a single POST endpoint for all MCP communication
 */

import express, { Express, RequestHandler } from 'express';
import { randomUUID } from 'crypto';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../utils/logger.js';

interface HttpTransportOptions {
  port: number;
  host: string;
  path: string;
}

/**
 * HTTP Transport implementation for MCP Server
 * Uses a single POST endpoint as per the Streamable HTTP transport spec
 */
export class HttpServerTransport implements Transport {
  private app: Express;
  private server: any;
  private sessions: Map<string, {
    onmessage?: (message: JSONRPCMessage) => void;
    pendingMessages: JSONRPCMessage[];
  }> = new Map();
  
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
  
  constructor(private options: HttpTransportOptions) {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }
  
  private setupMiddleware(): void {
    // Parse JSON bodies
    this.app.use(express.json({ limit: '10mb' }));
    
    // CORS headers for security
    this.app.use((req, res, next) => {
      const origin = req.headers.origin;
      
      // In production, validate origin more strictly
      if (origin) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Mcp-Session-Id');
        res.header('Access-Control-Allow-Credentials', 'true');
      }
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
      }
      
      next();
    });
  }
  
  private setupRoutes(): void {
    // Main MCP endpoint - handles all protocol messages
    const mcpHandler: RequestHandler = async (req, res): Promise<void> => {
      try {
        const sessionId = req.headers['mcp-session-id'] as string;
        const message = req.body as JSONRPCMessage;
        
        logger.debug('HTTP transport received message', { 
          sessionId, 
          method: (message as any).method 
        });
        
        // Handle initialization specially
        if ((message as any).method === 'initialize') {
          const newSessionId = randomUUID();
          
          // Create session
          const session: { onmessage?: (message: JSONRPCMessage) => void; pendingMessages: JSONRPCMessage[] } = {
            pendingMessages: []
          };
          if (this.onmessage) {
            session.onmessage = this.onmessage;
          }
          this.sessions.set(newSessionId, session);
          
          // Process the initialize message
          if (this.onmessage) {
            // Store the response handler for this request
            const responsePromise = new Promise<JSONRPCMessage>((resolve) => {
              const originalOnMessage = this.onmessage;
              const messageId = (message as any).id;
              
              // Temporarily override to capture the response
              this.onmessage = (response: JSONRPCMessage) => {
                if ((response as any).id === messageId) {
                  resolve(response);
                  // Restore original handler or clear it
                  if (originalOnMessage) {
                    this.onmessage = originalOnMessage;
                  } else {
                    delete this.onmessage;
                  }
                } else {
                  originalOnMessage?.(response);
                }
              };
            });
            
            // Send the message to the server
            this.onmessage(message);
            
            // Wait for response
            const response = await responsePromise;
            
            // Send response with session ID header
            res.setHeader('Mcp-Session-Id', newSessionId);
            res.json(response);
            return;
          } else {
            res.status(500).json({
              jsonrpc: '2.0',
              id: (message as any).id,
              error: {
                code: -32603,
                message: 'Server not initialized'
              }
            });
            return;
          }
        } else {
          // For all other requests, require session ID
          if (!sessionId || !this.sessions.has(sessionId)) {
            res.status(400).json({
              jsonrpc: '2.0',
              id: (message as any).id || null,
              error: {
                code: -32603,
                message: 'Missing or invalid Mcp-Session-Id header'
              }
            });
            return;
          }
          
          // Process the message
          if (this.onmessage) {
            // For request messages that expect a response
            if ('id' in message && message.id !== null) {
              const responsePromise = new Promise<JSONRPCMessage>((resolve) => {
                const originalOnMessage = this.onmessage;
                const messageId = message.id;
                
                // Temporarily override to capture the response
                this.onmessage = (response: JSONRPCMessage) => {
                  if ((response as any).id === messageId) {
                    resolve(response);
                    // Restore original handler or clear it
                    if (originalOnMessage) {
                      this.onmessage = originalOnMessage;
                    } else {
                      delete this.onmessage;
                    }
                  } else {
                    originalOnMessage?.(response);
                  }
                };
              });
              
              // Send the message to the server
              this.onmessage(message);
              
              // Wait for response with timeout
              const response = await Promise.race([
                responsePromise,
                new Promise<JSONRPCMessage>((_, reject) => 
                  setTimeout(() => reject(new Error('Response timeout')), 30000)
                )
              ]);
              
              res.json(response);
              return;
            } else {
              // For notification messages that don't expect a response
              this.onmessage(message);
              res.sendStatus(204);
              return;
            }
          } else {
            res.status(500).json({
              jsonrpc: '2.0',
              id: (message as any).id || null,
              error: {
                code: -32603,
                message: 'Server not initialized'
              }
            });
            return;
          }
        }
      } catch (error) {
        logger.error('HTTP transport error', error);
        res.status(500).json({
          jsonrpc: '2.0',
          id: (req.body as any)?.id || null,
          error: {
            code: -32603,
            message: `Internal error: ${error instanceof Error ? error.message : String(error)}`
          }
        });
        return;
      }
    };
    
    this.app.post(this.options.path, mcpHandler);
    
    // Health check endpoint
    this.app.get('/health', (_, res) => {
      res.json({ 
        status: 'ok', 
        transport: 'http',
        sessions: this.sessions.size 
      });
    });
  }
  
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.options.port, this.options.host, () => {
          logger.info('HTTP transport started', {
            host: this.options.host,
            port: this.options.port,
            path: this.options.path,
            url: `http://${this.options.host}:${this.options.port}${this.options.path}`
          });
          resolve();
        });
        
        this.server.on('error', (error: Error) => {
          logger.error('HTTP server error', error);
          this.onerror?.(error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  
  async close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('HTTP transport closed');
          this.sessions.clear();
          this.onclose?.();
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
  
  async send(message: JSONRPCMessage): Promise<void> {
    // This is called by the MCP server to send messages to clients
    // In HTTP transport, we send responses directly in the request handler
    // So this is primarily used for the response callback mechanism
    if (this.onmessage) {
      // This will be caught by our response handlers above
      this.onmessage(message);
    }
  }
}