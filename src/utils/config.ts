/**
 * Configuration Management
 * 
 * Handles loading and validating environment variables
 * Provides typed configuration object for the application
 */

import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenvConfig();

/**
 * Log levels supported by the application
 */
export const LogLevel = z.enum(['debug', 'info', 'warn', 'error']);
export type LogLevel = z.infer<typeof LogLevel>;

/**
 * Node environment types
 */
export const NodeEnv = z.enum(['development', 'test', 'production']);
export type NodeEnv = z.infer<typeof NodeEnv>;

/**
 * Transport types supported by the MCP server
 */
export const TransportType = z.enum(['stdio', 'http']);
export type TransportType = z.infer<typeof TransportType>;

/**
 * Configuration schema using Zod for validation
 */
const ConfigSchema = z.object({
  // Required configuration
  serperApiKey: z.string().min(1, 'SERPER_API_KEY is required'),
  
  // Server configuration
  nodeEnv: NodeEnv.default('development'),
  logLevel: LogLevel.default('info'),
  serverPort: z.number().int().positive().default(3000),
  serverHost: z.string().default('localhost'),
  
  // Transport configuration
  transport: TransportType.default('stdio'),
  httpPort: z.number().int().positive().default(3000),
  httpHost: z.string().default('localhost'),
  httpPath: z.string().default('/mcp'),
  
  // API configuration
  apiTimeout: z.number().int().positive().default(5000),
  maxRetries: z.number().int().min(0).max(10).default(3),
  cacheTtl: z.number().int().min(0).default(3600),
});

/**
 * Configuration interface
 */
export type Config = z.infer<typeof ConfigSchema>;

/**
 * Parse and validate environment variables
 */
function loadConfig(): Config {
  try {
    const rawConfig = {
      // Required
      serperApiKey: process.env['SERPER_API_KEY'],
      
      // Server
      nodeEnv: process.env['NODE_ENV'],
      logLevel: process.env['LOG_LEVEL'],
      serverPort: process.env['SERVER_PORT'] ? parseInt(process.env['SERVER_PORT'], 10) : undefined,
      serverHost: process.env['SERVER_HOST'],
      
      // Transport
      transport: process.env['MCP_TRANSPORT'],
      httpPort: process.env['MCP_HTTP_PORT'] ? parseInt(process.env['MCP_HTTP_PORT'], 10) : undefined,
      httpHost: process.env['MCP_HTTP_HOST'],
      httpPath: process.env['MCP_HTTP_PATH'],
      
      // API
      apiTimeout: process.env['API_TIMEOUT'] ? parseInt(process.env['API_TIMEOUT'], 10) : undefined,
      maxRetries: process.env['MAX_RETRIES'] ? parseInt(process.env['MAX_RETRIES'], 10) : undefined,
      cacheTtl: process.env['CACHE_TTL'] ? parseInt(process.env['CACHE_TTL'], 10) : undefined,
    };
    
    // Parse and validate configuration
    const config = ConfigSchema.parse(rawConfig);
    
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => {
        const path = err.path.join('.');
        return `${path}: ${err.message}`;
      }).join('\n');
      
      throw new Error(`Configuration validation failed:\n${errorMessages}`);
    }
    
    throw error;
  }
}

/**
 * Singleton configuration instance
 */
let configInstance: Config | undefined;

/**
 * Get the configuration instance
 * @throws {Error} If configuration validation fails
 */
export function getConfig(): Config {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

/**
 * Reset configuration (useful for testing)
 */
export function resetConfig(): void {
  configInstance = undefined;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getConfig().nodeEnv === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getConfig().nodeEnv === 'development';
}

/**
 * Check if running in test
 */
export function isTest(): boolean {
  return getConfig().nodeEnv === 'test';
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig(): Partial<Config> {
  if (isProduction()) {
    return {
      logLevel: 'error',
      maxRetries: 5,
      apiTimeout: 10000,
    };
  }
  
  if (isTest()) {
    return {
      logLevel: 'error',
      maxRetries: 0,
      apiTimeout: 1000,
    };
  }
  
  // Development defaults
  return {
    logLevel: 'debug',
    maxRetries: 3,
    apiTimeout: 5000,
  };
}

// Export singleton config instance
export const config = getConfig();