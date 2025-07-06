/**
 * MCP Quotes Server - Resources Index
 * 
 * Exports all MCP resources for quote collections.
 * Resources provide access to quote collections and metadata.
 */

import type { Resource } from '@modelcontextprotocol/sdk/types.js';

import { promptTemplateHandler, promptTemplateResources } from './promptTemplate.js';

// Resource handler type
export type ResourceHandler = (uri: string) => Promise<unknown>;

// Resource registry interface
export interface IResourceRegistry {
  [resourceUri: string]: {
    definition: Resource;
    handler: ResourceHandler;
  };
}

/**
 * Build the resource registry dynamically
 */
function buildResourceRegistry(): IResourceRegistry {
  const registry: IResourceRegistry = {};
  
  // Register all prompt template resources
  promptTemplateResources.forEach(resource => {
    registry[resource.uri] = {
      definition: resource,
      handler: promptTemplateHandler
    };
  });
  
  // Future resources can be added here:
  // Quote collection resources
  // 'quotes://all': { definition: allQuotesResource, handler: handleAllQuotes },
  // 'quotes://by-id/{id}': { definition: quoteByIdResource, handler: handleQuoteById },
  // 'quotes://by-author/{author}': { definition: quotesByAuthorResource, handler: handleQuotesByAuthor },
  // 'quotes://by-tag/{tag}': { definition: quotesByTagResource, handler: handleQuotesByTag }
  
  return registry;
}

/**
 * Registry of all available resources
 * Dynamically built to include all template variations
 */
export const resourceRegistry: IResourceRegistry = buildResourceRegistry();

// Export resource definitions for registration
export const resources = Object.values(resourceRegistry).map(r => r.definition);

// Export individual resources and utilities for direct access
export { promptTemplateHandler, promptTemplateResources } from './promptTemplate.js';