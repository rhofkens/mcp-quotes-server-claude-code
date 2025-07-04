/**
 * MCP Quotes Server - Main Entry Point
 * 
 * This is the main entry point for the MCP Quotes Server.
 * It initializes and starts the server to provide quote management functionality.
 */

import { QuotesServer } from './server.js';
import { logger } from './utils/logger.js';

async function main() {
  try {
    logger.info('Starting MCP Quotes Server...');
    
    // Initialize server
    const server = new QuotesServer();
    
    // Start server
    await server.start();
    
    logger.info('MCP Quotes Server started successfully');
  } catch (error) {
    logger.error('Failed to start MCP Quotes Server:', error);
    process.exit(1);
  }
}

// Run the server
main();