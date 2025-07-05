/**
 * MCP Quotes Server - Template Repository
 * 
 * In-memory repository for managing quote templates
 */

import {
  QuoteTemplate,
  TemplateCategory,
  VariableType,
  OutputFormat,
  TemplateRepository,
  TemplateSearchQuery,
  TemplateVersion
} from '../../types/templates.js';
import { logger } from '../../utils/logger.js';
import { TemplateValidator } from './validators/templateValidator.js';

/**
 * In-memory template repository implementation
 */
export class InMemoryTemplateRepository implements TemplateRepository {
  private templates: Map<string, QuoteTemplate> = new Map();
  private versions: Map<string, TemplateVersion[]> = new Map();

  constructor() {
    // Initialize with default templates
    this.initializeDefaultTemplates();
  }

  /**
   * Get template by ID and optional version
   */
  async getTemplate(id: string, version?: string): Promise<QuoteTemplate | null> {
    if (version) {
      const versionHistory = this.versions.get(id);
      if (versionHistory) {
        const templateVersion = versionHistory.find(v => v.version === version);
        return templateVersion?.template || null;
      }
      return null;
    }

    return this.templates.get(id) || null;
  }

  /**
   * List templates by category
   */
  async listByCategory(category: TemplateCategory): Promise<QuoteTemplate[]> {
    const templates: QuoteTemplate[] = [];
    
    for (const template of this.templates.values()) {
      if (template.metadata.category === category && !template.metadata.deprecated) {
        templates.push(template);
      }
    }

    return templates.sort((a, b) => 
      a.metadata.name.localeCompare(b.metadata.name)
    );
  }

  /**
   * Search templates
   */
  async searchTemplates(query: TemplateSearchQuery): Promise<QuoteTemplate[]> {
    let templates = Array.from(this.templates.values());

    // Filter by text search
    if (query.text) {
      const searchText = query.text.toLowerCase();
      templates = templates.filter(t => 
        t.metadata.name.toLowerCase().includes(searchText) ||
        t.metadata.description.toLowerCase().includes(searchText) ||
        t.metadata.tags.some(tag => tag.toLowerCase().includes(searchText))
      );
    }

    // Filter by categories
    if (query.categories && query.categories.length > 0) {
      templates = templates.filter(t => 
        query.categories!.includes(t.metadata.category)
      );
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      templates = templates.filter(t => 
        query.tags!.some(tag => t.metadata.tags.includes(tag))
      );
    }

    // Filter by author
    if (query.author) {
      templates = templates.filter(t => 
        t.metadata.author.toLowerCase().includes(query.author!.toLowerCase())
      );
    }

    // Filter deprecated
    if (!query.includeDeprecated) {
      templates = templates.filter(t => !t.metadata.deprecated);
    }

    // Sort
    if (query.sortBy) {
      templates.sort((a, b) => {
        let comparison = 0;
        
        switch (query.sortBy) {
          case 'name':
            comparison = a.metadata.name.localeCompare(b.metadata.name);
            break;
          case 'createdAt':
            comparison = a.metadata.createdAt.getTime() - b.metadata.createdAt.getTime();
            break;
          case 'updatedAt':
            comparison = a.metadata.updatedAt.getTime() - b.metadata.updatedAt.getTime();
            break;
          case 'usage':
            comparison = (a.metadata.usageStats?.totalUses || 0) - (b.metadata.usageStats?.totalUses || 0);
            break;
        }

        return query.sortDirection === 'desc' ? -comparison : comparison;
      });
    }

    // Pagination
    const offset = query.offset || 0;
    const limit = query.limit || templates.length;
    
    return templates.slice(offset, offset + limit);
  }

