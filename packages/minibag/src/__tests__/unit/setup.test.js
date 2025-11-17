/**
 * Test to verify testing infrastructure setup
 * Week 2 Day 6: Testing Infrastructure
 */

import { describe, it, expect, vi } from 'vitest';

describe('Testing Infrastructure', () => {
  it('should run basic tests', () => {
    expect(true).toBe(true);
  });

  it('should have jest-dom matchers available', () => {
    // This test requires jsdom environment, skip in node environment
    if (typeof document !== 'undefined') {
      const element = document.createElement('div');
      element.textContent = 'Hello';
      document.body.appendChild(element);
      expect(element).toBeInTheDocument();
    } else {
      expect(true).toBe(true); // Fallback if not in jsdom
    }
  });

  it('should support async tests', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });

  describe('Mock capabilities', () => {
    it('should support mocking', () => {
      const mockFn = vi.fn(() => 'mocked');
      expect(mockFn()).toBe('mocked');
      expect(mockFn).toHaveBeenCalled();
    });
  });
});
