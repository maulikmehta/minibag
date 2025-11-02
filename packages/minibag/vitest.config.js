import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment (use node for utils, jsdom for components)
    environment: 'node', // Changed from jsdom to node for simple utility tests
    environmentMatchGlobs: [
      // Use jsdom only for component tests
      ['**/*.component.{test,spec}.{js,jsx}', 'jsdom'],
      ['**/components/**/*.{test,spec}.{js,jsx}', 'jsdom'],
    ],

    // Setup files
    setupFiles: ['./src/__tests__/setup.js'],

    // Global test configuration
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.config.js',
        'dist/',
        '**/*.test.{js,jsx}',
        '**/*.spec.{js,jsx}',
      ],
      // Target 50% coverage as per production readiness plan
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,
      },
    },

    // Test file patterns
    include: [
      'src/**/*.{test,spec}.{js,jsx}',
    ],

    // Timeout settings
    testTimeout: 10000,
    hookTimeout: 10000,

    // Mock configuration
    clearMocks: true,
    restoreMocks: true,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