  /**
   * Save template
   */
  async saveTemplate(template: QuoteTemplate): Promise<void> {
    // Validate template
    const validation = TemplateValidator.validate(template);
    if (!validation.isValid) {
      throw new Error(`Template validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const existingTemplate = this.templates.get(template.metadata.id);
    
    // Update timestamp
    template.metadata.updatedAt = new Date();
    if (!existingTemplate) {
      template.metadata.createdAt = new Date();
    }

    // Save version history
    if (existingTemplate && existingTemplate.metadata.version !== template.metadata.version) {
      const versionHistory = this.versions.get(template.metadata.id) || [];
      
      // Mark old version as not current
      versionHistory.forEach(v => v.isCurrent = false);
      
      // Add new version
      versionHistory.push({
        version: template.metadata.version,
        template: { ...template },
        changeDescription: `Updated from version ${existingTemplate.metadata.version}`,
        author: template.metadata.author,
        date: new Date(),
        isCurrent: true
      });
      
      this.versions.set(template.metadata.id, versionHistory);
    }

    // Save template
    this.templates.set(template.metadata.id, template);
    
    logger.info('Template saved', {
      id: template.metadata.id,
      name: template.metadata.name,
      version: template.metadata.version
    });
  }

  /**
   * Get version history
   */
  async getVersionHistory(id: string): Promise<TemplateVersion[]> {
    return this.versions.get(id) || [];
  }

  /**
   * Initialize default templates
   */
  private initializeDefaultTemplates(): void {
    const defaultTemplates: QuoteTemplate[] = [
      {
        metadata: {
          id: 'basic-quote-request',
          name: 'Basic Quote Request',
          description: 'Simple template for requesting quotes from a specific person',
          category: TemplateCategory.INSPIRATIONAL,
          tags: ['basic', 'simple', 'quotes'],
          author: 'MCP Quotes Server',
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0'
        },
        content: 'Find {numberOfQuotes} quotes from {person}.',
        variables: [
          {
            name: 'person',
            displayName: 'Person',
            description: 'The person whose quotes you want to retrieve',
            type: VariableType.STRING,
            required: true,
            examples: ['Albert Einstein', 'Maya Angelou', 'Steve Jobs']
          },
          {
            name: 'numberOfQuotes',
            displayName: 'Number of Quotes',
            description: 'How many quotes to retrieve',
            type: VariableType.NUMBER,
            required: true,
            defaultValue: 3,
            validation: {
              min: 1,
              max: 10,
              errorMessage: 'Number of quotes must be between 1 and 10'
            }
          }
        ],
        outputFormat: {
          format: OutputFormat.TEXT
        }
      },
      {
        metadata: {
          id: 'topic-filtered-quotes',
          name: 'Topic-Filtered Quote Request',
          description: 'Template for requesting quotes filtered by topic',
          category: TemplateCategory.INSPIRATIONAL,
          tags: ['filtered', 'topic', 'quotes'],
          author: 'MCP Quotes Server',
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0'
        },
        content: 'Find {numberOfQuotes} quotes from {person} about {topic}.',
        variables: [
          {
            name: 'person',
            displayName: 'Person',
            description: 'The person whose quotes you want to retrieve',
            type: VariableType.STRING,
            required: true,
            examples: ['Albert Einstein', 'Maya Angelou', 'Steve Jobs']
          },
          {
            name: 'numberOfQuotes',
            displayName: 'Number of Quotes',
            description: 'How many quotes to retrieve',
            type: VariableType.NUMBER,
            required: true,
            defaultValue: 3,
            validation: {
              min: 1,
              max: 10
            }
          },
          {
            name: 'topic',
            displayName: 'Topic',
            description: 'Topic to filter quotes by',
            type: VariableType.STRING,
            required: true,
            examples: ['success', 'innovation', 'life', 'education']
          }
        ],
        outputFormat: {
          format: OutputFormat.TEXT
        }
      },
      {
        metadata: {
          id: 'motivational-daily-quotes',
          name: 'Daily Motivational Quotes',
          description: 'Template for daily motivational quote collection',
          category: TemplateCategory.MOTIVATIONAL,
          tags: ['daily', 'motivational', 'collection'],
          author: 'MCP Quotes Server',
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0'
        },
        content: 'Generate a collection of {numberOfQuotes} motivational quotes for {dayOfWeek} focusing on {theme}.',
        variables: [
          {
            name: 'numberOfQuotes',
            displayName: 'Number of Quotes',
            description: 'How many quotes to include',
            type: VariableType.NUMBER,
            required: true,
            defaultValue: 5,
            validation: {
              min: 3,
              max: 10
            }
          },
          {
            name: 'dayOfWeek',
            displayName: 'Day of Week',
            description: 'The day these quotes are for',
            type: VariableType.ENUM,
            required: true,
            enumValues: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            defaultValue: 'Monday'
          },
          {
            name: 'theme',
            displayName: 'Theme',
            description: 'Motivational theme',
            type: VariableType.STRING,
            required: true,
            examples: ['productivity', 'perseverance', 'growth', 'leadership'],
            defaultValue: 'productivity'
          }
        ],
        outputFormat: {
          format: OutputFormat.MARKDOWN,
          options: {
            title: 'Daily Motivational Quotes',
            includeHeader: true
          }
        },
        components: [
          {
            id: 'header',
            type: 'prefix',
            content: '## Motivational Quotes for {dayOfWeek}\n\nTheme: **{theme}**\n\n',
            order: 1
          }
        ]
      },
      {
        metadata: {
          id: 'business-leadership-quotes',
          name: 'Business Leadership Quotes',
          description: 'Template for business and leadership quotes',
          category: TemplateCategory.BUSINESS,
          tags: ['business', 'leadership', 'professional'],
          author: 'MCP Quotes Server',
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0'
        },
        content: 'Compile {numberOfQuotes} {style} quotes about {aspect} from successful business leaders.',
        variables: [
          {
            name: 'numberOfQuotes',
            displayName: 'Number of Quotes',
            description: 'How many quotes to retrieve',
            type: VariableType.NUMBER,
            required: true,
            defaultValue: 5,
            validation: {
              min: 1,
              max: 15
            }
          },
          {
            name: 'style',
            displayName: 'Quote Style',
            description: 'Style of quotes to retrieve',
            type: VariableType.ENUM,
            required: true,
            enumValues: ['inspirational', 'practical', 'strategic', 'motivational'],
            defaultValue: 'inspirational'
          },
          {
            name: 'aspect',
            displayName: 'Business Aspect',
            description: 'Specific aspect of business/leadership',
            type: VariableType.STRING,
            required: true,
            examples: ['innovation', 'team building', 'decision making', 'entrepreneurship'],
            defaultValue: 'leadership'
          }
        ],
        outputFormat: {
          format: OutputFormat.JSON,
          options: {
            includeMetadata: true
          }
        },
        postProcessors: [
          {
            name: 'add-attribution',
            type: 'enricher',
            options: {
              text: 'Business Leadership Quote Collection'
            },
            order: 1
          }
        ]
      }
    ];

    // Save all default templates
    defaultTemplates.forEach(template => {
      this.templates.set(template.metadata.id, template);
    });

    logger.info('Default templates initialized', {
      count: defaultTemplates.length
    });
  }
}

// Export singleton instance
export const templateRepository = new InMemoryTemplateRepository();