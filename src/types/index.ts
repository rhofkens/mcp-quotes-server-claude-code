/**
 * Type definitions for MCP Quotes Server
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

/**
 * Server configuration options
 */
export interface ServerConfig {
  name: string;
  version: string;
  description?: string;
  capabilities?: ServerCapabilities;
}

/**
 * Server capabilities configuration
 */
export interface ServerCapabilities {
  tools?: boolean;
  resources?: boolean;
  prompts?: boolean;
  sampling?: boolean;
}

/**
 * Server state management
 */
export enum ServerState {
  IDLE = 'idle',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  ERROR = 'error'
}

/**
 * Server lifecycle events
 */
export interface ServerLifecycle {
  onStart?: () => Promise<void>;
  onStop?: () => Promise<void>;
  onError?: (error: Error) => Promise<void>;
  onConnectionStateChange?: (connected: boolean) => void;
}

/**
 * Export MCP SDK types for convenience
 */
export type { Server, StdioServerTransport };

/**
 * Export quote-related types
 */
export * from './quotes.js';

/**
 * Error types for the server
 */
export class MCPServerError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'MCPServerError';
  }
}

export class ServerInitializationError extends MCPServerError {
  constructor(message: string) {
    super(message, 'INIT_ERROR');
    this.name = 'ServerInitializationError';
  }
}

export class ServerShutdownError extends MCPServerError {
  constructor(message: string) {
    super(message, 'SHUTDOWN_ERROR');
    this.name = 'ServerShutdownError';
  }
}