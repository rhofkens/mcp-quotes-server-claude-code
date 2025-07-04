/**
 * MCP Quotes Server - Resources Index
 * 
 * Exports all MCP resources for quote collections.
 * Resources provide access to quote collections and metadata.
 */

import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { promptTemplateResource, promptTemplateHandler } from './promptTemplate.js';

// Resource handler type
export type ResourceHandler = (uri: string) => Promise<unknown>;

// Resource registry interface
export interface ResourceRegistry {
  [resourceUri: string]: {
    definition: Resource;
    handler: ResourceHandler;
  };
}

/**
 * Registry of all available resources
 * Easy to extend with new resources
 */
export const resourceRegistry: ResourceRegistry = {
  'quote-prompt://default': {
    definition: promptTemplateResource,
    handler: promptTemplateHandler
  }
  // Add more resources here as they are implemented:
  // 'quotes://all': { definition: allQuotesResource, handler: handleAllQuotes },
  // 'quotes://by-id': { definition: quoteByIdResource, handler: handleQuoteById },
  // 'quotes://by-author': { definition: quotesByAuthorResource, handler: handleQuotesByAuthor },
  // 'quotes://by-tag': { definition: quotesByTagResource, handler: handleQuotesByTag }
};

// Export resource definitions for registration
export const resources = Object.values(resourceRegistry).map(r => r.definition);

// Export individual resources for direct access
export { promptTemplateResource, promptTemplateHandler } from './promptTemplate.js';