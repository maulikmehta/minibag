/**
 * Unit Tests for Session Transformers
 * Week 2 Day 7: Comprehensive tests with null/undefined cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the frontend logger to avoid browser globals
vi.mock('@shared/utils/frontendLogger.js', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  transformParticipantItems,
  transformParticipant,
  extractHostItems,
  extractNonHostParticipants,
  transformSessionData,
  extractFirstName,
  ValidationError,
} from '../../../utils/sessionTransformers.js';

describe('sessionTransformers', () => {
  describe('transformParticipantItems', () => {
    describe('happy path', () => {
      it('should transform valid items array to object map', () => {
        const apiItems = [
          {
            item_id: 'uuid-1',
            quantity: 2,
            catalog_item: { item_id: 'v001', name: 'Tomatoes' },
          },
          {
            item_id: 'uuid-2',
            quantity: 1.5,
            catalog_item: { item_id: 'v002', name: 'Onions' },
          },
        ];

        const result = transformParticipantItems(apiItems);

        expect(result).toEqual({
          v001: 2,
          v002: 1.5,
        });
      });

      it('should use catalog items for defensive lookup when catalog_item is missing', () => {
        const apiItems = [
          {
            item_id: 'uuid-1',
            quantity: 2,
            // catalog_item missing
          },
        ];

        const catalogItems = [
          { id: 'uuid-1', item_id: 'v001', name: 'Tomatoes' },
        ];

        const result = transformParticipantItems(apiItems, catalogItems);

        expect(result).toEqual({
          v001: 2,
        });
      });
    });

    describe('null safety', () => {
      it('should return empty object for null input', () => {
        const result = transformParticipantItems(null);
        expect(result).toEqual({});
      });

      it('should return empty object for undefined input', () => {
        const result = transformParticipantItems(undefined);
        expect(result).toEqual({});
      });

      it('should return empty object for non-array input', () => {
        const result = transformParticipantItems('not an array');
        expect(result).toEqual({});
      });

      it('should skip null items in array', () => {
        const apiItems = [
          {
            item_id: 'uuid-1',
            quantity: 2,
            catalog_item: { item_id: 'v001' },
          },
          null,
          {
            item_id: 'uuid-2',
            quantity: 1,
            catalog_item: { item_id: 'v002' },
          },
        ];

        const result = transformParticipantItems(apiItems);

        expect(result).toEqual({
          v001: 2,
          v002: 1,
        });
      });

      it('should skip items with null catalog_item when no catalogItems provided', () => {
        const apiItems = [
          {
            item_id: 'uuid-1',
            quantity: 2,
            catalog_item: null,
          },
        ];

        const result = transformParticipantItems(apiItems);
        expect(result).toEqual({});
      });

      it('should handle items with undefined catalog_item', () => {
        const apiItems = [
          {
            item_id: 'uuid-1',
            quantity: 2,
            catalog_item: undefined,
          },
        ];

        const result = transformParticipantItems(apiItems);
        expect(result).toEqual({});
      });
    });

    describe('validation', () => {
      it('should skip items with invalid quantity (NaN)', () => {
        const apiItems = [
          {
            item_id: 'uuid-1',
            quantity: 'invalid',
            catalog_item: { item_id: 'v001' },
          },
        ];

        const result = transformParticipantItems(apiItems);
        expect(result).toEqual({});
      });

      it('should skip items with negative quantity', () => {
        const apiItems = [
          {
            item_id: 'uuid-1',
            quantity: -1,
            catalog_item: { item_id: 'v001' },
          },
        ];

        const result = transformParticipantItems(apiItems);
        expect(result).toEqual({});
      });

      it('should skip items with zero quantity', () => {
        const apiItems = [
          {
            item_id: 'uuid-1',
            quantity: 0,
            catalog_item: { item_id: 'v001' },
          },
        ];

        const result = transformParticipantItems(apiItems);
        expect(result).toEqual({});
      });

      it('should skip items without resolvable item_id', () => {
        const apiItems = [
          {
            item_id: 'uuid-unknown',
            quantity: 2,
            // no catalog_item and not in catalogItems
          },
        ];

        const catalogItems = [
          { id: 'uuid-different', item_id: 'v001' },
        ];

        const result = transformParticipantItems(apiItems, catalogItems);
        expect(result).toEqual({});
      });
    });

    describe('edge cases', () => {
      it('should handle empty array', () => {
        const result = transformParticipantItems([]);
        expect(result).toEqual({});
      });

      it('should handle array with only invalid items', () => {
        const apiItems = [
          null,
          undefined,
          'invalid',
          { quantity: 2 }, // missing item_id and catalog_item
        ];

        const result = transformParticipantItems(apiItems);
        expect(result).toEqual({});
      });

      it('should handle fractional quantities', () => {
        const apiItems = [
          {
            item_id: 'uuid-1',
            quantity: 0.25,
            catalog_item: { item_id: 'v001' },
          },
          {
            item_id: 'uuid-2',
            quantity: 1.75,
            catalog_item: { item_id: 'v002' },
          },
        ];

        const result = transformParticipantItems(apiItems);

        expect(result).toEqual({
          v001: 0.25,
          v002: 1.75,
        });
      });

      it('should handle string quantities that parse to valid numbers', () => {
        const apiItems = [
          {
            item_id: 'uuid-1',
            quantity: '2.5',
            catalog_item: { item_id: 'v001' },
          },
        ];

        const result = transformParticipantItems(apiItems);

        expect(result).toEqual({
          v001: 2.5,
        });
      });
    });
  });

  describe('transformParticipant', () => {
    describe('happy path', () => {
      it('should transform valid participant', () => {
        const apiParticipant = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          session_id: '023e4567-e89b-12d3-a456-426614174000',
          created_at: new Date().toISOString(),
          nickname: 'TestUser',
          real_name: 'John Doe',
          avatar_emoji: '😀',
          is_creator: false,
          marked_not_coming: false,
          items: [
            {
              id: '223e4567-e89b-12d3-a456-426614174000',
              item_id: 'uuid-1',
              quantity: 2,
              catalog_item: {
                item_id: 'v001',
                name_en: 'Tomatoes'
              },
            },
          ],
        };

        const result = transformParticipant(apiParticipant);

        expect(result).toMatchObject({
          id: '123e4567-e89b-12d3-a456-426614174000',
          nickname: 'TestUser',
          real_name: 'John Doe',
          avatar_emoji: '😀',
          is_creator: false,
          marked_not_coming: false,
          items: {
            v001: 2,
          },
        });
      });

      it('should use nickname as name when real_name is missing', () => {
        const apiParticipant = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          session_id: '023e4567-e89b-12d3-a456-426614174000',
          created_at: new Date().toISOString(),
          nickname: 'CoolCat',
          is_creator: false,
          items: [],
        };

        const result = transformParticipant(apiParticipant);

        expect(result.name).toBe('CoolCat');
      });

      it('should prefer nickname over real_name', () => {
        const apiParticipant = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          session_id: '023e4567-e89b-12d3-a456-426614174000',
          created_at: new Date().toISOString(),
          nickname: 'JD',
          real_name: 'John Doe',
          is_creator: false,
          items: [],
        };

        const result = transformParticipant(apiParticipant);

        // Should use nickname when both are present
        expect(result.name).toBe('JD');
        expect(result.nickname).toBe('JD');
        expect(result.real_name).toBe('John Doe');
      });

      it('should use nickname as name', () => {
        const apiParticipant = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          session_id: '023e4567-e89b-12d3-a456-426614174000',
          created_at: new Date().toISOString(),
          nickname: 'TestNick',
          is_creator: false,
          items: [],
        };

        const result = transformParticipant(apiParticipant);

        expect(result.name).toBe('TestNick');
      });
    });

    describe('null safety', () => {
      it('should return null for null input', () => {
        const result = transformParticipant(null);
        expect(result).toBeNull();
      });

      it('should return null for undefined input', () => {
        const result = transformParticipant(undefined);
        expect(result).toBeNull();
      });

      it('should return null for non-object input', () => {
        const result = transformParticipant('not an object');
        expect(result).toBeNull();
      });

      it('should handle participant with empty items array', () => {
        const apiParticipant = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          session_id: '023e4567-e89b-12d3-a456-426614174000',
          created_at: new Date().toISOString(),
          nickname: 'TestUser',
          is_creator: false,
          items: [], // Empty array instead of null
        };

        const result = transformParticipant(apiParticipant);

        expect(result.items).toEqual({});
      });

      it('should handle participant with undefined items', () => {
        const apiParticipant = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          session_id: '023e4567-e89b-12d3-a456-426614174000',
          created_at: new Date().toISOString(),
          nickname: 'TestUser',
          is_creator: false,
          // items not provided
        };

        const result = transformParticipant(apiParticipant);

        expect(result.items).toEqual({});
      });
    });

    describe('validation', () => {
      it('should throw ValidationError for missing required fields', () => {
        const invalidParticipant = {
          // missing id
          nickname: 'TestUser',
        };

        expect(() => transformParticipant(invalidParticipant)).toThrow(ValidationError);
      });

      it('should throw ValidationError with formatted message', () => {
        const invalidParticipant = {
          id: 123, // should be string
          nickname: 'TestUser',
        };

        try {
          transformParticipant(invalidParticipant);
          expect.fail('Should have thrown ValidationError');
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.getFormattedMessage()).toContain('Invalid participant data');
        }
      });
    });
  });

  describe('extractHostItems', () => {
    it('should extract items from host participant', () => {
      const apiParticipants = [
        {
          id: 'participant-1',
          nickname: 'Host',
          is_creator: true,
          items: [
            {
              item_id: 'uuid-1',
              quantity: 2,
              catalog_item: { item_id: 'v001' },
            },
          ],
        },
        {
          id: 'participant-2',
          nickname: 'Guest',
          is_creator: false,
          items: [],
        },
      ];

      const result = extractHostItems(apiParticipants);

      expect(result).toEqual({
        v001: 2,
      });
    });

    it('should return empty object when no host participant', () => {
      const apiParticipants = [
        {
          id: 'participant-1',
          nickname: 'Guest1',
          is_creator: false,
          items: [],
        },
      ];

      const result = extractHostItems(apiParticipants);
      expect(result).toEqual({});
    });

    it('should return empty object for null input', () => {
      const result = extractHostItems(null);
      expect(result).toEqual({});
    });

    it('should return empty object for undefined input', () => {
      const result = extractHostItems(undefined);
      expect(result).toEqual({});
    });

    it('should return empty object when host has no items', () => {
      const apiParticipants = [
        {
          id: 'participant-1',
          nickname: 'Host',
          is_creator: true,
          items: null,
        },
      ];

      const result = extractHostItems(apiParticipants);
      expect(result).toEqual({});
    });
  });

  describe('extractNonHostParticipants', () => {
    it('should extract non-host participants', () => {
      const apiParticipants = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          session_id: '023e4567-e89b-12d3-a456-426614174000',
          created_at: new Date().toISOString(),
          nickname: 'Host',
          is_creator: true,
          items: [],
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          session_id: '023e4567-e89b-12d3-a456-426614174000',
          created_at: new Date().toISOString(),
          nickname: 'Guest1',
          is_creator: false,
          marked_not_coming: false,
          items: [],
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174003',
          session_id: '023e4567-e89b-12d3-a456-426614174000',
          created_at: new Date().toISOString(),
          nickname: 'Guest2',
          is_creator: false,
          marked_not_coming: false,
          items: [],
        },
      ];

      const result = extractNonHostParticipants(apiParticipants);

      expect(result).toHaveLength(2);
      expect(result[0].nickname).toBe('Guest1');
      expect(result[1].nickname).toBe('Guest2');
    });

    it('should exclude marked_not_coming participants', () => {
      const apiParticipants = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          session_id: '023e4567-e89b-12d3-a456-426614174000',
          created_at: new Date().toISOString(),
          nickname: 'Guest1',
          is_creator: false,
          marked_not_coming: false,
          items: [],
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          session_id: '023e4567-e89b-12d3-a456-426614174000',
          created_at: new Date().toISOString(),
          nickname: 'Guest2',
          is_creator: false,
          marked_not_coming: true,
          items: [],
        },
      ];

      const result = extractNonHostParticipants(apiParticipants);

      expect(result).toHaveLength(1);
      expect(result[0].nickname).toBe('Guest1');
    });

    it('should return empty array for null input', () => {
      const result = extractNonHostParticipants(null);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined input', () => {
      const result = extractNonHostParticipants(undefined);
      expect(result).toEqual([]);
    });

    it('should filter out invalid participants', () => {
      const apiParticipants = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          session_id: '023e4567-e89b-12d3-a456-426614174000',
          created_at: new Date().toISOString(),
          nickname: 'Guest1',
          is_creator: false,
          items: [],
        },
        null, // invalid - will be filtered out
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          session_id: '023e4567-e89b-12d3-a456-426614174000',
          created_at: new Date().toISOString(),
          nickname: 'Guest2',
          is_creator: false,
          items: [],
        },
      ];

      const result = extractNonHostParticipants(apiParticipants);

      expect(result).toHaveLength(2);
    });
  });

  describe('transformSessionData', () => {
    it('should transform complete session data', () => {
      const session = { id: 'session-1' };
      const apiParticipants = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          session_id: '023e4567-e89b-12d3-a456-426614174000',
          created_at: new Date().toISOString(),
          nickname: 'Host',
          is_creator: true,
          items: [
            {
              id: '223e4567-e89b-12d3-a456-426614174001',
              item_id: 'uuid-1',
              quantity: 2,
              catalog_item: {
                item_id: 'v001',
                name_en: 'Tomatoes'
              },
            },
          ],
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          session_id: '023e4567-e89b-12d3-a456-426614174000',
          created_at: new Date().toISOString(),
          nickname: 'Guest1',
          is_creator: false,
          items: [
            {
              id: '223e4567-e89b-12d3-a456-426614174002',
              item_id: 'uuid-2',
              quantity: 1,
              catalog_item: {
                item_id: 'v002',
                name_en: 'Onions'
              },
            },
          ],
        },
      ];

      const result = transformSessionData(session, apiParticipants);

      expect(result).toHaveProperty('hostItems');
      expect(result).toHaveProperty('participants');
      expect(result.hostItems).toEqual({ v001: 2 });
      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].items).toEqual({ v002: 1 });
    });

    it('should handle session with no participants', () => {
      const result = transformSessionData({}, []);

      expect(result.hostItems).toEqual({});
      expect(result.participants).toEqual([]);
    });
  });

  describe('extractFirstName', () => {
    it('should extract first name from full name', () => {
      expect(extractFirstName('John Doe')).toBe('John');
    });

    it('should return the name if no space', () => {
      expect(extractFirstName('John')).toBe('John');
    });

    it('should handle multiple spaces', () => {
      expect(extractFirstName('John Michael Doe')).toBe('John');
    });

    it('should return null for null input', () => {
      expect(extractFirstName(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(extractFirstName(undefined)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(extractFirstName('')).toBeNull();
    });

    it('should handle names with leading/trailing spaces', () => {
      expect(extractFirstName('  John Doe  ')).toBe('');
    });
  });

  describe('ValidationError', () => {
    it('should create error with message', () => {
      const error = new ValidationError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Test error');
    });

    it('should include Zod error details', () => {
      const zodError = {
        issues: [
          { path: ['field1'], message: 'Required' },
          { path: ['field2', 'nested'], message: 'Invalid type' },
        ],
      };

      const error = new ValidationError('Validation failed', zodError);

      expect(error.details).toEqual(zodError.issues);
    });

    it('should format error message with details', () => {
      const zodError = {
        issues: [
          { path: ['field1'], message: 'Required' },
        ],
      };

      const error = new ValidationError('Validation failed', zodError);
      const formatted = error.getFormattedMessage();

      expect(formatted).toContain('Validation failed');
      expect(formatted).toContain('field1: Required');
    });

    it('should return basic message when no details', () => {
      const error = new ValidationError('Simple error');
      const formatted = error.getFormattedMessage();

      expect(formatted).toBe('Simple error');
    });
  });
});
