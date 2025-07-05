/**
 * MCP Quotes Server - Prompt Template Resource
 * 
 * Provides structured templates for formatting quote requests
 * to ensure consistent interaction with the quote retrieval tool.
 * 
 * Supports multiple template versions and variants for different use cases.
 */

import type { Resource } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../utils/logger.js';

/**
 * Prompt template metadata
 */
interface PromptTemplateMetadata {
  version: string;
  name: string;
  description: string;
  created: string;
  lastModified: string;
  category: 'basic' | 'advanced' | 'research' | 'creative';
}

/**
 * Variable definition for template placeholders
 */
interface TemplateVariable {
  description: string;
  required: boolean;
  type: 'string' | 'number' | 'array';
  default?: any;
  examples: string[];
  constraints?: {
    minimum?: number;
    maximum?: number;
    enum?: string[];
    pattern?: string;
  };
}

/**
 * Prompt template structure with variables and metadata
 */
interface PromptTemplateData {
  metadata: PromptTemplateMetadata;
  template: string;
  variables: Record<string, TemplateVariable>;
  instructions: string;
  examples: Array<{
    name: string;
    description: string;
    request: string;
    expectedFormat: string;
  }>;
  tips?: string[];
}

/**
 * Template repository - contains all available prompt templates
 */
const promptTemplates: Record<string, PromptTemplateData> = {
  'default': {
    metadata: {
      version: '1.0.0',
      name: 'Default Quote Template',
      description: 'Basic template for retrieving quotes with optional topic filtering',
      created: '2024-01-01T00:00:00Z',
      lastModified: '2024-01-01T00:00:00Z',
      category: 'basic'
    },
    template: 'Find {numberOfQuotes} quotes from {person}{topic}. Return them in a structured format with proper attribution.',
    variables: {
      person: {
        description: 'The person whose quotes you want to retrieve. Can be any famous or notable individual.',
        required: true,
        type: 'string',
        examples: ['Albert Einstein', 'Maya Angelou', 'Steve Jobs', 'Marie Curie']
      },
      numberOfQuotes: {
        description: 'The number of quotes to retrieve.',
        required: true,
        type: 'number',
        default: 3,
        examples: ['1', '3', '5'],
        constraints: {
          minimum: 1,
          maximum: 10
        }
      },
      topic: {
        description: 'Optional topic to filter quotes. Use format: " about {topic}" when provided.',
        required: false,
        type: 'string',
        default: '',
        examples: [' about success', ' about innovation', ' about life']
      }
    },
    instructions: 'Replace variables in curly braces with your desired values. The topic variable should include " about " prefix when used.',
    examples: [
      {
        name: 'Basic request without topic',
        description: 'Retrieve quotes without topic filtering',
        request: 'Find 3 quotes from Albert Einstein. Return them in a structured format with proper attribution.',
        expectedFormat: '1. "Imagination is more important than knowledge." - Albert Einstein\n2. "Life is like riding a bicycle..." - Albert Einstein\n3. "Try not to become a man of success..." - Albert Einstein'
      },
      {
        name: 'Request with topic',
        description: 'Retrieve quotes filtered by topic',
        request: 'Find 3 quotes from Maya Angelou about courage. Return them in a structured format with proper attribution.',
        expectedFormat: '1. "Courage is the most important of all the virtues..." - Maya Angelou\n2. "One isn\'t necessarily born with courage..." - Maya Angelou\n3. "Without courage we cannot practice any other virtue..." - Maya Angelou'
      }
    ],
    tips: [
      'Be specific with person names to get accurate results',
      'Common topics work better than obscure ones',
      'Keep numberOfQuotes reasonable for better quality'
    ]
  },
  'research': {
    metadata: {
      version: '1.0.0',
      name: 'Research Quote Template',
      description: 'Advanced template for academic research with source verification',
      created: '2024-01-01T00:00:00Z',
      lastModified: '2024-01-01T00:00:00Z',
      category: 'research'
    },
    template: 'Find {numberOfQuotes} verified quotes from {person} about {topic}. Include source, date, and context for each quote. Prioritize primary sources.',
    variables: {
      person: {
        description: 'The person whose quotes you want to retrieve with full name.',
        required: true,
        type: 'string',
        examples: ['Albert Einstein', 'Winston Churchill', 'Virginia Woolf']
      },
      numberOfQuotes: {
        description: 'Number of verified quotes to retrieve.',
        required: true,
        type: 'number',
        default: 5,
        examples: ['3', '5', '7'],
        constraints: {
          minimum: 1,
          maximum: 15
        }
      },
      topic: {
        description: 'Specific topic or theme for the quotes.',
        required: true,
        type: 'string',
        examples: ['scientific method', 'democracy', 'human nature']
      }
    },
    instructions: 'This template is designed for academic research. It requests verified quotes with full source attribution.',
    examples: [
      {
        name: 'Academic research query',
        description: 'Retrieve verified quotes with full attribution',
        request: 'Find 5 verified quotes from Charles Darwin about evolution. Include source, date, and context for each quote. Prioritize primary sources.',
        expectedFormat: '1. "It is not the strongest of the species that survives..." - Charles Darwin\n   Source: On the Origin of Species (1859), Chapter 4\n   Context: Discussing natural selection and adaptation\n   Date: November 24, 1859'
      }
    ],
    tips: [
      'Use full names for better accuracy',
      'Specify academic or professional topics',
      'Results include source verification'
    ]
  },
  'creative': {
    metadata: {
      version: '1.0.0',
      name: 'Creative Writing Template',
      description: 'Template optimized for finding inspirational quotes for creative projects',
      created: '2024-01-01T00:00:00Z',
      lastModified: '2024-01-01T00:00:00Z',
      category: 'creative'
    },
    template: 'Find {numberOfQuotes} inspirational quotes {sources} about {theme}. Focus on quotes that evoke emotion and creativity. Group by mood or tone.',
    variables: {
      numberOfQuotes: {
        description: 'Number of inspirational quotes.',
        required: true,
        type: 'number',
        default: 7,
        examples: ['5', '7', '10'],
        constraints: {
          minimum: 3,
          maximum: 20
        }
      },
      sources: {
        description: 'Source specification for quotes.',
        required: false,
        type: 'string',
        default: 'from various artists and writers',
        examples: ['from poets', 'from novelists', 'from musicians', 'from various artists and writers'],
        constraints: {}
      },
      theme: {
        description: 'Creative theme or mood.',
        required: true,
        type: 'string',
        examples: ['creativity and imagination', 'overcoming obstacles', 'finding beauty in everyday life']
      }
    },
    instructions: 'Ideal for writers, artists, and creative professionals seeking inspiration.',
    examples: [
      {
        name: 'Creative inspiration',
        description: 'Find quotes to inspire creative work',
        request: 'Find 7 inspirational quotes from various artists and writers about creativity and imagination. Focus on quotes that evoke emotion and creativity. Group by mood or tone.',
        expectedFormat: '**Quotes about Creative Vision:**\n1. "Every artist was first an amateur." - Ralph Waldo Emerson\n2. "Creativity takes courage." - Henri Matisse\n\n**Quotes about the Creative Process:**\n3. "The way to get started is to quit talking and begin doing." - Walt Disney'
      }
    ]
  }
};

