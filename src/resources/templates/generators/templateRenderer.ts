/**
 * MCP Quotes Server - Template Renderer
 * 
 * Renders quote templates with variable substitution and formatting
 */

import type {
  IQuoteTemplate,
  ITemplateRenderContext,
  ITemplateRenderResult,
  IPostProcessor
} from '../../../types/templates.js';
import {
  OutputFormat
} from '../../../types/templates.js';
import { logger } from '../../../utils/logger.js';
import { TemplateValidator } from '../validators/templateValidator.js';

/**
 * Template renderer class
 */
export class TemplateRenderer {
  /**
   * Render a template with given context
   */
  static async render(
    template: IQuoteTemplate,
    context: ITemplateRenderContext
  ): Promise<ITemplateRenderResult> {
    const warnings: string[] = [];

    try {
      // Validate required variables
      const validationResult = this.validateContext(template, context);
      if (!validationResult.isValid) {
        throw new Error(`Template validation failed: ${validationResult.errors.join(', ')}`);
      }
      warnings.push(...validationResult.warnings);

      // Apply default values
      const variables = this.applyDefaults(template, context.variables);

      // Render template content
      let output = this.substituteVariables(template.content, variables, context.options?.formatters);

      // Apply components
      if (template.components) {
        output = await this.applyComponents(output, template.components, variables);
      }

      // Apply post-processors
      if (template.postProcessors) {
        output = await this.applyPostProcessors(output, template.postProcessors, template);
      }

      // Format output
      const format = context.options?.outputFormat || template.outputFormat.format;
      output = this.formatOutput(output, format, template.outputFormat.options);

      // Build result
      const result: ITemplateRenderResult = {
        output,
        format,
        warnings: warnings.length > 0 ? warnings : []
      };

      // Include metadata if requested
      if (context.options?.includeMetadata) {
        result.metadata = {
          templateId: template.metadata.id,
          templateName: template.metadata.name,
          templateVersion: template.metadata.version,
          renderedAt: new Date().toISOString(),
          variablesUsed: Object.keys(variables)
        };
      }

      return result;
    } catch (error) {
      logger.error('Template rendering failed', { 
        templateId: template.metadata.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Validate rendering context
   */
  private static validateContext(
    template: IQuoteTemplate,
    context: ITemplateRenderContext
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required variables
    template.variables.forEach((variable) => {
      const value = context.variables[variable.name];

      if (variable.required && (value === undefined || value === null)) {
        if (!variable.defaultValue) {
          errors.push(`Required variable "${variable.name}" is missing`);
        }
      }

      // Validate variable value if provided
      if (value !== undefined && value !== null) {
        const validation = TemplateValidator.validateVariableWithRules(variable, value);
        if (!validation.isValid) {
          errors.push(`Variable "${variable.name}": ${validation.error}`);
        }
      }
    });

    // Warn about extra variables
    const definedVariables = new Set(template.variables.map(v => v.name));
    Object.keys(context.variables).forEach((varName) => {
      if (!definedVariables.has(varName)) {
        warnings.push(`Unknown variable "${varName}" provided`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Apply default values for missing variables
   */
  private static applyDefaults(
    template: IQuoteTemplate,
    providedVariables: Record<string, any>
  ): Record<string, any> {
    const variables: Record<string, any> = { ...providedVariables };

    template.variables.forEach((variable) => {
      if (
        (variables[variable.name] === undefined || variables[variable.name] === null) &&
        variable.defaultValue !== undefined
      ) {
        variables[variable.name] = variable.defaultValue;
      }
    });

    return variables;
  }

  /**
   * Substitute variables in template content
   */
  private static substituteVariables(
    content: string,
    variables: Record<string, any>,
    formatters?: Record<string, (value: any) => string>
  ): string {
    return content.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)(?::([a-zA-Z][a-zA-Z0-9_]*))?\}/g, 
      (match, varName, formatterName) => {
        const value = variables[varName];
        
        if (value === undefined) {
          return match; // Keep placeholder if variable not found
        }

        // Apply formatter if specified
        if (formatterName && formatters?.[formatterName]) {
          return formatters[formatterName](value);
        }

        // Default formatting
        return this.formatValue(value);
      }
    );
  }

  /**
   * Format a value for string substitution
   */
  private static formatValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'object') {
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (Array.isArray(value)) {
        return value.map(v => this.formatValue(v)).join(', ');
      }
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Apply template components
   */
  private static async applyComponents(
    content: string,
    components: IQuoteTemplate['components'],
    variables: Record<string, any>
  ): Promise<string> {
    if (!components || components.length === 0) {
      return content;
    }

    // Sort components by order
    const sortedComponents = [...components].sort((a, b) => 
      (a.order || 0) - (b.order || 0)
    );

    let result = content;

    for (const component of sortedComponents) {
      // Check condition for conditional components
      if (component.type === 'conditional' && component.condition) {
        const conditionMet = this.evaluateCondition(component.condition, variables);
        if (!conditionMet) {
          continue;
        }
      }

      // Apply component
      switch (component.type) {
        case 'prefix':
          result = component.content + result;
          break;
        
        case 'suffix':
          result = result + component.content;
          break;
        
        case 'wrapper':
          // Wrapper content should contain {content} placeholder
          result = component.content.replace('{content}', result);
          break;
        
        case 'conditional':
          // Already checked condition above
          result = this.substituteVariables(component.content, variables);
          break;
      }
    }

    return result;
  }

  /**
   * Evaluate a simple condition
   */
  private static evaluateCondition(condition: string, variables: Record<string, any>): boolean {
    try {
      // Simple condition evaluation (e.g., "topic !== null", "numberOfQuotes > 5")
      // This is a basic implementation - could be enhanced with a proper expression evaluator
      const conditionFunction = new Function(...Object.keys(variables), `return ${condition}`);
      return conditionFunction(...Object.values(variables));
    } catch (error) {
      logger.warn('Failed to evaluate condition', { condition, error });
      return false;
    }
  }

  /**
   * Apply post-processors
   */
  private static async applyPostProcessors(
    content: string,
    processors: IPostProcessor[],
    template: IQuoteTemplate
  ): Promise<string> {
    // Sort processors by order
    const sortedProcessors = [...processors].sort((a, b) => 
      (a.order || 0) - (b.order || 0)
    );

    let result = content;

    for (const processor of sortedProcessors) {
      result = await this.applyPostProcessor(result, processor, template);
    }

    return result;
  }

  /**
   * Apply a single post-processor
   */
  private static async applyPostProcessor(
    content: string,
    processor: IPostProcessor,
    template: IQuoteTemplate
  ): Promise<string> {
    switch (processor.type) {
      case 'formatter':
        return this.applyFormatter(content, processor);
      
      case 'validator':
        // Validators don't modify content, just validate
        await this.applyValidator(content, processor);
        return content;
      
      case 'transformer':
        return this.applyTransformer(content, processor);
      
      case 'enricher':
        return this.applyEnricher(content, processor, template);
      
      default:
        logger.warn('Unknown post-processor type', { type: processor.type });
        return content;
    }
  }

  /**
   * Apply formatter post-processor
   */
  private static applyFormatter(content: string, processor: IPostProcessor): string {
    const { name, options } = processor;

    switch (name) {
      case 'trim':
        return content.trim();
      
      case 'uppercase':
        return content.toUpperCase();
      
      case 'lowercase':
        return content.toLowerCase();
      
      case 'capitalize':
        return content.charAt(0).toUpperCase() + content.slice(1);
      
      case 'truncate':
        const maxLength = (options?.['maxLength'] as number) || 100;
        const ellipsis = (options?.['ellipsis'] as string) || '...';
        return content.length > maxLength 
          ? content.substring(0, maxLength - ellipsis.length) + ellipsis
          : content;
      
      default:
        return content;
    }
  }

  /**
   * Apply validator post-processor
   */
  private static async applyValidator(content: string, processor: IPostProcessor): Promise<void> {
    const { name, options } = processor;

    switch (name) {
      case 'minLength':
        if (content.length < ((options?.['min'] as number) || 0)) {
          throw new Error(`Content length ${content.length} is below minimum ${options?.['min']}`);
        }
        break;
      
      case 'maxLength':
        if (content.length > ((options?.['max'] as number) || Infinity)) {
          throw new Error(`Content length ${content.length} exceeds maximum ${options?.['max']}`);
        }
        break;
      
      case 'pattern':
        if (options?.['pattern']) {
          const regex = new RegExp(options['pattern'] as string);
          if (!regex.test(content)) {
            throw new Error(`Content does not match required pattern`);
          }
        }
        break;
    }
  }

  /**
   * Apply transformer post-processor
   */
  private static applyTransformer(content: string, processor: IPostProcessor): string {
    const { name, options } = processor;

    switch (name) {
      case 'replace':
        if (options?.['search'] && options?.['replace'] !== undefined) {
          const flags = (options['flags'] as string) || 'g';
          const regex = new RegExp(options['search'] as string, flags);
          return content.replace(regex, options['replace'] as string);
        }
        return content;
      
      case 'split-lines':
        const separator = (options?.['separator'] as string) || '\n';
        const splitLines = content.split('\n');
        return splitLines.join(separator);
      
      case 'number-lines':
        const startNum = (options?.['start'] as number) || 1;
        const numberLines = content.split('\n');
        return numberLines.map((line: string, index: number) => 
          `${startNum + index}. ${line}`
        ).join('\n');
      
      default:
        return content;
    }
  }

  /**
   * Apply enricher post-processor
   */
  private static applyEnricher(
    content: string,
    processor: IPostProcessor,
    template: IQuoteTemplate
  ): string {
    const { name, options } = processor;

    switch (name) {
      case 'add-metadata':
        const metadata = [
          `Template: ${template.metadata.name}`,
          `Category: ${template.metadata.category}`,
          `Generated: ${new Date().toISOString()}`
        ].join('\n');
        return options?.['position'] === 'top' 
          ? `${metadata}\n\n${content}`
          : `${content}\n\n${metadata}`;
      
      case 'add-attribution':
        const attribution = options?.['text'] || `Generated using ${template.metadata.name} template`;
        return `${content}\n\n--- ${attribution} ---`;
      
      default:
        return content;
    }
  }

  /**
   * Format output based on format type
   */
  private static formatOutput(
    content: string,
    format: OutputFormat,
    options?: Record<string, any>
  ): string {
    switch (format) {
      case OutputFormat.TEXT:
        return content;
      
      case OutputFormat.JSON:
        return JSON.stringify({
          content,
          timestamp: new Date().toISOString(),
          ...options
        }, null, 2);
      
      case OutputFormat.MARKDOWN:
        return this.formatAsMarkdown(content, options);
      
      case OutputFormat.HTML:
        return this.formatAsHTML(content, options);
      
      case OutputFormat.CSV:
        return this.formatAsCSV(content, options);
      
      case OutputFormat.XML:
        return this.formatAsXML(content, options);
      
      default:
        return content;
    }
  }

  /**
   * Format content as Markdown
   */
  private static formatAsMarkdown(content: string, options?: Record<string, any>): string {
    const title = options?.['title'] || 'Quote';
    const includeHeader = options?.['includeHeader'] !== false;

    if (includeHeader) {
      return `# ${title}\n\n${content}`;
    }

    return content;
  }

  /**
   * Format content as HTML
   */
  private static formatAsHTML(content: string, options?: Record<string, any>): string {
    const title = options?.['title'] || 'Quote';
    const cssClass = options?.['cssClass'] || 'quote-content';

    const escapedContent = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');

    return `
      <div class="${cssClass}">
        <h1>${title}</h1>
        <div class="content">
          ${escapedContent}
        </div>
      </div>
    `.trim();
  }

  /**
   * Format content as CSV
   */
  private static formatAsCSV(content: string, options?: Record<string, any>): string {
    // For quotes, assume each line is a separate quote
    const quotes = content.split('\n').filter(line => line.trim());
    const headers = options?.['headers'] || ['Quote', 'Timestamp'];
    const timestamp = new Date().toISOString();

    const rows = [
      headers.join(','),
      ...quotes.map(quote => 
        `"${quote.replace(/"/g, '""')}","${timestamp}"`
      )
    ];

    return rows.join('\n');
  }

  /**
   * Format content as XML
   */
  private static formatAsXML(content: string, options?: Record<string, any>): string {
    const rootElement = options?.['rootElement'] || 'quotes';
    const itemElement = options?.['itemElement'] || 'quote';

    const escapeXML = (str: string) => str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    const quotes = content.split('\n').filter(line => line.trim());

    return `<?xml version="1.0" encoding="UTF-8"?>
<${rootElement}>
${quotes.map(quote => 
      `  <${itemElement}>${escapeXML(quote)}</${itemElement}>`
    ).join('\n')}
</${rootElement}>`;
  }
}