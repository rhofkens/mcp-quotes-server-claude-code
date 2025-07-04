/**
 * MCP Quotes Server - Prompt Template Resource
 * 
 * Provides a structured template for formatting quote requests
 * to ensure consistent interaction with the quote retrieval tool.
 */

import type { Resource } from '@modelcontextprotocol/sdk/types.js';

/**
 * Prompt template structure with variables and metadata
 */
interface PromptTemplateData {
  template: string;
  variables: {
    person: {
      description: string;
      required: boolean;
      examples: string[];
    };
    numberOfQuotes: {
      description: string;
      required: boolean;
      default: number;
      minimum: number;
      maximum: number;
    };
    topic: {
      description: string;
      required: boolean;
      examples: string[];
    };
  };
  instructions: string;
  exampleUsage: {
    request: string;
    expectedFormat: string;
  };
}

/**
 * Handler function for the prompt template resource
 * Returns a structured template for quote requests
 */
export async function promptTemplateHandler(): Promise<string> {
  const templateData: PromptTemplateData = {
    template: "Find {numberOfQuotes} quotes from {person} {topic}. Return them in a structured format with proper attribution.",
    variables: {
      person: {
        description: "The person whose quotes you want to retrieve. Can be any famous or notable individual.",
        required: true,
        examples: ["Albert Einstein", "Maya Angelou", "Steve Jobs", "Marie Curie"]
      },
      numberOfQuotes: {
        description: "The number of quotes to retrieve. Must be between 1 and 10.",
        required: true,
        default: 3,
        minimum: 1,
        maximum: 10
      },
      topic: {
        description: "Optional topic to filter quotes. When provided, quotes will be related to this subject.",
        required: false,
        examples: ["success", "innovation", "life", "education", "happiness"]
      }
    },
    instructions: "To use this template, replace the variables in curly braces with your desired values. The 'topic' variable is optional - if not specified, use: 'Find {numberOfQuotes} quotes from {person}.' If a topic is specified, use: 'Find {numberOfQuotes} quotes from {person} about {topic}.'",
    exampleUsage: {
      request: "Find 3 quotes from Albert Einstein about imagination.",
      expectedFormat: "1. \"Imagination is more important than knowledge.\" - Albert Einstein\n2. \"The true sign of intelligence is not knowledge but imagination.\" - Albert Einstein\n3. \"Logic will get you from A to B. Imagination will take you everywhere.\" - Albert Einstein"
    }
  };

  return JSON.stringify(templateData, null, 2);
}

/**
 * Resource definition for the prompt template
 */
export const promptTemplateResource: Resource = {
  uri: "quotes://prompt-template",
  name: "Quote Request Template",
  description: "A structured template for formatting quote requests with proper parameters and examples",
  mimeType: "application/json"
};

/**
 * Export the complete resource definition with handler
 */
export const promptTemplateResourceDefinition = {
  ...promptTemplateResource,
  handler: promptTemplateHandler
};