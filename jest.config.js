/**
 * Jest configuration for TypeScript and ES modules
 */

export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        // Use tsconfig settings for isolatedModules
        tsconfig: {
          module: 'ES2022',
          target: 'ES2022',
          moduleResolution: 'node',
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
        },
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/tests/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/server.ts', // Exclude server file for now
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
  // Removed deprecated globals configuration
  
  // CI environment optimizations
  testTimeout: process.env.CI ? 30000 : 10000, // Longer timeout for CI
  clearMocks: true,
  restoreMocks: true,
  detectOpenHandles: process.env.CI === 'true', // Help debug hanging tests in CI
  forceExit: process.env.CI === 'true', // Force exit in CI to prevent hanging
  maxWorkers: process.env.CI ? 2 : '50%', // Limit workers in CI for stability
  
  // Additional CI settings
  bail: process.env.CI ? 1 : 0, // Stop on first test failure in CI
  verbose: process.env.CI === 'true', // More verbose output in CI
  
  // Ensure proper module handling
  testEnvironmentOptions: {
    // Ensure NODE_OPTIONS are properly set for ESM
    customExportConditions: ['node', 'node-addons'],
  },
};