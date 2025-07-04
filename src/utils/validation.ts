/**
 * Validation Utilities
 * 
 * Input validation helpers and type guards for MCP requests
 */

import { z, ZodError, ZodSchema } from 'zod';
import { ValidationError, ErrorCode } from './errors.js';

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  /**
   * Non-empty string validation
   */
  nonEmptyString: z.string().min(1, 'Value cannot be empty'),
  
  /**
   * Positive integer validation
   */
  positiveInteger: z.number().int().positive(),
  
  /**
   * URL validation
   */
  url: z.string().url('Invalid URL format'),
  
  /**
   * Email validation
   */
  email: z.string().email('Invalid email format'),
  
  /**
   * UUID validation
   */
  uuid: z.string().uuid('Invalid UUID format'),
  
  /**
   * ISO date string validation
   */
  isoDate: z.string().datetime('Invalid ISO date format'),
};

/**
 * MCP request validation schemas
 */
export const MCPSchemas = {
  /**
   * Base MCP request structure
   */
  baseRequest: z.object({
    jsonrpc: z.literal('2.0'),
    method: z.string().min(1),
    id: z.union([z.string(), z.number()]),
    params: z.unknown().optional(),
  }),
  
  /**
   * Tool call request
   */
  toolCallRequest: z.object({
    jsonrpc: z.literal('2.0'),
    method: z.literal('tools/call'),
    id: z.union([z.string(), z.number()]),
    params: z.object({
      name: z.string().min(1),
      arguments: z.record(z.unknown()).optional(),
    }),
  }),
  
  /**
   * Resource read request
   */
  resourceReadRequest: z.object({
    jsonrpc: z.literal('2.0'),
    method: z.literal('resources/read'),
    id: z.union([z.string(), z.number()]),
    params: z.object({
      uri: z.string().min(1),
    }),
  }),
};

/**
 * Quote-specific validation schemas
 */
export const QuoteSchemas = {
  /**
   * Get quotes parameters
   */
  getQuotesParams: z.object({
    person: CommonSchemas.nonEmptyString,
    numberOfQuotes: z.number()
      .int()
      .min(1, 'Number of quotes must be at least 1')
      .max(20, 'Number of quotes cannot exceed 20'),
    topic: z.string().optional(),
  }),
  
  /**
   * Quote object
   */
  quote: z.object({
    text: CommonSchemas.nonEmptyString,
    author: CommonSchemas.nonEmptyString,
    source: z.string().optional(),
    date: z.string().optional(),
    context: z.string().optional(),
  }),
};

/**
 * Validate data against a schema
 * @throws {ValidationError} If validation fails
 */
export function validate<T>(
  schema: ZodSchema<T>,
  data: unknown,
  fieldName?: string
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.errors.map(issue => {
        const path = issue.path.join('.');
        return `${path}: ${issue.message}`;
      }).join('; ');
      
      throw new ValidationError(
        `Validation failed: ${issues}`,
        fieldName,
        { issues: error.errors }
      );
    }
    
    throw new ValidationError(
      'Unknown validation error',
      fieldName,
      { originalError: error }
    );
  }
}

/**
 * Safe validation that returns a result object
 */
export function safeValidate<T>(
  schema: ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: ValidationError } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.errors.map(issue => {
        const path = issue.path.join('.');
        return `${path}: ${issue.message}`;
      }).join('; ');
      
      return {
        success: false,
        error: new ValidationError(
          `Validation failed: ${issues}`,
          undefined,
          { issues: error.errors }
        ),
      };
    }
    
    return {
      success: false,
      error: new ValidationError(
        'Unknown validation error',
        undefined,
        { originalError: error }
      ),
    };
  }
}

/**
 * Type guard for MCP request
 */
export function isMCPRequest(data: unknown): data is z.infer<typeof MCPSchemas.baseRequest> {
  return MCPSchemas.baseRequest.safeParse(data).success;
}

/**
 * Type guard for tool call request
 */
