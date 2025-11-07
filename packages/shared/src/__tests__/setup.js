/**
 * Test Setup for Shared Package (Backend)
 *
 * Configures the testing environment for backend API tests
 */

import { expect, afterEach, beforeAll, afterAll, vi, beforeEach } from 'vitest';

// Set up test environment variables
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';

  // Mock database connection (prevent real DB connections during tests)
  process.env.SUPABASE_URL = 'http://localhost:54321';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

  // JWT secret for tests
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';

  // CORS configuration for tests
  process.env.FRONTEND_URL = 'http://localhost:5173';
});

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  vi.clearAllMocks();
});

// Clean up after all tests
afterAll(() => {
  // Restore original environment
  vi.restoreAllMocks();
});

// Mock console methods to reduce noise in tests
// Uncomment if you want to suppress console output during tests
// global.console = {
//   ...console,
//   log: vi.fn(),
//   debug: vi.fn(),
//   info: vi.fn(),
//   warn: vi.fn(),
//   error: vi.fn(),
// };
