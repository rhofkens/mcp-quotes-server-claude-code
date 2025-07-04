/**
 * MCP Quotes Server - Main Entry Point
 * 
 * This is the main entry point for the MCP Quotes Server.
 * It initializes and starts the server to provide quote management functionality.
 */

import { QuotesServer } from './server.js';
import { logger } from './utils/logger.js';
import { getConfig } from './utils/config.js';
import { config as dotenvConfig } from 'dotenv';

// Load environment variables
dotenvConfig();

// Global server instance
let server: QuotesServer | null = null;

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  if (server) {
    try {
      await server.stop();
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
  }
  
  process.exit(0);
}

/**
 * Main function to start the server
 */
async function main() {
  try {
    // Check for required configuration
    try {
      const config = getConfig();
      if (!config.serperApiKey) {
        logger.warn('SERPER_API_KEY not configured. The getQuotes tool will not work without it.');
        logger.info('To configure: Set SERPER_API_KEY environment variable or add it to .env file');
      }
    } catch (error) {
      logger.warn('Configuration validation warning:', error);
      logger.info('Some features may not work without proper configuration');
    }
    
    // Initialize server
    server = new QuotesServer();
    
    // Register shutdown handlers
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGHUP', () => shutdown('SIGHUP'));
    
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      shutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
    
    // Start server
    await server.start();
    
    // Keep the process alive
    process.stdin.resume();
    
  } catch (error) {
    logger.error('Failed to start MCP Quotes Server:', error);
    process.exit(1);
  }
}

// Run the server
main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});