export function isToolCallRequest(data: unknown): data is z.infer<typeof MCPSchemas.toolCallRequest> {
  return MCPSchemas.toolCallRequest.safeParse(data).success;
}

/**
 * Type guard for resource read request
 */
export function isResourceReadRequest(data: unknown): data is z.infer<typeof MCPSchemas.resourceReadRequest> {
  return MCPSchemas.resourceReadRequest.safeParse(data).success;
}

/**
 * Validate required environment variable
 */
export function validateEnvVar(name: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new ValidationError(
      `Required environment variable ${name} is not set`,
      name,
      { code: ErrorCode.MISSING_ENV_VAR }
    );
  }
  return value;
}

/**
 * Validate optional environment variable with default
 */
export function validateOptionalEnvVar(
  _name: string,
  value: string | undefined,
  defaultValue: string
): string {
  if (!value || value.trim() === '') {
    return defaultValue;
  }
  return value;
}

/**
 * Parse and validate integer environment variable
 */
export function parseIntEnvVar(
  name: string,
  value: string | undefined,
  defaultValue: number,
  min?: number,
  max?: number
): number {
  if (!value) {
    return defaultValue;
  }
  
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new ValidationError(
      `Environment variable ${name} must be a valid integer`,
      name,
      { value }
    );
  }
  
  if (min !== undefined && parsed < min) {
    throw new ValidationError(
      `Environment variable ${name} must be at least ${min}`,
      name,
      { value, min }
    );
  }
  
  if (max !== undefined && parsed > max) {
    throw new ValidationError(
      `Environment variable ${name} must be at most ${max}`,
      name,
      { value, max }
    );
  }
  
  return parsed;
}

/**
 * Parse and validate boolean environment variable
 */
export function parseBooleanEnvVar(
  name: string,
  value: string | undefined,
  defaultValue: boolean
): boolean {
  if (!value) {
    return defaultValue;
  }
  
  const lowercased = value.toLowerCase();
  if (lowercased === 'true' || lowercased === '1' || lowercased === 'yes') {
    return true;
  }
  
  if (lowercased === 'false' || lowercased === '0' || lowercased === 'no') {
    return false;
  }
  
  throw new ValidationError(
    `Environment variable ${name} must be a boolean (true/false, 1/0, yes/no)`,
    name,
    { value }
  );
}

/**
 * Create a validation middleware for MCP handlers
 */
export function createValidator<T>(schema: ZodSchema<T>) {
  return (params: unknown): T => {
    return validate(schema, params, 'params');
  };
}

/**
 * Validate array bounds
 */
export function validateArrayBounds<T>(
  array: T[],
  fieldName: string,
  minLength?: number,
  maxLength?: number
): void {
  if (minLength !== undefined && array.length < minLength) {
    throw new ValidationError(
      `Array must have at least ${minLength} items`,
      fieldName,
      { actualLength: array.length, minLength }
    );
  }
  
  if (maxLength !== undefined && array.length > maxLength) {
    throw new ValidationError(
      `Array cannot have more than ${maxLength} items`,
      fieldName,
      { actualLength: array.length, maxLength }
    );
  }
}

/**
 * Validate string bounds
 */
export function validateStringBounds(
  value: string,
  fieldName: string,
  minLength?: number,
  maxLength?: number
): void {
  if (minLength !== undefined && value.length < minLength) {
    throw new ValidationError(
      `String must have at least ${minLength} characters`,
      fieldName,
      { actualLength: value.length, minLength }
    );
  }
  
  if (maxLength !== undefined && value.length > maxLength) {
    throw new ValidationError(
      `String cannot have more than ${maxLength} characters`,
      fieldName,
      { actualLength: value.length, maxLength }
    );
  }
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Validate and sanitize search query
 */
export function validateSearchQuery(query: string, fieldName = 'query'): string {
  const sanitized = sanitizeString(query);
  validateStringBounds(sanitized, fieldName, 1, 200);
  return sanitized;
}