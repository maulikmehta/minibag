/**
 * Tests for nickname cleanup functions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { releaseExpiredReservations, releaseExpiredNicknames } from '../../src/nicknames/cleanup.js';
import { reserveNickname } from '../../src/nicknames/reserve.js';
import { markNicknameAsUsed } from '../../src/nicknames/claim.js';
import { getDatabaseClient } from '../../src/database/client.js';

describe('Nickname Cleanup', () => {
  const prisma = getDatabaseClient();
  let testNicknameId: string;

  beforeEach(async () => {
    // Clean up and create test nickname
    await prisma.nicknamesPool.deleteMany({
      where: { nickname: 'CleanupTest' }
    });

    const nickname = await prisma.nicknamesPool.create({
      data: {
        nickname: 'CleanupTest',
        avatarEmoji: '👨',
        gender: 'male',
        isAvailable: true
      }
    });

    testNicknameId = nickname.id;
  });

  afterEach(async () => {
    await prisma.nicknamesPool.deleteMany({
      where: { nickname: 'CleanupTest' }
    });
  });

  describe('releaseExpiredReservations', () => {
    it('should release expired reservations', async () => {
      // Create an expired reservation (set reservedUntil to past)
      const pastTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago

      await prisma.nicknamesPool.update({
        where: { id: testNicknameId },
        data: {
          reservedUntil: pastTime,
          reservedBySession: 'expired-session',
          isAvailable: true
        }
      });

      // Run cleanup
      const { released, error } = await releaseExpiredReservations();

      expect(error).toBeNull();
      expect(released).toBeGreaterThan(0);

      // Verify reservation was cleared
      const nickname = await prisma.nicknamesPool.findUnique({
        where: { id: testNicknameId }
      });

      expect(nickname?.reservedUntil).toBeNull();
      expect(nickname?.reservedBySession).toBeNull();
    });

    it('should NOT release active reservations', async () => {
      // Create an active reservation
      await reserveNickname(testNicknameId, 'active-session');

      const { released } = await releaseExpiredReservations();

      // Our reservation should still be there
      const nickname = await prisma.nicknamesPool.findUnique({
        where: { id: testNicknameId }
      });

      expect(nickname?.reservedBySession).toBe('active-session');
      expect(nickname?.reservedUntil).not.toBeNull();
    });

    it('should NOT release claimed nicknames', async () => {
      // Mark as used
      await markNicknameAsUsed(testNicknameId, 'test-session');

      // Set an expired reservation time (edge case)
      await prisma.nicknamesPool.update({
        where: { id: testNicknameId },
        data: {
          reservedUntil: new Date(Date.now() - 10 * 60 * 1000),
          reservedBySession: 'old-session'
        }
      });

      const { released } = await releaseExpiredReservations();

      // Nickname should still be marked as used
      const nickname = await prisma.nicknamesPool.findUnique({
        where: { id: testNicknameId }
      });

      expect(nickname?.isAvailable).toBe(false);
      expect(nickname?.currentlyUsedIn).toBe('test-session');
    });
  });

  describe('releaseExpiredNicknames', () => {
    it('should release nicknames not used in 4+ hours', async () => {
      // Mark nickname as used with old timestamp
      const fourHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000); // 5 hours ago

      await prisma.nicknamesPool.update({
        where: { id: testNicknameId },
        data: {
          isAvailable: false,
          currentlyUsedIn: 'old-session',
          lastUsed: fourHoursAgo,
          timesUsed: 1
        }
      });

      // Run cleanup
      const { released, error } = await releaseExpiredNicknames();

      expect(error).toBeNull();
      expect(released).toBeGreaterThan(0);

      // Verify nickname was released
      const nickname = await prisma.nicknamesPool.findUnique({
        where: { id: testNicknameId }
      });

      expect(nickname?.isAvailable).toBe(true);
      expect(nickname?.currentlyUsedIn).toBeNull();
    });

    it('should NOT release recently used nicknames', async () => {
      // Mark nickname as used recently
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);

      await prisma.nicknamesPool.update({
        where: { id: testNicknameId },
        data: {
          isAvailable: false,
          currentlyUsedIn: 'recent-session',
          lastUsed: oneHourAgo,
          timesUsed: 1
        }
      });

      // Run cleanup
      await releaseExpiredNicknames();

      // Verify nickname was NOT released
      const nickname = await prisma.nicknamesPool.findUnique({
        where: { id: testNicknameId }
      });

      expect(nickname?.isAvailable).toBe(false);
      expect(nickname?.currentlyUsedIn).toBe('recent-session');
    });

    it('should preserve times_used after release', async () => {
      const fourHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);

      await prisma.nicknamesPool.update({
        where: { id: testNicknameId },
        data: {
          isAvailable: false,
          currentlyUsedIn: 'old-session',
          lastUsed: fourHoursAgo,
          timesUsed: 5
        }
      });

      await releaseExpiredNicknames();

      const nickname = await prisma.nicknamesPool.findUnique({
        where: { id: testNicknameId }
      });

      expect(nickname?.timesUsed).toBe(5);
    });
  });
});
