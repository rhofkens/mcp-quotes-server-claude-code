/**
 * MCP Quotes Server - Template Manager
 * 
 * Central manager for all quote templates
 */

import type {
  QuoteTemplate,
  TemplateSearchQuery,
  TemplateRenderContext,
  TemplateRenderResult,
  TemplateValidationResult
} from '../../types/templates.js';
import {
  TemplateCategory
} from '../../types/templates.js';
import { logger } from '../../utils/logger.js';

import { motivationalTemplates } from './categories/motivationalTemplates.js';
import { philosophicalTemplates } from './categories/philosophicalTemplates.js';
import { TemplateRenderer } from './generators/templateRenderer.js';
import { templateRepository } from './templateRepository.js';
import { TemplateValidator } from './validators/templateValidator.js';


/**
 * Template Manager class - singleton pattern
 */
export class TemplateManager {
  private static instance: TemplateManager;
  private initialized: boolean = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): TemplateManager {
    if (!TemplateManager.instance) {
      TemplateManager.instance = new TemplateManager();
    }
    return TemplateManager.instance;
  }

  /**
   * Initialize template manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Load all category templates
      await this.loadCategoryTemplates();
      
      this.initialized = true;
      logger.info('Template Manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Template Manager', error);
      throw error;
    }
  }

  /**
   * Load all category templates into repository
   */
  private async loadCategoryTemplates(): Promise<void> {
    const allTemplates = [
      ...motivationalTemplates,
      ...philosophicalTemplates
      // Add more category templates as they are created
    ];

    let successCount = 0;
    let failureCount = 0;

    for (const template of allTemplates) {
      try {
        await templateRepository.saveTemplate(template);
        successCount++;
      } catch (error) {
        logger.error('Failed to load template', {
          templateId: template.metadata.id,
          error: error instanceof Error ? error.message : String(error)
        });
        failureCount++;
      }
    }

    logger.info('Category templates loaded', {
      success: successCount,
      failed: failureCount,
      total: allTemplates.length
    });
  }

  /**
   * Get a template by ID
   */
  async getTemplate(id: string, version?: string): Promise<QuoteTemplate | null> {
    return templateRepository.getTemplate(id, version);
  }

  /**
   * List all templates in a category
   */
  async listByCategory(category: TemplateCategory): Promise<QuoteTemplate[]> {
    return templateRepository.listByCategory(category);
  }

  /**
   * Search templates
   */
  async searchTemplates(query: TemplateSearchQuery): Promise<QuoteTemplate[]> {
    return templateRepository.searchTemplates(query);
  }

  /**
   * Validate a template
   */
  validateTemplate(template: QuoteTemplate): TemplateValidationResult {
    return TemplateValidator.validate(template);
  }

  /**
   * Render a template
   */
  async renderTemplate(
    templateId: string,
    context: TemplateRenderContext
  ): Promise<TemplateRenderResult> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    return TemplateRenderer.render(template, context);
  }

  /**
   * Save a custom template
   */
  async saveTemplate(template: QuoteTemplate): Promise<void> {
    // Validate before saving
    const validation = this.validateTemplate(template);
    if (!validation.isValid) {
      throw new Error(
        `Template validation failed: ${validation.errors.map(e => e.message).join(', ')}`
      );
    }

    await templateRepository.saveTemplate(template);
  }

  /**
   * Get template suggestions based on context
   */
  async getTemplateSuggestions(context: {
    category?: TemplateCategory;
    tags?: string[];
    purpose?: string;
  }): Promise<QuoteTemplate[]> {
    const query: TemplateSearchQuery = {
      categories: context.category ? [context.category] : [],
      tags: context.tags || [],
      text: context.purpose || '',
      sortBy: 'usage',
      sortDirection: 'desc',
      limit: 5
    };

    return this.searchTemplates(query);
  }

  /**
   * Get all available categories
   */
  getAvailableCategories(): TemplateCategory[] {
    return Object.values(TemplateCategory);
  }

  /**
   * Get category metadata
   */
  getCategoryMetadata(category: TemplateCategory): {
    name: string;
    description: string;
    icon: string;
  } {
    const metadata: Record<TemplateCategory, { name: string; description: string; icon: string }> = {
      [TemplateCategory.MOTIVATIONAL]: {
        name: 'Motivational',
        description: 'Templates for motivational and inspiring quotes',
        icon: '💪'
      },
      [TemplateCategory.INSPIRATIONAL]: {
        name: 'Inspirational',
        description: 'Templates for uplifting and inspirational quotes',
        icon: '✨'
      },
      [TemplateCategory.BUSINESS]: {
        name: 'Business',
        description: 'Templates for business and professional quotes',
        icon: '💼'
      },
      [TemplateCategory.PHILOSOPHICAL]: {
        name: 'Philosophical',
        description: 'Templates for deep philosophical thoughts',
        icon: '🤔'
      },
      [TemplateCategory.LITERARY]: {
        name: 'Literary',
        description: 'Templates for literary and poetic quotes',
        icon: '📖'
      },
      [TemplateCategory.SCIENTIFIC]: {
        name: 'Scientific',
        description: 'Templates for scientific and discovery quotes',
        icon: '🔬'
      },
      [TemplateCategory.HISTORICAL]: {
        name: 'Historical',
        description: 'Templates for historical figures and events',
        icon: '🏛️'
      },
      [TemplateCategory.HUMOR]: {
        name: 'Humor',
        description: 'Templates for humorous and witty quotes',
        icon: '😄'
      },
      [TemplateCategory.WISDOM]: {
        name: 'Wisdom',
        description: 'Templates for timeless wisdom and advice',
        icon: '🦉'
      },
      [TemplateCategory.LEADERSHIP]: {
        name: 'Leadership',
        description: 'Templates for leadership and management quotes',
        icon: '👑'
      },
      [TemplateCategory.EDUCATION]: {
        name: 'Education',
        description: 'Templates for educational and learning quotes',
        icon: '🎓'
      },
      [TemplateCategory.TECHNOLOGY]: {
        name: 'Technology',
        description: 'Templates for technology and innovation quotes',
        icon: '💻'
      },
      [TemplateCategory.SPORTS]: {
        name: 'Sports',
        description: 'Templates for sports and athletic quotes',
        icon: '🏆'
      },
      [TemplateCategory.CREATIVITY]: {
        name: 'Creativity',
        description: 'Templates for creative and artistic quotes',
        icon: '🎨'
      },
      [TemplateCategory.CUSTOM]: {
        name: 'Custom',
        description: 'User-created custom templates',
        icon: '🔧'
      }
    };

    return metadata[category];
  }

  /**
   * Export template as JSON
   */
  async exportTemplate(templateId: string): Promise<string> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    return JSON.stringify(template, null, 2);
  }

  /**
   * Import template from JSON
   */
  async importTemplate(jsonString: string): Promise<QuoteTemplate> {
    try {
      const template = JSON.parse(jsonString) as QuoteTemplate;
      
      // Convert date strings back to Date objects
      template.metadata.createdAt = new Date(template.metadata.createdAt);
      template.metadata.updatedAt = new Date(template.metadata.updatedAt);
      
      // Validate imported template
      const validation = this.validateTemplate(template);
      if (!validation.isValid) {
        throw new Error(
          `Imported template validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        );
      }

      // Generate new ID to avoid conflicts
      template.metadata.id = `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      await this.saveTemplate(template);
      
      return template;
    } catch (error) {
      logger.error('Failed to import template', error);
      throw new Error(`Template import failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clone an existing template
   */
  async cloneTemplate(templateId: string, newName: string): Promise<QuoteTemplate> {
    const originalTemplate = await this.getTemplate(templateId);
    if (!originalTemplate) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const clonedTemplate: QuoteTemplate = JSON.parse(JSON.stringify(originalTemplate));
    
    // Update metadata for clone
    clonedTemplate.metadata.id = `clone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    clonedTemplate.metadata.name = newName;
    clonedTemplate.metadata.description = `Clone of ${originalTemplate.metadata.name}`;
    clonedTemplate.metadata.createdAt = new Date();
    clonedTemplate.metadata.updatedAt = new Date();
    clonedTemplate.metadata.version = '1.0.0';
    
    // Reset usage stats
    clonedTemplate.metadata.usageStats = {
      totalUses: 0,
      lastUsed: new Date()
    };
    
    await this.saveTemplate(clonedTemplate);
    
    return clonedTemplate;
  }

  /**
   * Get template statistics
   */
  async getTemplateStatistics(): Promise<{
    totalTemplates: number;
    byCategory: Record<TemplateCategory, number>;
    mostUsed: QuoteTemplate[];
    recentlyUpdated: QuoteTemplate[];
  }> {
    const allTemplates = await this.searchTemplates({ includeDeprecated: false });
    
    // Count by category
    const byCategory = {} as Record<TemplateCategory, number>;
    Object.values(TemplateCategory).forEach(cat => {
      byCategory[cat] = 0;
    });
    
    allTemplates.forEach(template => {
      byCategory[template.metadata.category]++;
    });
    
    // Sort by usage
    const mostUsed = [...allTemplates]
      .sort((a, b) => 
        (b.metadata.usageStats?.totalUses || 0) - (a.metadata.usageStats?.totalUses || 0)
      )
      .slice(0, 5);
    
    // Sort by update date
    const recentlyUpdated = [...allTemplates]
      .sort((a, b) => 
        b.metadata.updatedAt.getTime() - a.metadata.updatedAt.getTime()
      )
      .slice(0, 5);
    
    return {
      totalTemplates: allTemplates.length,
      byCategory,
      mostUsed,
      recentlyUpdated
    };
  }
}

// Export singleton instance
export const templateManager = TemplateManager.getInstance();