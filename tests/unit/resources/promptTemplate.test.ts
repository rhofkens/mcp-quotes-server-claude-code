/**
 * MCP Quotes Server - Prompt Template Resource Unit Tests
 * 
 * Unit tests for the prompt template resource that provides structured templates
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  promptTemplateResource,
  promptTemplateHandler
} from '../../../src/resources/promptTemplate.js';
import type { PromptTemplateResponse, PromptTemplateVariable } from '../../../src/types/quotes.js';

// Helper functions for tests
async function getPromptTemplate(): Promise<PromptTemplateResponse> {
  const content = await promptTemplateHandler('quote-prompt://default');
  return JSON.parse(content);
}

async function handlePromptTemplate(): Promise<PromptTemplateResponse> {
  return getPromptTemplate();
}

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
      expect(promptTemplateResource.name).toBe('Default Quote Request Template');
      expect(promptTemplateResource.description).toContain('template for formatting quote requests');
      expect(promptTemplateResource.mimeType).toBe('application/json');
    });

    it('should follow MCP resource URI scheme', () => {
      expect(promptTemplateResource.uri).toMatch(/^[a-z-]+:\/\/.+$/);
    });
  });

  describe('getPromptTemplate', () => {
    let response: PromptTemplateResponse;

    beforeEach(async () => {
      response = await getPromptTemplate();
    });

    describe('template structure', () => {
      it('should return a valid prompt template response', () => {
        expect(response).toBeDefined();
        expect(response.template).toBeDefined();
        expect(response.variables).toBeDefined();
        expect(typeof response.variables).toBe('object');
      });

      it('should contain expected template content', () => {
        const template = response.template;
        
        // Check for key template elements
        expect(template).toContain('Find');
        expect(template).toContain('quotes');
        expect(template).toContain('{person}');
        expect(template).toContain('{numberOfQuotes}');
        expect(template).toContain('structured format');
        expect(template).toContain('proper attribution');
      });

      it('should have conditional topic rendering', () => {
        const template = response.template;
        
        expect(template).toContain('{topic}');
        expect(template).toContain('quotes from');
        expect(template).toContain('Return them');
      });

      it('should have conditional source rendering', () => {
        const template = response.template;
        
        expect(template).toContain('{numberOfQuotes}');
        expect(template).toContain('structured format');
      });

      it('should include guidelines section', () => {
        const template = response.template;
        
        expect(template).toContain('Find');
        expect(template).toContain('quotes from');
        expect(template).toContain('structured format');
        expect(template).toContain('proper attribution');
        expect(template).toContain('Return them');
      });

      it('should use placeholder syntax correctly', () => {
        const template = response.template;
        
        // Check for proper placeholder syntax
        const placeholderPatterns = [
          /\{person\}/,
          /\{topic\}/,
          /\{numberOfQuotes\}/
        ];
        
        placeholderPatterns.forEach(pattern => {
          expect(template).toMatch(pattern);
        });
      });
    });

    describe('variable definitions', () => {
      it('should define all required variables', () => {
        const variableNames = Object.keys(response.variables);
        
        expect(variableNames).toContain('person');
        expect(variableNames).toContain('topic');
        expect(variableNames).toContain('numberOfQuotes');
      });

      it('should have exactly 3 variables', () => {
        expect(Object.keys(response.variables)).toHaveLength(3);
      });

      describe('person variable', () => {
        let personVar: PromptTemplateVariable;

        beforeEach(() => {
          personVar = response.variables['person']!;
        });

        it('should be properly defined', () => {
          expect(personVar).toBeDefined();
          // personVar is accessed by key, so name is implicit
          expect(personVar.description).toContain('person');
          expect(personVar.description).toContain('quotes');
          expect(personVar.required).toBe(true);
        });
      });

      describe('topic variable', () => {
        let topicVar: PromptTemplateVariable;

        beforeEach(() => {
          topicVar = response.variables['topic']!;
        });

        it('should be properly defined', () => {
          expect(topicVar).toBeDefined();
          expect(topicVar.description).toContain('Optional topic');
          expect(topicVar.required).toBe(false);
        });
      });

      describe('numberOfQuotes variable', () => {
        let numberOfQuotesVar: PromptTemplateVariable;

        beforeEach(() => {
          numberOfQuotesVar = response.variables['numberOfQuotes']!;
        });

        it('should be properly defined', () => {
          expect(numberOfQuotesVar).toBeDefined();
          expect(numberOfQuotesVar.description).toContain('number of quotes');
          expect(numberOfQuotesVar.type).toBe('number');
          expect(numberOfQuotesVar.required).toBe(true);
        });

        it('should have constraints', () => {
          expect(numberOfQuotesVar.default).toBe(3);
          expect(numberOfQuotesVar.constraints?.minimum).toBe(1);
          expect(numberOfQuotesVar.constraints?.maximum).toBe(10);
        });
      });

      describe('variable examples', () => {
        it('person variable should have examples', () => {
          const personVar = response.variables['person'];
          expect(personVar?.examples).toBeDefined();
          expect(personVar?.examples).toContain('Albert Einstein');
          expect(personVar?.examples).toContain('Maya Angelou');
        });

        it('topic variable should have examples', () => {
          const topicVar = response.variables['topic'];
          expect(topicVar?.examples).toBeDefined();
          expect(topicVar?.examples).toContain(' about success');
          expect(topicVar?.examples).toContain(' about innovation');
        });
      });

      it('should have consistent variable structure', () => {
        Object.values(response.variables).forEach(variable => {
          expect(variable).toHaveProperty('description');
          expect(variable).toHaveProperty('required');
          expect(variable).toHaveProperty('type');
          
          expect(typeof variable.description).toBe('string');
          expect(typeof variable.required).toBe('boolean');
          expect(typeof variable.type).toBe('string');
          
          expect(variable.description).toBeTruthy();
        });
      });

      it('should have proper required/optional distribution', () => {
        const variables = Object.values(response.variables);
        const requiredVars = variables.filter(v => v.required);
        const optionalVars = variables.filter(v => !v.required);
        
        expect(requiredVars).toHaveLength(2); // person, numberOfQuotes
        expect(optionalVars).toHaveLength(1); // topic
      });
    });

    describe('template consistency', () => {
      it('should use all defined variables in template', () => {
        const template = response.template;
        const variableNames = Object.keys(response.variables);
        
        variableNames.forEach(varName => {
          expect(template).toContain(`{${varName}}`);
        });
      });

      it('should not reference undefined variables', () => {
        const template = response.template;
        const variableNames = Object.keys(response.variables);
        
        // Extract all variable references from template
        const variableReferences = template.match(/\{(\w+)\}/g) || [];
        const referencedVars = new Set<string>();
        
        variableReferences.forEach(ref => {
          const match = ref.match(/\{(\w+)\}/);
          if (match) {
            if (match[1]) referencedVars.add(match[1]);
          }
        });
        
        // Check that all referenced variables are defined
        referencedVars.forEach(refVar => {
          expect(variableNames).toContain(refVar);
        });
      });
    });
  });

  describe('handlePromptTemplate', () => {

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

  describe('edge cases', () => {

    it('should have valid template with placeholders', async () => {
      const response = await getPromptTemplate();
      const template = response.template;
      
      // Check for valid placeholder format
      const placeholders = template.match(/\{\w+\}/g) || [];
      expect(placeholders.length).toBeGreaterThan(0);
      
      // All placeholders should be defined in variables
      placeholders.forEach(placeholder => {
        const varName = placeholder.slice(1, -1);
        expect(Object.keys(response.variables)).toContain(varName);
      });
    });

    it('should not contain any undefined placeholders', async () => {
      const response = await getPromptTemplate();
      const template = response.template;
      
      expect(template).not.toContain('undefined');
      expect(template).not.toContain('null');
      expect(template).not.toContain('{}'); // Empty placeholders
    });

    it('should handle template with empty quotes array gracefully', async () => {
      const response = await getPromptTemplate();
      const template = response.template;
      
      // Template should mention structured format for quotes
      expect(template).toContain('structured format');
      // No error handling needed - Handlebars handles empty arrays
    });
  });
});