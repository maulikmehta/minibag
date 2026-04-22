/**
 * Tests for race conditions in nickname claiming
 * These tests verify that concurrent operations don't cause conflicts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { reserveNickname, getTwoNicknameOptions } from '../../src/nicknames/reserve.js';
import { markNicknameAsUsed } from '../../src/nicknames/claim.js';
import { getDatabaseClient } from '../../src/database/client.js';

describe('Nickname Race Conditions', () => {
  const prisma = getDatabaseClient();
  let testNicknameId: string;

  beforeEach(async () => {
    // Create test nickname
    await prisma.nicknamesPool.deleteMany({
      where: { nickname: 'RaceTest' }
    });

    const nickname = await prisma.nicknamesPool.create({
      data: {
        nickname: 'RaceTest',
        avatarEmoji: '👨',
        gender: 'male',
        isAvailable: true
      }
    });

    testNicknameId = nickname.id;
  });

  afterEach(async () => {
    await prisma.nicknamesPool.deleteMany({
      where: { nickname: 'RaceTest' }
    });
  });

  it('should handle concurrent reservation attempts', async () => {
    const session1 = 'session-1';
    const session2 = 'session-2';
    const session3 = 'session-3';

    // Try to reserve the same nickname concurrently
    const promises = [
      reserveNickname(testNicknameId, session1),
      reserveNickname(testNicknameId, session2),
      reserveNickname(testNicknameId, session3)
    ];

    const results = await Promise.all(promises);

    // Only ONE should succeed
    const successful = results.filter(r => r.data !== null);
    const failed = results.filter(r => r.data === null);

    expect(successful).toHaveLength(1);
    expect(failed).toHaveLength(2);

    // Verify only one session has the reservation
    const nickname = await prisma.nicknamesPool.findUnique({
      where: { id: testNicknameId }
    });

    const successfulSession = successful[0].data?.reservedBySession;
    expect(nickname?.reservedBySession).toBe(successfulSession);
  });

  it('should handle concurrent claim attempts', async () => {
    const session1 = 'session-1';
    const session2 = 'session-2';

    // Try to claim the same nickname concurrently
    const promises = [
      markNicknameAsUsed(testNicknameId, session1),
      markNicknameAsUsed(testNicknameId, session2)
    ];

    const results = await Promise.all(promises);

    // Only ONE should succeed
    const successful = results.filter(r => r.data !== null && r.data.length > 0);
    const failed = results.filter(r => r.data === null || r.data.length === 0);

    expect(successful).toHaveLength(1);
    expect(failed).toHaveLength(1);

    // Verify the nickname is claimed by only one session
    const nickname = await prisma.nicknamesPool.findUnique({
      where: { id: testNicknameId }
    });

    expect(nickname?.isAvailable).toBe(false);
    expect(nickname?.timesUsed).toBe(1); // Should only be incremented once
  });

  it('should handle concurrent getTwoNicknameOptions calls', async () => {
    // Create 2 nicknames (1 male, 1 female)
    await prisma.nicknamesPool.deleteMany({});
    await prisma.nicknamesPool.createMany({
      data: [
        {
          nickname: 'OnlyMale',
          avatarEmoji: '👨',
          gender: 'male',
          isAvailable: true
        },
        {
          nickname: 'OnlyFemale',
          avatarEmoji: '👩',
          gender: 'female',
          isAvailable: true
        }
      ]
    });

    const session1 = 'session-1';
    const session2 = 'session-2';

    // Two sessions try to get options simultaneously
    const promises = [
      getTwoNicknameOptions(null, session1),
      getTwoNicknameOptions(null, session2)
    ];

    const [options1, options2] = await Promise.all(promises);

    // Both should get options
    expect(options1).toHaveLength(2);
    expect(options2).toHaveLength(2);

    // Check how many were from pool vs fallback
    const poolOptions1 = options1.filter(o => !o.fallback);
    const poolOptions2 = options2.filter(o => !o.fallback);
    const fallbackOptions1 = options1.filter(o => o.fallback);
    const fallbackOptions2 = options2.filter(o => o.fallback);

    // One session should get pool nicknames, other should get fallbacks
    // (or both get 1 pool + 1 fallback)
    const totalPoolOptions = poolOptions1.length + poolOptions2.length;
    const totalFallbackOptions = fallbackOptions1.length + fallbackOptions2.length;

    expect(totalPoolOptions).toBeLessThanOrEqual(2); // Max 2 pool nicknames available
    expect(totalFallbackOptions).toBeGreaterThanOrEqual(2); // At least 2 fallbacks needed
  });

  it('should prevent double-claiming via reservation', async () => {
    const session1 = 'session-1';
    const session2 = 'session-2';

    // Session 1 reserves
    await reserveNickname(testNicknameId, session1);

    // Session 2 tries to reserve (should fail)
    const { data: reserved } = await reserveNickname(testNicknameId, session2);
    expect(reserved).toBeNull();

    // Session 2 tries to claim directly (should fail - reserved by session1)
    const { data: claimed, error } = await markNicknameAsUsed(testNicknameId, session2);
    expect(claimed).toBeNull();
    expect(error?.message).toContain('reserved by another session');

    // Only session 1 can claim
    const { data: claimed1, error: error1 } = await markNicknameAsUsed(testNicknameId, session1);
    expect(error1).toBeNull();
    expect(claimed1).not.toBeNull();
  });

  it('should handle rapid sequential operations', async () => {
    // Simulate rapid operations on same nickname
    const operations = [];

    for (let i = 0; i < 10; i++) {
      operations.push(
        reserveNickname(testNicknameId, `session-${i}`)
      );
    }

    const results = await Promise.all(operations);

    // Only one should succeed
    const successful = results.filter(r => r.data !== null);
    expect(successful).toHaveLength(1);

    // Verify database consistency
    const nickname = await prisma.nicknamesPool.findUnique({
      where: { id: testNicknameId }
    });

    expect(nickname?.reservedBySession).toBeDefined();
    expect(nickname?.reservedUntil).toBeDefined();
  });
});
