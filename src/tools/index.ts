/**
 * MCP Quotes Server - Tools Index
 *
 * Exports all MCP tools for quote management.
 * Tools provide the main functionality for interacting with quotes.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js'

import { getQuotesTool, handleGetQuotes } from './getQuotes.js'
import { getResilientQuotesTool, handleGetResilientQuotes } from './getResilientQuotes.js'

// Tool handler type
export type ToolHandler = (args: unknown) => Promise<unknown>

// Tool registry interface
export interface IToolRegistry {
  [toolName: string]: {
    definition: Tool
    handler: ToolHandler
  }
}

/**
 * Registry of all available tools
 * Easy to extend with new tools
 */
export const toolRegistry: IToolRegistry = {
  getQuotes: {
    definition: getQuotesTool,
    handler: handleGetQuotes,
  },
  getResilientQuotes: {
    definition: getResilientQuotesTool,
    handler: handleGetResilientQuotes,
  },
  // Add more tools here as they are implemented:
  // searchQuotes: { definition: searchQuotesTool, handler: handleSearchQuotes },
  // createQuote: { definition: createQuoteTool, handler: handleCreateQuote },
  // updateQuote: { definition: updateQuoteTool, handler: handleUpdateQuote },
  // deleteQuote: { definition: deleteQuoteTool, handler: handleDeleteQuote },
  // getRandomQuote: { definition: getRandomQuoteTool, handler: handleGetRandomQuote },
  // importQuote: { definition: importQuoteTool, handler: handleImportQuote }
}

// Export tool definitions for registration
export const tools = Object.values(toolRegistry).map((t) => t.definition)

// Export individual tools for direct access
export { getQuotesTool, handleGetQuotes } from './getQuotes.js'
export {
  getResilientQuotesTool,
  handleGetResilientQuotes,
  getQuotesHealthStatus,
  prewarmQuotesCache,
} from './getResilientQuotes.js'
