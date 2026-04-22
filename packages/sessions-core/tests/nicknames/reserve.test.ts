/**
 * Tests for nickname reservation functions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getTwoNicknameOptions, reserveNickname } from '../../src/nicknames/reserve.js';
import { getDatabaseClient, disconnectDatabase } from '../../src/database/client.js';

describe('Nickname Reservation', () => {
  const prisma = getDatabaseClient();

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.nicknamesPool.deleteMany({
      where: {
        nickname: {
          in: ['TestMale', 'TestFemale', 'ReservedNick']
        }
      }
    });

    // Insert test nicknames
    await prisma.nicknamesPool.createMany({
      data: [
        {
          nickname: 'TestMale',
          avatarEmoji: '👨',
          gender: 'male',
          isAvailable: true
        },
        {
          nickname: 'TestFemale',
          avatarEmoji: '👩',
          gender: 'female',
          isAvailable: true
        }
      ]
    });
  });

  afterEach(async () => {
    // Clean up after tests
    await prisma.nicknamesPool.deleteMany({
      where: {
        nickname: {
          in: ['TestMale', 'TestFemale', 'ReservedNick']
        }
      }
    });
  });

  describe('getTwoNicknameOptions', () => {
    it('should return 2 nickname options (1 male, 1 female)', async () => {
      const options = await getTwoNicknameOptions();

      expect(options).toHaveLength(2);
      expect(options.some(o => o.gender === 'male')).toBe(true);
      expect(options.some(o => o.gender === 'female')).toBe(true);
    });

    it('should return fallback nicknames when pool is empty', async () => {
      // Delete all nicknames
      await prisma.nicknamesPool.deleteMany({});

      const options = await getTwoNicknameOptions();

      expect(options).toHaveLength(2);
      expect(options[0].fallback).toBe(true);
      expect(options[1].fallback).toBe(true);
    });

    it('should match first letter when provided', async () => {
      // Add nicknames starting with 'T'
      await prisma.nicknamesPool.createMany({
        data: [
          {
            nickname: 'Teja',
            avatarEmoji: '👨',
            gender: 'male',
            isAvailable: true
          },
          {
            nickname: 'Tanu',
            avatarEmoji: '👩',
            gender: 'female',
            isAvailable: true
          }
        ]
      });

      const options = await getTwoNicknameOptions('T');

      expect(options).toHaveLength(2);
      expect(options[0].nickname).toMatch(/^T/i);
      expect(options[1].nickname).toMatch(/^T/i);
    });

    it('should reserve nicknames when sessionId provided', async () => {
      const sessionId = 'test-session-123';
      const options = await getTwoNicknameOptions(null, sessionId);

      expect(options).toHaveLength(2);

      // Verify nicknames are reserved
      const reserved = await prisma.nicknamesPool.findMany({
        where: {
          reservedBySession: sessionId
        }
      });

      expect(reserved.length).toBeGreaterThan(0);
    });
  });

  describe('reserveNickname', () => {
    it('should reserve an available nickname', async () => {
      const nickname = await prisma.nicknamesPool.findFirst({
        where: { nickname: 'TestMale' }
      });

      const sessionId = 'test-session-456';
      const { data, error } = await reserveNickname(nickname!.id, sessionId);

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data?.reservedBySession).toBe(sessionId);
      expect(data?.reservedUntil).toBeDefined();
    });

    it('should fail if nickname is already reserved', async () => {
      const nickname = await prisma.nicknamesPool.findFirst({
        where: { nickname: 'TestMale' }
      });

      const sessionId1 = 'test-session-1';
      const sessionId2 = 'test-session-2';

      // First reservation
      await reserveNickname(nickname!.id, sessionId1);

      // Second reservation should fail
      const { data, error } = await reserveNickname(nickname!.id, sessionId2);

      expect(data).toBeNull();
      expect(error).not.toBeNull();
    });

    it('should set expiry time to 5 minutes from now', async () => {
      const nickname = await prisma.nicknamesPool.findFirst({
        where: { nickname: 'TestMale' }
      });

      const sessionId = 'test-session-789';
      const beforeReserve = new Date();
      const { data } = await reserveNickname(nickname!.id, sessionId);
      const afterReserve = new Date();

      expect(data?.reservedUntil).toBeDefined();
      const reservedUntil = new Date(data!.reservedUntil!);

      // Should be ~5 minutes from now
      const fiveMinutesFromBefore = new Date(beforeReserve.getTime() + 5 * 60 * 1000);
      const fiveMinutesFromAfter = new Date(afterReserve.getTime() + 5 * 60 * 1000);

      expect(reservedUntil.getTime()).toBeGreaterThanOrEqual(fiveMinutesFromBefore.getTime() - 1000);
      expect(reservedUntil.getTime()).toBeLessThanOrEqual(fiveMinutesFromAfter.getTime() + 1000);
    });

    it('should fail with invalid parameters', async () => {
      const { data, error } = await reserveNickname('', '');

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.message).toContain('required');
    });
  });
});
