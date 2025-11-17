import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { server } from './helpers/msw.js';

// MSW Setup
beforeAll(() => {
  // Start MSW server before all tests
  server.listen({ onUnhandledRequest: 'warn' });
});

afterAll(() => {
  // Clean up MSW server after all tests
  server.close();
});

afterEach(() => {
  // Reset handlers after each test to ensure test isolation
  server.resetHandlers();
  // Cleanup React Testing Library
  cleanup();
});

// Mock window.matchMedia (needed for responsive components)
// Only set up browser globals if window is available (jsdom environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Mock browser APIs only in browser-like environments
if (typeof global !== 'undefined') {
  // Mock localStorage
  if (!global.localStorage) {
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    global.localStorage = localStorageMock;
  }

  // Mock sessionStorage
  if (!global.sessionStorage) {
    const sessionStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    global.sessionStorage = sessionStorageMock;
  }

  // Mock IntersectionObserver
  if (!global.IntersectionObserver) {
    global.IntersectionObserver = class IntersectionObserver {
      constructor() {}
      disconnect() {}
      observe() {}
      takeRecords() {
        return [];
      }
      unobserve() {}
    };
  }
}

// Mock console methods to reduce noise in tests (optional)
// Comment out if you want to see console output during tests
// global.console = {
//   ...console,
//   log: vi.fn(),
//   debug: vi.fn(),
//   info: vi.fn(),
//   warn: vi.fn(),
//   error: vi.fn(),
// };
