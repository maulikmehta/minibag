import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment for Node.js backend
    environment: 'node',

    // Setup files
    setupFiles: ['./src/__tests__/setup.js'],

    // Global test configuration
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.config.js',
        'dist/',
        '**/*.test.{js,jsx}',
        '**/*.spec.{js,jsx}',
        'server.js', // Main entry point
      ],
      // Week 2 Target: 30%+ coverage (API endpoints focus)
      // Will increase to 60%+ by Week 4
      thresholds: {
        lines: 30,
        functions: 30,
        branches: 30,
        statements: 30,
      },
    },

    // Test file patterns
    include: [
      'src/**/*.{test,spec}.{js,jsx}',
      '__tests__/**/*.{test,spec}.{js,jsx}',
    ],

    // Timeout settings (longer for integration tests)
    testTimeout: 15000,
    hookTimeout: 15000,

    // Mock configuration
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
