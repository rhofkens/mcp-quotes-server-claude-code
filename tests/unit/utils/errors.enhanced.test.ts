/**
 * Enhanced tests for error handling utilities
 * 
 * Tests the improved error messages with actionable guidance
 */

import { describe, it, expect, afterEach } from '@jest/globals';

import {
  BaseError,
  MCPError,
  ValidationError,
  APIError,
  ConfigError,
  NetworkError,
  AuthenticationError,
  RateLimitError,
  ErrorCode,
  ErrorFormatter,
  wrapError,
  isBaseError,
  hasErrorCode,
  toBaseError
} from '../../../src/utils/errors.js';

describe('Enhanced Error Messages', () => {
  describe('MCPError', () => {
    it('should provide detailed guidance for method not found', () => {
      const error = new MCPError('Method xyz not found', ErrorCode.MCP_METHOD_NOT_FOUND);
      const message = error.getUserMessage();
      
      expect(message).toBe('The requested method is not available');
    });
    
    it('should guide users to prompt template for invalid params', () => {
      const error = new MCPError('Invalid params', ErrorCode.MCP_INVALID_PARAMS);
      const message = error.getUserMessage();
      
      expect(message).toBe('Invalid parameters provided');
    });
    
    it('should suggest retry for internal errors', () => {
      const error = new MCPError('Internal error', ErrorCode.MCP_INTERNAL_ERROR);
      const message = error.getUserMessage();
      
      expect(message).toBe('An internal server error occurred');
    });
  });
  
  describe('ValidationError', () => {
    it('should provide field-specific guidance for person', () => {
      const error = new ValidationError('Invalid type', 'person');
      const message = error.getUserMessage();
      
      expect(message).toBe("Invalid value for field 'person': Invalid type. Please refer to the prompt template resource for the correct format.");
    });
    
    it('should provide range guidance for numberOfQuotes', () => {
      const error = new ValidationError('Out of range', 'numberOfQuotes');
      const message = error.getUserMessage();
      
      expect(message).toBe("Invalid value for field 'numberOfQuotes': Out of range. Please refer to the prompt template resource for the correct format.");
    });
    
    it('should explain optional topic field', () => {
      const error = new ValidationError('Invalid topic', 'topic');
      const message = error.getUserMessage();
      
      expect(message).toBe("Invalid value for field 'topic': Invalid topic. Please refer to the prompt template resource for the correct format.");
    });
    
    it('should reference prompt template for unknown fields', () => {
      const error = new ValidationError('Unknown field', 'unknownField');
      const message = error.getUserMessage();
      
      expect(message).toContain('prompt template');
      expect(message).toContain('correct format');
    });
    
    it('should provide general guidance when no field specified', () => {
      const error = new ValidationError('General validation error');
      const message = error.getUserMessage();
      
      expect(message).toContain('required parameters');
      expect(message).toContain('provided correctly');
    });
  });
  
  describe('APIError', () => {
    it('should include service name in messages', () => {
      const error = new APIError('Timeout', ErrorCode.API_TIMEOUT, 'serper');
      const message = error.getUserMessage();
      
      expect(message).toBe('The request timed out. Please try again.');
    });
    
    it('should provide rate limit recovery steps', () => {
      const error = new APIError('Rate limited', ErrorCode.API_RATE_LIMIT, 'serper');
      const message = error.getUserMessage();
      
      expect(message).toContain('wait a few minutes');
      expect(message).toContain('reducing the number');
      expect(message).toContain('quotes requested');
    });
    
    it('should guide to API key setup for auth errors', () => {
      const error = new APIError('Unauthorized', ErrorCode.API_UNAUTHORIZED, 'serper');
      const message = error.getUserMessage();
      
      expect(message).toBe('Authentication failed. Please check your API key.');
    });
    
    it('should suggest checking for updates on 404', () => {
      const error = new APIError('Not found', ErrorCode.API_NOT_FOUND, 'serper');
      const message = error.getUserMessage();
      
      expect(message).toBe('The requested resource was not found.');
    });
    
    it('should provide network troubleshooting for generic errors', () => {
      const error = new APIError('Connection failed', ErrorCode.API_ERROR);
      const message = error.getUserMessage();
      
      expect(message).toBe('An error occurred while communicating with external services.');
    });
  });
  
  describe('ConfigError', () => {
    it('should provide detailed SERPER_API_KEY setup instructions', () => {
      const error = new ConfigError('Missing API key', 'SERPER_API_KEY');
      const message = error.getUserMessage();
      
      expect(message).toContain('SERPER_API_KEY');
      expect(message).toBe('Configuration error: Missing or invalid SERPER_API_KEY');
    });
    
    it('should explain NODE_ENV options', () => {
      const error = new ConfigError('Invalid NODE_ENV', 'NODE_ENV');
      const message = error.getUserMessage();
      
      expect(message).toBe('Configuration error: Missing or invalid NODE_ENV');
    });
    
    it('should list LOG_LEVEL options', () => {
      const error = new ConfigError('Invalid LOG_LEVEL', 'LOG_LEVEL');
      const message = error.getUserMessage();
      
      expect(message).toBe('Configuration error: Missing or invalid LOG_LEVEL');
    });
    
    it('should provide general config guidance', () => {
      const error = new ConfigError('Config error');
      const message = error.getUserMessage();
      
      expect(message).toBe('Configuration error: Please check your environment settings');
    });
  });
  
  describe('NetworkError', () => {
    it('should include service in network error messages', () => {
      const error = new NetworkError('Connection refused', 'serper');
      const message = error.getUserMessage();
      
      expect(message).toBe('Network error: Unable to connect to serper. Please check your internet connection and ensure the service is accessible. If using a proxy or firewall, ensure it allows HTTPS connections to external APIs.');
    });
    
    it('should provide general network troubleshooting', () => {
      const error = new NetworkError('Network unreachable');
      const message = error.getUserMessage();
      
      expect(message).toBe('Network error: Unable to connect. Please check your internet connection and ensure the service is accessible. If using a proxy or firewall, ensure it allows HTTPS connections to external APIs.');
    });
  });
  
  describe('AuthenticationError', () => {
    it('should provide comprehensive auth troubleshooting', () => {
      const error = new AuthenticationError('401 Unauthorized', 'serper');
      const message = error.getUserMessage();
      
      expect(message).toBe('Authentication failed for serper. Please verify:\n1. Your SERPER_API_KEY is correctly set\n2. The API key is valid and active\n3. You have not exceeded your plan limits\nGet a new API key at https://serper.dev if needed.');
      expect(message).toContain('https://serper.dev');
    });
    
    it('should format multi-line guidance properly', () => {
      const error = new AuthenticationError('Invalid API key');
      const message = error.getUserMessage();
      
      expect(message).toContain('\n1.');
      expect(message).toContain('\n2.');
      expect(message).toContain('\n3.');
    });
  });
  
  describe('RateLimitError', () => {
    it('should provide rate limit mitigation strategies', () => {
      const error = new RateLimitError('429 Too Many Requests', 'serper');
      const message = error.getUserMessage();
      
      expect(message).toContain('for serper');
      expect(message).toContain('Wait a few minutes');
      expect(message).toContain('Reduce the number of quotes');
      expect(message).toContain('Space out your requests');
      expect(message).toContain('Consider upgrading your API plan');
    });
    
    it('should format numbered list properly', () => {
      const error = new RateLimitError('Rate limited');
      const message = error.getUserMessage();
      
      expect(message).toContain('\n1.');
      expect(message).toContain('\n2.');
      expect(message).toContain('\n3.');
      expect(message).toContain('\n4.');
    });
  });
  
  describe('Error Context Preservation', () => {
    it('should preserve original error details when wrapping', () => {
      const originalError = new ValidationError('Original message', 'testField');
      const wrapped = wrapError(originalError, 'Additional context');
      
      expect(wrapped.message).toContain('Additional context');
      expect(wrapped.message).toContain('Original message');
      expect(wrapped.details?.['originalError']).toBeDefined();
    });
    
    it('should maintain error code hierarchy', () => {
      const apiError = new APIError('API failed', ErrorCode.API_RATE_LIMIT);
      const wrapped = wrapError(apiError, 'Operation failed');
      
      expect(wrapped.code).toBe(ErrorCode.API_RATE_LIMIT);
      expect(wrapped.statusCode).toBe(429);
    });
  });
  
  describe('User Message Formatting', () => {
    it('should format errors for user display', () => {
      const error = new ValidationError('Invalid input', 'person');
      const formatted = ErrorFormatter.formatForUser(error);
      
      expect(formatted).toBe("Invalid value for field 'person': Invalid input. Please refer to the prompt template resource for the correct format.");
    });
    
    it('should provide generic message for unknown errors', () => {
      const error = new Error('Some internal error');
      const formatted = ErrorFormatter.formatForUser(error);
      
      expect(formatted).toBe('An unexpected error occurred. Please try again.');
    });
    
    it('should format base errors with user messages', () => {
      const error = new RateLimitError('Too many requests', 'serper');
      const formatted = ErrorFormatter.formatForUser(error);
      
      expect(formatted).toContain('Rate limit exceeded');
      expect(formatted).toContain('Wait a few minutes');
    });
  });
  
  describe('Development vs Production Messages', () => {
    const originalEnv = process.env['NODE_ENV'];
    
    afterEach(() => {
      process.env['NODE_ENV'] = originalEnv;
    });
    
    it('should include stack traces in development', () => {
      const { resetConfig } = require('../../../src/utils/config.js');
      process.env['NODE_ENV'] = 'development';
      resetConfig();
      const error = new BaseError('Test error', ErrorCode.INTERNAL_ERROR);
      const json = error.toJSON();
      
      expect(json['stack']).toBeDefined();
    });
    
    it('should exclude stack traces in production', () => {
      const { resetConfig } = require('../../../src/utils/config.js');
      process.env['NODE_ENV'] = 'production';
      resetConfig();
      const error = new BaseError('Test error', ErrorCode.INTERNAL_ERROR);
      const json = error.toJSON();
      
      expect(json['stack']).toBeUndefined();
    });
  });
});

