/**
 * MCP Quotes Server - Prompt Template Resource Unit Tests
 * 
 * Unit tests for the prompt template resource that provides structured templates
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  getPromptTemplate,
  promptTemplateResource,
  handlePromptTemplate
} from '../../../src/resources/promptTemplate.js';
import type { PromptTemplateResponse, PromptTemplateVariable } from '../../../src/types/quotes.js';

// Mock logger
jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Prompt Template Resource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resource definition', () => {
    it('should have correct resource metadata', () => {
      expect(promptTemplateResource.uri).toBe('quote-prompt://default');
      expect(promptTemplateResource.name).toBe('Quote Content Prompt');
      expect(promptTemplateResource.description).toContain('reusable prompt template');
      expect(promptTemplateResource.mimeType).toBe('text/plain');
    });

    it('should follow MCP resource URI scheme', () => {
      expect(promptTemplateResource.uri).toMatch(/^[a-z-]+:\/\/.+$/);
    });
  });

  describe('getPromptTemplate', () => {
    let response: PromptTemplateResponse;

    beforeEach(() => {
      response = getPromptTemplate();
    });

    describe('template structure', () => {
      it('should return a valid prompt template response', () => {
        expect(response).toBeDefined();
        expect(response.template).toBeDefined();
        expect(response.variables).toBeDefined();
        expect(Array.isArray(response.variables)).toBe(true);
      });

      it('should contain expected template content', () => {
        const template = response.template;
        
        // Check for key template elements
        expect(template).toContain('helpful assistant');
        expect(template).toContain('quotes');
        expect(template).toContain('{{person}}');
        expect(template).toContain('{{task}}');
        expect(template).toContain('{{#each quotes}}');
        expect(template).toContain('{{text}}');
      });

      it('should have conditional topic rendering', () => {
        const template = response.template;
        
        expect(template).toContain('{{#if topic}}');
        expect(template).toContain('about {{topic}}');
        expect(template).toContain('{{/if}}');
      });

      it('should have conditional source rendering', () => {
        const template = response.template;
        
        expect(template).toContain('{{#if source}}');
        expect(template).toContain('Source: {{source}}');
      });

      it('should include guidelines section', () => {
        const template = response.template;
        
        expect(template).toContain('Guidelines:');
        expect(template).toContain('Use the provided quotes appropriately');
        expect(template).toContain('Maintain the original meaning');
        expect(template).toContain('Create engaging');
        expect(template).toContain('Properly attribute');
      });

      it('should use Handlebars syntax correctly', () => {
        const template = response.template;
        
        // Check for proper Handlebars syntax
        const handlebarsPatterns = [
          /\{\{person\}\}/,
          /\{\{#if topic\}\}/,
          /\{\{topic\}\}/,
          /\{\{\/if\}\}/,
          /\{\{#each quotes\}\}/,
          /\{\{text\}\}/,
          /\{\{\/each\}\}/,
          /\{\{task\}\}/
        ];
        
        handlebarsPatterns.forEach(pattern => {
          expect(template).toMatch(pattern);
        });
      });
    });

    describe('variable definitions', () => {
      it('should define all required variables', () => {
        const variableNames = response.variables.map(v => v.name);
        
        expect(variableNames).toContain('person');
        expect(variableNames).toContain('topic');
        expect(variableNames).toContain('quotes');
        expect(variableNames).toContain('task');
      });

      it('should have exactly 4 variables', () => {
        expect(response.variables).toHaveLength(4);
      });

      describe('person variable', () => {
        let personVar: PromptTemplateVariable;

        beforeEach(() => {
          personVar = response.variables.find(v => v.name === 'person')!;
        });

        it('should be properly defined', () => {
          expect(personVar).toBeDefined();
          expect(personVar.name).toBe('person');
          expect(personVar.description).toContain('person');
          expect(personVar.description).toContain('quotes');
          expect(personVar.required).toBe(true);
        });
      });

      describe('topic variable', () => {
        let topicVar: PromptTemplateVariable;

        beforeEach(() => {
          topicVar = response.variables.find(v => v.name === 'topic')!;
        });

        it('should be properly defined', () => {
          expect(topicVar).toBeDefined();
          expect(topicVar.name).toBe('topic');
          expect(topicVar.description).toContain('topic');
          expect(topicVar.description.toLowerCase()).toContain('optional');
          expect(topicVar.required).toBe(false);
        });
      });

      describe('quotes variable', () => {
        let quotesVar: PromptTemplateVariable;

        beforeEach(() => {
          quotesVar = response.variables.find(v => v.name === 'quotes')!;
        });

        it('should be properly defined', () => {
          expect(quotesVar).toBeDefined();
          expect(quotesVar.name).toBe('quotes');
          expect(quotesVar.description).toContain('quote');
          expect(quotesVar.description).toContain('array');
          expect(quotesVar.required).toBe(true);
        });

        it('should describe quote object structure', () => {
          expect(quotesVar.description).toContain('text');
          expect(quotesVar.description.toLowerCase()).toContain('source');
        });
      });

      describe('task variable', () => {
        let taskVar: PromptTemplateVariable;

        beforeEach(() => {
          taskVar = response.variables.find(v => v.name === 'task')!;
        });

        it('should be properly defined', () => {
          expect(taskVar).toBeDefined();
          expect(taskVar.name).toBe('task');
          expect(taskVar.description).toContain('task');
          expect(taskVar.description).toContain('perform');
          expect(taskVar.required).toBe(true);
        });

        it('should include examples', () => {
          expect(taskVar.description).toContain('e.g.');
          expect(taskVar.description).toMatch(/blog post|social media/i);
        });
      });

      it('should have consistent variable structure', () => {
        response.variables.forEach(variable => {
          expect(variable).toHaveProperty('name');
          expect(variable).toHaveProperty('description');
          expect(variable).toHaveProperty('required');
          
          expect(typeof variable.name).toBe('string');
          expect(typeof variable.description).toBe('string');
          expect(typeof variable.required).toBe('boolean');
          
          expect(variable.name).toBeTruthy();
          expect(variable.description).toBeTruthy();
        });
      });

      it('should have proper required/optional distribution', () => {
        const requiredVars = response.variables.filter(v => v.required);
        const optionalVars = response.variables.filter(v => !v.required);
        
        expect(requiredVars).toHaveLength(3); // person, quotes, task
        expect(optionalVars).toHaveLength(1); // topic
      });
    });

    describe('template consistency', () => {
      it('should use all defined variables in template', () => {
        const template = response.template;
        const variableNames = response.variables.map(v => v.name);
        
        variableNames.forEach(varName => {
          expect(template).toContain(`{{${varName}`);
        });
      });

      it('should not reference undefined variables', () => {
        const template = response.template;
        const variableNames = response.variables.map(v => v.name);
        
        // Extract all variable references from template
        const variableReferences = template.match(/\{\{#?\/?(\w+)/g) || [];
        const referencedVars = new Set<string>();
        
        variableReferences.forEach(ref => {
          const match = ref.match(/\{\{#?\/?(\w+)/);
          if (match && match[1] !== 'if' && match[1] !== 'each') {
            referencedVars.add(match[1]);
          }
        });
        
        // Check that all referenced variables are defined
        referencedVars.forEach(refVar => {
          if (refVar !== 'if' && refVar !== 'each') {
            expect(variableNames).toContain(refVar);
          }
        });
      });
    });
  });

  describe('handlePromptTemplate', () => {
    it('should return the same response as getPromptTemplate', async () => {
      const directResponse = getPromptTemplate();
      const handlerResponse = await handlePromptTemplate();
      
      expect(handlerResponse).toEqual(directResponse);
    });

    it('should be an async function', () => {
      expect(handlePromptTemplate()).toBeInstanceOf(Promise);
    });

    it('should always resolve successfully', async () => {
      await expect(handlePromptTemplate()).resolves.toBeDefined();
    });

    it('should return consistent results on multiple calls', async () => {
      const response1 = await handlePromptTemplate();
      const response2 = await handlePromptTemplate();
      
      expect(response1).toEqual(response2);
    });
  });

  describe('template usage scenarios', () => {
    it('should be suitable for blog post generation', () => {
      const response = getPromptTemplate();
      const template = response.template;
      
      // Check that template can handle blog post task
      expect(template).toContain('{{task}}');
      
      // Verify it has structure for multiple quotes
      expect(template).toContain('{{#each quotes}}');
    });

    it('should handle single quote scenario', () => {
      const response = getPromptTemplate();
      const template = response.template;
      
      // Template should work with array of any size
      expect(template).toContain('{{#each quotes}}');
      expect(template).not.toContain('{{#if quotes}}'); // Should assume quotes exist
    });

    it('should support attribution requirements', () => {
      const response = getPromptTemplate();
      const template = response.template;
      
      expect(template).toContain('attribute');
      expect(template).toContain('{{person}}');
    });
  });

  describe('edge cases', () => {
    it('should handle multiple calls without side effects', () => {
      const response1 = getPromptTemplate();
      const response2 = getPromptTemplate();
      
      // Should return new objects, not references
      expect(response1).not.toBe(response2);
      expect(response1).toEqual(response2);
      
      // Modifying one should not affect the other
      response1.variables.push({
        name: 'test',
        description: 'test',
        required: false
      });
      
      expect(response2.variables).toHaveLength(4);
    });

    it('should have valid template for Handlebars compilation', () => {
      const response = getPromptTemplate();
      const template = response.template;
      
      // Check for balanced Handlebars blocks
      const ifBlocks = (template.match(/\{\{#if/g) || []).length;
      const endIfBlocks = (template.match(/\{\{\/if/g) || []).length;
      expect(ifBlocks).toBe(endIfBlocks);
      
      const eachBlocks = (template.match(/\{\{#each/g) || []).length;
      const endEachBlocks = (template.match(/\{\{\/each/g) || []).length;
      expect(eachBlocks).toBe(endEachBlocks);
    });

    it('should not contain any undefined placeholders', () => {
      const response = getPromptTemplate();
      const template = response.template;
      
      expect(template).not.toContain('undefined');
      expect(template).not.toContain('null');
      expect(template).not.toContain('{{}}'); // Empty placeholders
    });

    it('should handle template with empty quotes array gracefully', () => {
      const response = getPromptTemplate();
      const template = response.template;
      
      // Template should have each block that handles empty arrays
      expect(template).toContain('{{#each quotes}}');
      // No error handling needed - Handlebars handles empty arrays
    });
  });

  describe('logging', () => {
    it('should log when providing template', () => {
      const { logger } = require('../../../src/utils/logger.js');
      
      getPromptTemplate();
      
      expect(logger.info).toHaveBeenCalledWith('Providing prompt template');
    });
  });
});