/**
 * Handler function for the prompt template resource
 * Returns structured templates based on the requested URI
 */
export async function promptTemplateHandler(uri: string): Promise<string> {
  logger.info('Prompt template requested', { uri });
  
  // Parse the URI to extract template identifier
  const uriParts = uri.split('/');
  const templateId = uriParts[uriParts.length - 1] || 'default';
  
  // Handle special URIs
  if (templateId === 'list') {
    // Return a list of all available templates
    const templateList = Object.keys(promptTemplates).map(id => {
      const template = promptTemplates[id];
      return template ? {
        id,
        ...template.metadata
      } : { id };
    });
    return JSON.stringify(templateList, null, 2);
  }
  
  // Get the requested template
  const template = promptTemplates[templateId];
  
  if (!template) {
    // Return available template IDs if not found
    const availableTemplates = Object.keys(promptTemplates);
    throw new Error(`Template '${templateId}' not found. Available templates: ${availableTemplates.join(', ')}`);
  }
  
  logger.info('Returning prompt template', { templateId, name: template.metadata.name });
  return JSON.stringify(template, null, 2);
}

/**
 * Generate resource definitions for all templates
 */
function generateResourceDefinitions(): Resource[] {
  const resources: Resource[] = [];
  
  // Add a resource for listing all templates
  resources.push({
    uri: 'quote-prompt://list',
    name: 'List Available Prompt Templates',
    description: 'Returns a list of all available prompt templates with their metadata',
    mimeType: 'application/json'
  });
  
  // Add individual resources for each template
  Object.keys(promptTemplates).forEach(templateId => {
    const template = promptTemplates[templateId];
    if (template) {
      resources.push({
        uri: `quote-prompt://${templateId}`,
        name: template.metadata.name,
        description: template.metadata.description,
        mimeType: 'application/json'
      });
    }
  });
  
  return resources;
}

/**
 * Export all prompt template resources
 */
export const promptTemplateResources = generateResourceDefinitions();

/**
 * Primary resource definition for backward compatibility
 */
export const promptTemplateResource: Resource = {
  uri: 'quote-prompt://default',
  name: 'Default Quote Request Template',
  description: 'Basic template for formatting quote requests with proper parameters and examples',
  mimeType: 'application/json'
};

// Handler is already exported as a named export above