/**
 * Unit tests for configuration management
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'

import {
  getConfig,
  resetConfig,
  isProduction,
  isDevelopment,
  isTest,
  getEnvironmentConfig,
} from '../../../src/utils/config.js'

describe('Configuration Management', () => {
  // Store original env vars
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Reset config before each test
    resetConfig()
    // Create a fresh copy of env vars
    Object.keys(process.env).forEach((key) => delete process.env[key])
    Object.assign(process.env, originalEnv)
  })

  afterEach(() => {
    // Restore original env vars
    Object.keys(process.env).forEach((key) => delete process.env[key])
    Object.assign(process.env, originalEnv)
    resetConfig()
  })

  describe('getConfig', () => {
    it('should load configuration with required SERPER_API_KEY', () => {
      process.env['SERPER_API_KEY'] = 'test-api-key'

      const config = getConfig()

      expect(config.serperApiKey).toBe('test-api-key')
    })

    it('should throw error when SERPER_API_KEY is missing', () => {
      delete process.env['SERPER_API_KEY']

      expect(() => getConfig()).toThrow('Configuration validation failed')
      expect(() => getConfig()).toThrow('serperApiKey: Required')
    })

    it('should use default values when optional env vars are not set', () => {
      process.env['SERPER_API_KEY'] = 'test-api-key'
      // Jest sets NODE_ENV to 'test' by default

      const config = getConfig()

      expect(config.nodeEnv).toBe('test')
      expect(config.logLevel).toBe('info')
      expect(config.serverPort).toBe(3000)
      expect(config.serverHost).toBe('localhost')
      expect(config.apiTimeout).toBe(5000)
      expect(config.maxRetries).toBe(3)
      expect(config.cacheTtl).toBe(3600)
    })

    it('should parse environment variables correctly', () => {
      process.env['SERPER_API_KEY'] = 'test-api-key'
      process.env['NODE_ENV'] = 'production'
      process.env['LOG_LEVEL'] = 'error'
      process.env['SERVER_PORT'] = '8080'
      process.env['SERVER_HOST'] = '0.0.0.0'
      process.env['API_TIMEOUT'] = '10000'
      process.env['MAX_RETRIES'] = '5'
      process.env['CACHE_TTL'] = '7200'

      const config = getConfig()

      expect(config.nodeEnv).toBe('production')
      expect(config.logLevel).toBe('error')
      expect(config.serverPort).toBe(8080)
      expect(config.serverHost).toBe('0.0.0.0')
      expect(config.apiTimeout).toBe(10000)
      expect(config.maxRetries).toBe(5)
      expect(config.cacheTtl).toBe(7200)
    })

    it('should validate log level enum values', () => {
      process.env['SERPER_API_KEY'] = 'test-api-key'
      process.env['LOG_LEVEL'] = 'invalid-level'

      expect(() => getConfig()).toThrow('Configuration validation failed')
    })

    it('should validate node environment enum values', () => {
      process.env['SERPER_API_KEY'] = 'test-api-key'
      process.env['NODE_ENV'] = 'invalid-env'

      expect(() => getConfig()).toThrow('Configuration validation failed')
    })

    it('should validate numeric environment variables', () => {
      process.env['SERPER_API_KEY'] = 'test-api-key'
      process.env['SERVER_PORT'] = 'not-a-number'

      expect(() => getConfig()).toThrow('Configuration validation failed')
    })

    it('should validate max retries range', () => {
      process.env['SERPER_API_KEY'] = 'test-api-key'
      process.env['MAX_RETRIES'] = '15'

      expect(() => getConfig()).toThrow('Configuration validation failed')
    })

    it('should return the same instance on multiple calls', () => {
      process.env['SERPER_API_KEY'] = 'test-api-key'

      const config1 = getConfig()
      const config2 = getConfig()

      expect(config1).toBe(config2)
    })
  })

  describe('resetConfig', () => {
    it('should clear the cached configuration', () => {
      process.env['SERPER_API_KEY'] = 'test-api-key-1'
      const config1 = getConfig()

      resetConfig()

      process.env['SERPER_API_KEY'] = 'test-api-key-2'
      const config2 = getConfig()

      expect(config1.serperApiKey).toBe('test-api-key-1')
      expect(config2.serperApiKey).toBe('test-api-key-2')
    })
  })

  describe('Environment checks', () => {
    it('should correctly identify production environment', () => {
      process.env['SERPER_API_KEY'] = 'test-api-key'
      process.env['NODE_ENV'] = 'production'
      resetConfig()

      expect(isProduction()).toBe(true)
      expect(isDevelopment()).toBe(false)
      expect(isTest()).toBe(false)
    })

    it('should correctly identify development environment', () => {
      process.env['SERPER_API_KEY'] = 'test-api-key'
      process.env['NODE_ENV'] = 'development'
      resetConfig()

      expect(isProduction()).toBe(false)
      expect(isDevelopment()).toBe(true)
      expect(isTest()).toBe(false)
    })

    it('should correctly identify test environment', () => {
      process.env['SERPER_API_KEY'] = 'test-api-key'
      process.env['NODE_ENV'] = 'test'
      resetConfig()

      expect(isProduction()).toBe(false)
      expect(isDevelopment()).toBe(false)
      expect(isTest()).toBe(true)
    })
  })

  describe('getEnvironmentConfig', () => {
    it('should return production-specific config', () => {
      process.env['SERPER_API_KEY'] = 'test-api-key'
      process.env['NODE_ENV'] = 'production'
      resetConfig()

      const envConfig = getEnvironmentConfig()

      expect(envConfig.logLevel).toBe('error')
      expect(envConfig.maxRetries).toBe(5)
      expect(envConfig.apiTimeout).toBe(10000)
    })

    it('should return test-specific config', () => {
      process.env['SERPER_API_KEY'] = 'test-api-key'
      process.env['NODE_ENV'] = 'test'
      resetConfig()

      const envConfig = getEnvironmentConfig()

      expect(envConfig.logLevel).toBe('error')
      expect(envConfig.maxRetries).toBe(0)
      expect(envConfig.apiTimeout).toBe(1000)
    })

    it('should return development-specific config', () => {
      process.env['SERPER_API_KEY'] = 'test-api-key'
      process.env['NODE_ENV'] = 'development'
      resetConfig()

      const envConfig = getEnvironmentConfig()

      expect(envConfig.logLevel).toBe('debug')
      expect(envConfig.maxRetries).toBe(3)
      expect(envConfig.apiTimeout).toBe(5000)
    })
  })
})
