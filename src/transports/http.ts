/**
 * HTTP Transport for MCP Server
 * 
 * Implements the Streamable HTTP transport (2025-03-26 spec)
 * with a single POST endpoint for all MCP communication
 */


import { randomUUID } from 'crypto';

import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import type { Express, RequestHandler, Response as ExpressResponse } from 'express';

import { logger } from '../utils/logger.js';

interface IHttpTransportOptions {
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
  private server: ReturnType<Express['listen']> | undefined;
  private sessions: Map<string, {
    pendingResponses: Map<string | number, (response: JSONRPCMessage) => void>;
  }> = new Map();
  private currentResponse?: ExpressResponse;
  private isStarted = false;
  
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
  
  constructor(private options: IHttpTransportOptions) {
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
    const mcpHandler: RequestHandler = (req, res): void => {
      try {
        const sessionId = req.headers['mcp-session-id'] as string;
        const message = req.body as JSONRPCMessage;
        
        logger.debug('HTTP transport received message', { 
          sessionId, 
          method: 'method' in message ? (message as {method: string}).method : undefined,
          id: 'id' in message ? (message as {id: string | number}).id : undefined,
          headers: req.headers
        });
        
        // Handle initialization specially
        if ('method' in message && (message as {method: string}).method === 'initialize') {
          const newSessionId = randomUUID();
          
          // Create session
          this.sessions.set(newSessionId, {
            pendingResponses: new Map()
          });
          
          // Process the initialize message
          if (this.onmessage) {
            // For initialization, we'll handle the response directly
            this.currentResponse = res;
            const messageId = 'id' in message ? (message as {id: string | number}).id : undefined;
            
            // Store response handler for this specific request
            const session = this.sessions.get(newSessionId)!;
            session.pendingResponses.set(messageId, (response: JSONRPCMessage) => {
              logger.debug('Sending initialize response', { 
                sessionId: newSessionId,
                responseId: 'id' in response ? (response as {id: string | number}).id : undefined 
              });
              res.setHeader('Mcp-Session-Id', newSessionId);
              res.json(response);
              session.pendingResponses.delete(messageId);
            });
            
            // Send the message to the MCP server
            this.onmessage(message);
            return;
          } else {
            res.status(500).json({
              jsonrpc: '2.0',
              id: 'id' in message ? (message as {id: string | number}).id : undefined,
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
              id: 'id' in message ? (message as {id: string | number}).id : null,
              error: {
                code: -32603,
                message: 'Missing or invalid Mcp-Session-Id header'
              }
            });
            return;
          }
          
          // Process the message
          const session = this.sessions.get(sessionId)!;
          
          if (this.onmessage) {
            // For request messages that expect a response
            if ('id' in message && message.id !== null) {
              const messageId = message.id;
              
              // Store response handler for this specific request
              session.pendingResponses.set(messageId, (response: JSONRPCMessage) => {
                logger.debug('Sending response', { 
                  sessionId,
                  method: 'method' in message ? (message as {method: string}).method : undefined,
                  responseId: 'id' in response ? (response as {id: string | number}).id : undefined 
                });
                res.json(response);
                session.pendingResponses.delete(messageId);
              });
              
              // Set current response for immediate handling
              this.currentResponse = res;
              
              // Send the message to the MCP server
              this.onmessage(message);
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
              id: 'id' in message ? (message as {id: string | number}).id : null,
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
          id: (req.body && typeof req.body === 'object' && 'id' in req.body) ? (req.body as {id: string | number}).id : null,
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
  
  start(): Promise<void> {
    if (this.isStarted) {
      logger.warn('HTTP transport already started');
      return;
    }
    
    // Log startup immediately
    logger.info('Starting HTTP transport...');
    
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.options.port, this.options.host, () => {
          if (this.isStarted) {
            // Prevent duplicate startup messages
            return;
          }
          this.isStarted = true;
          
          const url = `http://${this.options.host}:${this.options.port}${this.options.path}`;
          logger.info('HTTP transport started', {
            host: this.options.host,
            port: this.options.port,
            path: this.options.path,
            url
          });
          logger.info(`MCP HTTP Server listening at ${url}`);
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
  
  close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('HTTP transport closed');
          this.sessions.clear();
          this.isStarted = false;
          this.onclose?.();
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
  
  send(message: JSONRPCMessage): void {
    // This is called by the MCP server to send messages to clients
    logger.debug('HTTP transport send called', { 
      method: 'method' in message ? (message as {method: string}).method : undefined,
      id: 'id' in message ? (message as {id: string | number}).id : undefined
    });
    
    // For responses (they have an id but no method)
    if ('id' in message && message.id !== null && !('method' in message)) {
      // Find the pending response handler across all sessions
      for (const [sessionId, session] of this.sessions) {
        const handler = session.pendingResponses.get(message.id);
        if (handler) {
          logger.debug('Found response handler for message', { id: message.id, sessionId });
          handler(message);
          return;
        }
      }
      
      // If we have a current response object (for immediate responses)
      if (this.currentResponse && !this.currentResponse.headersSent) {
        logger.debug('Using current response object', { id: message.id });
        this.currentResponse.json(message);
        delete this.currentResponse;
        return;
      }
      
      logger.warn('No handler found for response', { id: message.id });
    }
    
    // For server-initiated messages (notifications)
    // These would need to be queued or sent via SSE if we supported it
    logger.debug('Server-initiated message (not supported in basic HTTP)', message);
  }
}