describe('Error Utility Functions', () => {
  describe('isBaseError', () => {
    it('should identify BaseError instances', () => {
      expect(isBaseError(new BaseError('test', ErrorCode.UNKNOWN_ERROR))).toBe(true);
      expect(isBaseError(new ValidationError('test'))).toBe(true);
      expect(isBaseError(new Error('test'))).toBe(false);
      expect(isBaseError('not an error')).toBe(false);
      expect(isBaseError(null)).toBe(false);
    });
  });
  
  describe('hasErrorCode', () => {
    it('should identify objects with error codes', () => {
      expect(hasErrorCode({ code: 'TEST_ERROR' })).toBe(true);
      expect(hasErrorCode({ code: 123 })).toBe(false);
      expect(hasErrorCode({ message: 'error' })).toBe(false);
      expect(hasErrorCode(null)).toBe(false);
    });
  });
  
  describe('toBaseError', () => {
    it('should convert various error types', () => {
      const baseError = new BaseError('test', ErrorCode.UNKNOWN_ERROR);
      expect(toBaseError(baseError)).toBe(baseError);
      
      const regularError = new Error('test message');
      const converted = toBaseError(regularError);
      expect(converted).toBeInstanceOf(BaseError);
      expect(converted.message).toBe('test message');
      
      const stringError = toBaseError('string error');
      expect(stringError).toBeInstanceOf(BaseError);
      expect(stringError.details?.['originalError']).toBe('string error');
    });
  });
});