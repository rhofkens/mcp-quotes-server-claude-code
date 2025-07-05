/**
 * Unit tests for validation utilities
 */

import { describe, it, expect } from '@jest/globals';
import {
  CommonSchemas,
  MCPSchemas,
  QuoteSchemas,
  validate,
  safeValidate,
  isMCPRequest,
  isToolCallRequest,
  isResourceReadRequest,
  validateEnvVar,
  validateOptionalEnvVar,
  parseIntEnvVar,
  parseBooleanEnvVar,
  createValidator,
  validateArrayBounds,
  validateStringBounds,
  sanitizeString,
  validateSearchQuery
} from '../../../src/utils/validation.js';
import { ValidationError } from '../../../src/utils/errors.js';
import { z } from 'zod';

describe('Validation Utilities', () => {
  describe('CommonSchemas', () => {
    it('should validate non-empty strings', () => {
      expect(() => validate(CommonSchemas.nonEmptyString, '')).toThrow(ValidationError);
      expect(validate(CommonSchemas.nonEmptyString, 'test')).toBe('test');
    });
    
    it('should validate positive integers', () => {
      expect(() => validate(CommonSchemas.positiveInteger, -1)).toThrow(ValidationError);
      expect(() => validate(CommonSchemas.positiveInteger, 0)).toThrow(ValidationError);
      expect(() => validate(CommonSchemas.positiveInteger, 1.5)).toThrow(ValidationError);
      expect(validate(CommonSchemas.positiveInteger, 1)).toBe(1);
    });
    
    it('should validate URLs', () => {
      expect(() => validate(CommonSchemas.url, 'not-a-url')).toThrow(ValidationError);
      expect(validate(CommonSchemas.url, 'https://example.com')).toBe('https://example.com');
    });
    
    it('should validate emails', () => {
      expect(() => validate(CommonSchemas.email, 'not-an-email')).toThrow(ValidationError);
      expect(validate(CommonSchemas.email, 'test@example.com')).toBe('test@example.com');
    });
    
    it('should validate UUIDs', () => {
      expect(() => validate(CommonSchemas.uuid, 'not-a-uuid')).toThrow(ValidationError);
      expect(validate(CommonSchemas.uuid, '123e4567-e89b-12d3-a456-426614174000'))
        .toBe('123e4567-e89b-12d3-a456-426614174000');
    });
    
    it('should validate ISO dates', () => {
      expect(() => validate(CommonSchemas.isoDate, 'not-a-date')).toThrow(ValidationError);
      expect(validate(CommonSchemas.isoDate, '2023-01-01T00:00:00Z'))
        .toBe('2023-01-01T00:00:00Z');
    });
  });
  
  describe('MCPSchemas', () => {
    it('should validate base MCP request', () => {
      const validRequest = {
        jsonrpc: '2.0',
        method: 'test-method',
        id: 1,
        params: { foo: 'bar' }
      };
      
      expect(validate(MCPSchemas.baseRequest, validRequest)).toEqual(validRequest);
      
      expect(() => validate(MCPSchemas.baseRequest, {
        jsonrpc: '1.0',
        method: 'test',
        id: 1
      })).toThrow(ValidationError);
    });
    
    it('should validate tool call request', () => {
      const validRequest = {
        jsonrpc: '2.0',
        method: 'tools/call',
        id: 'req-123',
        params: {
          name: 'getQuotes',
          arguments: { person: 'Einstein' }
        }
      };
      
      expect(validate(MCPSchemas.toolCallRequest, validRequest)).toEqual(validRequest);
      
      expect(() => validate(MCPSchemas.toolCallRequest, {
        jsonrpc: '2.0',
        method: 'wrong-method',
        id: 1,
        params: { name: 'test' }
      })).toThrow(ValidationError);
    });
    
    it('should validate resource read request', () => {
      const validRequest = {
        jsonrpc: '2.0',
        method: 'resources/read',
        id: 123,
        params: {
          uri: 'quote://prompt-template'
        }
      };
      
      expect(validate(MCPSchemas.resourceReadRequest, validRequest)).toEqual(validRequest);
    });
  });
  
  describe('QuoteSchemas', () => {
    it('should validate getQuotes parameters', () => {
      const validParams = {
        person: 'Einstein',
        numberOfQuotes: 5,
        topic: 'physics'
      };
      
      expect(validate(QuoteSchemas.getQuotesParams, validParams)).toEqual(validParams);
      
      // Test without optional topic
      const minimalParams = {
        person: 'Einstein',
        numberOfQuotes: 5
      };
      expect(validate(QuoteSchemas.getQuotesParams, minimalParams)).toEqual(minimalParams);
      
      // Test validation errors
      expect(() => validate(QuoteSchemas.getQuotesParams, {
        person: '',
        numberOfQuotes: 5
      })).toThrow(ValidationError);
      
      expect(() => validate(QuoteSchemas.getQuotesParams, {
        person: 'Einstein',
        numberOfQuotes: 0
      })).toThrow('Number of quotes must be at least 1');
      
      expect(() => validate(QuoteSchemas.getQuotesParams, {
        person: 'Einstein',
        numberOfQuotes: 25
      })).toThrow('Number of quotes cannot exceed 10');
    });
    
    it('should validate quote object', () => {
      const validQuote = {
        text: 'Imagination is more important than knowledge.',
        author: 'Albert Einstein',
        source: 'Interview',
        date: '1929',
        context: 'On the importance of creativity'
      };
      
      expect(validate(QuoteSchemas.quote, validQuote)).toEqual(validQuote);
      
      // Test minimal quote
      const minimalQuote = {
        text: 'Test quote',
        author: 'Test Author'
      };
      expect(validate(QuoteSchemas.quote, minimalQuote)).toEqual(minimalQuote);
    });
  });
  
  describe('validate function', () => {
    it('should throw ValidationError with field name', () => {
      const schema = z.string().email();
      
      try {
        validate(schema, 'invalid-email', 'userEmail');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).field).toBe('userEmail');
        expect((error as ValidationError).message).toContain('Validation failed');
      }
    });
    
    it('should include all validation issues in error message', () => {
      const schema = z.object({
        name: z.string().min(1),
        age: z.number().positive()
      });
      
      try {
        validate(schema, { name: '', age: -1 });
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const message = (error as ValidationError).message;
        expect(message).toContain('name:');
        expect(message).toContain('age:');
      }
    });
  });
  
  describe('safeValidate function', () => {
    it('should return success result for valid data', () => {
      const schema = z.string().email();
      const result = safeValidate(schema, 'test@example.com');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test@example.com');
      }
    });
    
    it('should return error result for invalid data', () => {
      const schema = z.string().email();
      const result = safeValidate(schema, 'invalid-email');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });
  });
  
  describe('Type guards', () => {
    it('should identify MCP requests', () => {
      const validRequest = {
        jsonrpc: '2.0',
        method: 'test',
        id: 1
      };
      
      const invalidRequest = {
        method: 'test',
        id: 1
      };
      
      expect(isMCPRequest(validRequest)).toBe(true);
      expect(isMCPRequest(invalidRequest)).toBe(false);
    });
    
    it('should identify tool call requests', () => {
      const validRequest = {
        jsonrpc: '2.0',
        method: 'tools/call',
        id: 1,
        params: { name: 'test' }
      };
      
      const invalidRequest = {
        jsonrpc: '2.0',
        method: 'other-method',
        id: 1
      };
      
      expect(isToolCallRequest(validRequest)).toBe(true);
      expect(isToolCallRequest(invalidRequest)).toBe(false);
    });
    
    it('should identify resource read requests', () => {
      const validRequest = {
        jsonrpc: '2.0',
        method: 'resources/read',
        id: 1,
        params: { uri: 'test://resource' }
      };
      
      expect(isResourceReadRequest(validRequest)).toBe(true);
    });
  });
  
  describe('Environment variable validators', () => {
    it('should validate required env var', () => {
      expect(validateEnvVar('API_KEY', 'test-key')).toBe('test-key');
      
      expect(() => validateEnvVar('API_KEY', undefined)).toThrow(ValidationError);
      expect(() => validateEnvVar('API_KEY', '')).toThrow(ValidationError);
      expect(() => validateEnvVar('API_KEY', '  ')).toThrow(ValidationError);
    });
    
    it('should validate optional env var with default', () => {
      expect(validateOptionalEnvVar('HOST', 'localhost', '0.0.0.0')).toBe('localhost');
      expect(validateOptionalEnvVar('HOST', undefined, '0.0.0.0')).toBe('0.0.0.0');
      expect(validateOptionalEnvVar('HOST', '', '0.0.0.0')).toBe('0.0.0.0');
    });
    
    it('should parse integer env var', () => {
      expect(parseIntEnvVar('PORT', '3000', 8080)).toBe(3000);
      expect(parseIntEnvVar('PORT', undefined, 8080)).toBe(8080);
      
      expect(() => parseIntEnvVar('PORT', 'not-a-number', 8080)).toThrow(ValidationError);
      expect(() => parseIntEnvVar('PORT', '3000', 8080, 4000)).toThrow(ValidationError);
      expect(() => parseIntEnvVar('PORT', '3000', 8080, 1000, 2000)).toThrow(ValidationError);
      
      expect(parseIntEnvVar('PORT', '3000', 8080, 1000, 4000)).toBe(3000);
    });
    
    it('should parse boolean env var', () => {
      expect(parseBooleanEnvVar('ENABLED', 'true', false)).toBe(true);
      expect(parseBooleanEnvVar('ENABLED', 'TRUE', false)).toBe(true);
      expect(parseBooleanEnvVar('ENABLED', '1', false)).toBe(true);
      expect(parseBooleanEnvVar('ENABLED', 'yes', false)).toBe(true);
      
      expect(parseBooleanEnvVar('ENABLED', 'false', true)).toBe(false);
      expect(parseBooleanEnvVar('ENABLED', 'FALSE', true)).toBe(false);
      expect(parseBooleanEnvVar('ENABLED', '0', true)).toBe(false);
      expect(parseBooleanEnvVar('ENABLED', 'no', true)).toBe(false);
      
      expect(parseBooleanEnvVar('ENABLED', undefined, true)).toBe(true);
      
      expect(() => parseBooleanEnvVar('ENABLED', 'invalid', false)).toThrow(ValidationError);
    });
  });
  
  describe('createValidator', () => {
    it('should create a validation middleware', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      });
      
      const validator = createValidator(schema);
      
      expect(validator({ name: 'John', age: 30 })).toEqual({ name: 'John', age: 30 });
      expect(() => validator({ name: 'John' })).toThrow(ValidationError);
    });
  });
  
  describe('Array and string validators', () => {
    it('should validate array bounds', () => {
      const arr = [1, 2, 3];
      
      expect(() => validateArrayBounds(arr, 'items')).not.toThrow();
      expect(() => validateArrayBounds(arr, 'items', 2)).not.toThrow();
      expect(() => validateArrayBounds(arr, 'items', 4)).toThrow(ValidationError);
      expect(() => validateArrayBounds(arr, 'items', 2, 2)).toThrow(ValidationError);
      expect(() => validateArrayBounds(arr, 'items', 2, 5)).not.toThrow();
    });
    
    it('should validate string bounds', () => {
      const str = 'hello';
      
      expect(() => validateStringBounds(str, 'text')).not.toThrow();
      expect(() => validateStringBounds(str, 'text', 3)).not.toThrow();
      expect(() => validateStringBounds(str, 'text', 10)).toThrow(ValidationError);
      expect(() => validateStringBounds(str, 'text', 3, 4)).toThrow(ValidationError);
      expect(() => validateStringBounds(str, 'text', 3, 10)).not.toThrow();
    });
  });
  
  describe('String sanitization', () => {
    it('should sanitize strings', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
      expect(sanitizeString('hello<script>alert()</script>')).toBe('helloscriptalert()/script');
      expect(sanitizeString('test>value<test')).toBe('testvaluetest');
    });
    
    it('should validate and sanitize search query', () => {
      expect(validateSearchQuery('  Einstein quotes  ')).toBe('Einstein quotes');
      expect(validateSearchQuery('test<>query')).toBe('testquery');
      
      expect(() => validateSearchQuery('')).toThrow(ValidationError);
      expect(() => validateSearchQuery('   ')).toThrow(ValidationError);
      
      const longQuery = 'a'.repeat(201);
      expect(() => validateSearchQuery(longQuery)).toThrow(ValidationError);
    });
  });
});