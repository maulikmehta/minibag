/**
 * Tests for nickname claiming functions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { markNicknameAsUsed, releaseNickname } from '../../src/nicknames/claim.js';
import { reserveNickname } from '../../src/nicknames/reserve.js';
import { getDatabaseClient } from '../../src/database/client.js';

describe('Nickname Claiming', () => {
  const prisma = getDatabaseClient();
  let testNicknameId: string;
  const testSessionId = 'test-session-claim';

  beforeEach(async () => {
    // Clean up and create test nickname
    await prisma.nicknamesPool.deleteMany({
      where: { nickname: 'ClaimTest' }
    });

    const nickname = await prisma.nicknamesPool.create({
      data: {
        nickname: 'ClaimTest',
        avatarEmoji: '👨',
        gender: 'male',
        isAvailable: true
      }
    });

    testNicknameId = nickname.id;
  });

  afterEach(async () => {
    await prisma.nicknamesPool.deleteMany({
      where: { nickname: 'ClaimTest' }
    });
  });

  describe('markNicknameAsUsed', () => {
    it('should claim an available nickname', async () => {
      const { data, error } = await markNicknameAsUsed(testNicknameId, testSessionId);

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data).toHaveLength(1);

      // Verify it's marked as used
      const nickname = await prisma.nicknamesPool.findUnique({
        where: { id: testNicknameId }
      });

      expect(nickname?.isAvailable).toBe(false);
      expect(nickname?.currentlyUsedIn).toBe(testSessionId);
      expect(nickname?.timesUsed).toBe(1);
      expect(nickname?.lastUsed).toBeDefined();
    });

    it('should increment times_used counter', async () => {
      // First claim
      await markNicknameAsUsed(testNicknameId, testSessionId);

      // Release and claim again
      await releaseNickname(testNicknameId);
      await markNicknameAsUsed(testNicknameId, 'another-session');

      const nickname = await prisma.nicknamesPool.findUnique({
        where: { id: testNicknameId }
      });

      expect(nickname?.timesUsed).toBe(2);
    });

    it('should fail if nickname already claimed', async () => {
      // First claim
      await markNicknameAsUsed(testNicknameId, testSessionId);

      // Second claim should fail
      const { data, error } = await markNicknameAsUsed(testNicknameId, 'different-session');

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.message).toContain('already claimed');
    });

    it('should only allow claiming if reserved by same session', async () => {
      const session1 = 'session-1';
      const session2 = 'session-2';

      // Reserve for session1
      await reserveNickname(testNicknameId, session1);

      // Session2 tries to claim
      const { data, error } = await markNicknameAsUsed(testNicknameId, session2);

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.message).toContain('reserved by another session');
    });

    it('should allow claiming if reserved by same session', async () => {
      // Reserve for session
      await reserveNickname(testNicknameId, testSessionId);

      // Same session claims
      const { data, error } = await markNicknameAsUsed(testNicknameId, testSessionId);

      expect(error).toBeNull();
      expect(data).not.toBeNull();
    });

    it('should clear reservation after claiming', async () => {
      await reserveNickname(testNicknameId, testSessionId);
      await markNicknameAsUsed(testNicknameId, testSessionId);

      const nickname = await prisma.nicknamesPool.findUnique({
        where: { id: testNicknameId }
      });

      expect(nickname?.reservedUntil).toBeNull();
      expect(nickname?.reservedBySession).toBeNull();
    });

    it('should handle empty nicknameId gracefully', async () => {
      const { data, error } = await markNicknameAsUsed('', testSessionId);

      expect(data).toBeNull();
      expect(error).toBeNull(); // Returns null structure for consistency
    });
  });

  describe('releaseNickname', () => {
    it('should release a claimed nickname back to pool', async () => {
      // Claim it first
      await markNicknameAsUsed(testNicknameId, testSessionId);

      // Release it
      const { success, error } = await releaseNickname(testNicknameId);

      expect(success).toBe(true);
      expect(error).toBeNull();

      // Verify it's available again
      const nickname = await prisma.nicknamesPool.findUnique({
        where: { id: testNicknameId }
      });

      expect(nickname?.isAvailable).toBe(true);
      expect(nickname?.currentlyUsedIn).toBeNull();
      expect(nickname?.reservedUntil).toBeNull();
      expect(nickname?.reservedBySession).toBeNull();
    });

    it('should preserve times_used count after release', async () => {
      await markNicknameAsUsed(testNicknameId, testSessionId);
      await releaseNickname(testNicknameId);

      const nickname = await prisma.nicknamesPool.findUnique({
        where: { id: testNicknameId }
      });

      expect(nickname?.timesUsed).toBe(1);
    });

    it('should handle empty nicknameId', async () => {
      const { success, error } = await releaseNickname('');

      expect(success).toBe(false);
      expect(error).not.toBeNull();
      expect(error?.message).toContain('nicknameId required');
    });
  });
});
