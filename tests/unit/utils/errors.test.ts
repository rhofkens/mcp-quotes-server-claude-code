/**
 * Unit tests for error handling utilities
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  BaseError,
  MCPError,
  ValidationError,
  APIError,
  ConfigError,
  ErrorCode,
  ErrorFormatter,
  wrapError,
  isBaseError,
  hasErrorCode,
  toBaseError
} from '../../../src/utils/errors.js';

describe('Error Handling Utilities', () => {
  describe('BaseError', () => {
    it('should create a base error with all properties', () => {
      const error = new BaseError(
        'Test error message',
        ErrorCode.INTERNAL_ERROR,
        500,
        { foo: 'bar' }
      );
      
      expect(error.message).toBe('Test error message');
      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({ foo: 'bar' });
      expect(error.name).toBe('BaseError');
      expect(error.stack).toBeDefined();
    });
    
    it('should use default status code of 500', () => {
      const error = new BaseError('Test error', ErrorCode.UNKNOWN_ERROR);
      
      expect(error.statusCode).toBe(500);
    });
    
    it('should convert to JSON representation', () => {
      const error = new BaseError(
        'Test error',
        ErrorCode.INTERNAL_ERROR,
        500,
        { test: true }
      );
      
      const json = error.toJSON();
      
      expect(json).toMatchObject({
        name: 'BaseError',
        message: 'Test error',
        code: ErrorCode.INTERNAL_ERROR,
        statusCode: 500,
        details: { test: true }
      });
    });
    
    it('should return message as user message by default', () => {
      const error = new BaseError('Technical error details', ErrorCode.INTERNAL_ERROR);
      
      expect(error.getUserMessage()).toBe('Technical error details');
    });
  });
  
  describe('MCPError', () => {
    it('should create MCP error with default code', () => {
      const error = new MCPError('MCP protocol error');
      
      expect(error.message).toBe('MCP protocol error');
      expect(error.code).toBe(ErrorCode.MCP_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('MCPError');
    });
    
    it('should provide user-friendly messages for MCP errors', () => {
      const methodNotFound = new MCPError('Method not found', ErrorCode.MCP_METHOD_NOT_FOUND);
      expect(methodNotFound.getUserMessage()).toBe('The requested method is not available');
      
      const invalidParams = new MCPError('Invalid params', ErrorCode.MCP_INVALID_PARAMS);
      expect(invalidParams.getUserMessage()).toBe('Invalid parameters provided');
      
      const internalError = new MCPError('Internal error', ErrorCode.MCP_INTERNAL_ERROR);
      expect(internalError.getUserMessage()).toBe('An internal server error occurred');
      
      const genericError = new MCPError('Generic error');
      expect(genericError.getUserMessage()).toBe('An error occurred while processing your request');
    });
  });
  
  describe('ValidationError', () => {
    it('should create validation error with field name', () => {
      const error = new ValidationError('Invalid email format', 'email');
      
      expect(error.message).toBe('Invalid email format');
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.field).toBe('email');
      expect(error.details).toMatchObject({ field: 'email' });
    });
    
    it('should format user message with field name', () => {
      const error = new ValidationError('must be a valid email', 'userEmail');
      
      expect(error.getUserMessage()).toBe("Invalid value for field 'userEmail': must be a valid email");
    });
    
    it('should format user message without field name', () => {
      const error = new ValidationError('Invalid input format');
      
      expect(error.getUserMessage()).toBe('Validation error: Invalid input format');
    });
  });
  
  describe('APIError', () => {
    it('should create API error with service name', () => {
      const error = new APIError(
        'Request failed',
        ErrorCode.API_ERROR,
        'SerperAPI'
      );
      
      expect(error.message).toBe('Request failed');
      expect(error.code).toBe(ErrorCode.API_ERROR);
      expect(error.statusCode).toBe(502);
      expect(error.service).toBe('SerperAPI');
    });
    
    it('should set correct status codes for different error types', () => {
      const unauthorized = new APIError('Unauthorized', ErrorCode.API_UNAUTHORIZED);
      expect(unauthorized.statusCode).toBe(401);
      
      const notFound = new APIError('Not found', ErrorCode.API_NOT_FOUND);
      expect(notFound.statusCode).toBe(404);
      
      const rateLimit = new APIError('Rate limited', ErrorCode.API_RATE_LIMIT);
      expect(rateLimit.statusCode).toBe(429);
      
      const timeout = new APIError('Timeout', ErrorCode.API_TIMEOUT);
      expect(timeout.statusCode).toBe(504);
      
      const generic = new APIError('Generic error');
      expect(generic.statusCode).toBe(502);
    });
    
    it('should provide user-friendly messages for API errors', () => {
      const timeout = new APIError('Timeout', ErrorCode.API_TIMEOUT);
      expect(timeout.getUserMessage()).toBe('The request timed out. Please try again.');
      
      const rateLimit = new APIError('Rate limit', ErrorCode.API_RATE_LIMIT);
      expect(rateLimit.getUserMessage()).toBe('Rate limit exceeded. Please try again later.');
      
      const unauthorized = new APIError('Unauthorized', ErrorCode.API_UNAUTHORIZED);
      expect(unauthorized.getUserMessage()).toBe('Authentication failed. Please check your API credentials.');
      
      const notFound = new APIError('Not found', ErrorCode.API_NOT_FOUND);
      expect(notFound.getUserMessage()).toBe('The requested resource was not found.');
      
      const generic = new APIError('Generic error');
      expect(generic.getUserMessage()).toBe('An error occurred while communicating with external services.');
    });
  });
  
  describe('ConfigError', () => {
    it('should create config error with variable name', () => {
      const error = new ConfigError('Invalid API key', 'SERPER_API_KEY');
      
      expect(error.message).toBe('Invalid API key');
      expect(error.code).toBe(ErrorCode.CONFIG_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.variable).toBe('SERPER_API_KEY');
    });
    
    it('should format user message with variable name', () => {
      const error = new ConfigError('Not set', 'API_KEY');
      
      expect(error.getUserMessage()).toBe('Configuration error: Missing or invalid API_KEY');
    });
    
    it('should format user message without variable name', () => {
      const error = new ConfigError('Invalid configuration');
      
      expect(error.getUserMessage()).toBe('Configuration error: Please check your environment settings');
    });
  });
  
  describe('ErrorFormatter', () => {
    it('should format BaseError for logging', () => {
      const error = new BaseError(
        'Test error',
        ErrorCode.INTERNAL_ERROR,
        500,
        { test: true }
      );
      
      const formatted = ErrorFormatter.formatForLog(error);
      const parsed = JSON.parse(formatted);
      
      expect(parsed).toMatchObject({
        name: 'BaseError',
        message: 'Test error',
        code: ErrorCode.INTERNAL_ERROR,
        statusCode: 500,
        details: { test: true }
      });
    });
    
    it('should format regular Error for logging', () => {
      const error = new Error('Regular error');
      
      const formatted = ErrorFormatter.formatForLog(error);
      const parsed = JSON.parse(formatted);
      
      expect(parsed).toMatchObject({
        name: 'Error',
        message: 'Regular error'
      });
      expect(parsed.stack).toBeDefined();
    });
    
    it('should format error for user display', () => {
      const baseError = new ValidationError('Invalid input', 'email');
      expect(ErrorFormatter.formatForUser(baseError))
        .toBe("Invalid value for field 'email': Invalid input");
      
      const regularError = new Error('Technical details');
      expect(ErrorFormatter.formatForUser(regularError))
        .toBe('An unexpected error occurred. Please try again.');
    });
    
    it('should extract error details', () => {
      const baseError = new BaseError('Test', ErrorCode.INTERNAL_ERROR, 500, { foo: 'bar' });
      const details = ErrorFormatter.extractDetails(baseError);
      expect(details).toEqual({ foo: 'bar' });
      
      const regularError = new Error('Test error');
      const regularDetails = ErrorFormatter.extractDetails(regularError);
      expect(regularDetails).toMatchObject({
        name: 'Error',
        message: 'Test error'
      });
      
      const stringError = 'String error';
      const stringDetails = ErrorFormatter.extractDetails(stringError);
      expect(stringDetails).toEqual({ error: 'String error' });
    });
  });
  
  describe('wrapError', () => {
    it('should wrap BaseError with additional context', () => {
      const original = new ValidationError('Invalid input', 'email');
      const wrapped = wrapError(original, 'Failed to process request');
      
      expect(wrapped.message).toBe('Failed to process request: Invalid input');
      expect(wrapped.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(wrapped.statusCode).toBe(400);
      expect(wrapped.details?.originalError).toBeDefined();
    });
    
    it('should wrap regular Error', () => {
      const original = new Error('Connection failed');
      const wrapped = wrapError(original, 'Database error', ErrorCode.API_ERROR);
      
      expect(wrapped.message).toBe('Database error: Connection failed');
      expect(wrapped.code).toBe(ErrorCode.API_ERROR);
      expect(wrapped.statusCode).toBe(500);
      expect(wrapped.details?.originalError).toBe('Connection failed');
    });
    
    it('should wrap unknown error', () => {
      const wrapped = wrapError('String error', 'Operation failed');
      
      expect(wrapped.message).toBe('Operation failed');
      expect(wrapped.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(wrapped.details?.originalError).toBe('String error');
    });
  });
  
  describe('Type guards', () => {
    it('should identify BaseError instances', () => {
      const baseError = new BaseError('Test', ErrorCode.INTERNAL_ERROR);
      const mcpError = new MCPError('Test');
      const regularError = new Error('Test');
      
      expect(isBaseError(baseError)).toBe(true);
      expect(isBaseError(mcpError)).toBe(true);
      expect(isBaseError(regularError)).toBe(false);
      expect(isBaseError('string')).toBe(false);
      expect(isBaseError(null)).toBe(false);
    });
    
    it('should identify objects with error code', () => {
      const withCode = { code: 'ERROR_CODE', message: 'Test' };
      const withoutCode = { message: 'Test' };
      
      expect(hasErrorCode(withCode)).toBe(true);
      expect(hasErrorCode(withoutCode)).toBe(false);
      expect(hasErrorCode(null)).toBe(false);
      expect(hasErrorCode('string')).toBe(false);
      expect(hasErrorCode({ code: 123 })).toBe(false);
    });
  });
  
  describe('toBaseError', () => {
    it('should return BaseError as is', () => {
      const baseError = new BaseError('Test', ErrorCode.INTERNAL_ERROR);
      const result = toBaseError(baseError);
      
      expect(result).toBe(baseError);
    });
    
    it('should convert regular Error to BaseError', () => {
      const error = new Error('Regular error');
      const result = toBaseError(error);
      
      expect(result).toBeInstanceOf(BaseError);
      expect(result.message).toBe('Regular error');
      expect(result.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.details?.originalError).toBe('Error');
    });
    
    it('should convert unknown value to BaseError', () => {
      const result = toBaseError('String error');
      
      expect(result).toBeInstanceOf(BaseError);
      expect(result.message).toBe('An unknown error occurred');
      expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(result.details?.originalError).toBe('String error');
    });
  });
});