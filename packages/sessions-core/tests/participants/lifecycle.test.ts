/**
 * Tests for participant lifecycle operations
 * Verifies join, leave, update, and verification functions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  joinSession,
  leaveSession,
  updateParticipant,
  getParticipants,
  verifyParticipant,
} from '../../src/participants/lifecycle.js';
import { createSession } from '../../src/sessions/crud.js';
import { getDatabaseClient } from '../../src/database/client.js';
import { SessionErrorCode } from '../../src/sessions/types.js';

describe('Participant Lifecycle', () => {
  const prisma = getDatabaseClient();
  let testSessionId: string;
  let testSessionUuid: string;

  beforeEach(async () => {
    // Clean up test data
    await prisma.participant.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.nicknamesPool.deleteMany({
      where: { nickname: { startsWith: 'Test' } },
    });

    // Create a test session
    const { data } = await createSession({
      creatorNickname: 'TestHost',
      creatorAvatarEmoji: '👨',
      expectedParticipants: 3,
    });

    testSessionId = data!.session.sessionId;
    testSessionUuid = data!.session.id;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.participant.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.nicknamesPool.deleteMany({
      where: { nickname: { startsWith: 'Test' } },
    });
  });

  describe('joinSession', () => {
    it('should allow participant to join session', async () => {
      const { data, error } = await joinSession({
        sessionId: testSessionId,
        nicknameId: 'fallback-001', // Fallback ID (not from pool)
        nickname: 'TestParticipant1',
        avatarEmoji: '👩',
        realName: 'Test User',
      });

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data?.participant.nickname).toBe('TestParticipant1');
      expect(data?.participant.isCreator).toBe(false);
      expect(data?.authToken).toBeTruthy(); // CRITICAL-1 fix
    });

    it('should verify session PIN when required', async () => {
      // Create session with PIN
      const { data: pinSession } = await createSession({
        creatorNickname: 'PinHost',
        creatorAvatarEmoji: '👨',
        sessionPin: '1234',
      });

      // Try to join without PIN
      const { data: noPin, error: noPinError } = await joinSession({
        sessionId: pinSession!.session.sessionId,
        nicknameId: 'fallback-002',
        nickname: 'TestParticipant2',
        avatarEmoji: '👩',
      });

      expect(noPin).toBeNull();
      expect(noPinError).toBeTruthy();

      // Try with wrong PIN
      const { data: wrongPin, error: wrongPinError } = await joinSession({
        sessionId: pinSession!.session.sessionId,
        nicknameId: 'fallback-003',
        nickname: 'TestParticipant3',
        avatarEmoji: '👩',
        sessionPin: '9999',
      });

      expect(wrongPin).toBeNull();
      expect(wrongPinError).toBeTruthy();

      // Join with correct PIN
      const { data: correctPin, error: correctPinError } = await joinSession({
        sessionId: pinSession!.session.sessionId,
        nicknameId: 'fallback-004',
        nickname: 'TestParticipant4',
        avatarEmoji: '👩',
        sessionPin: '1234',
      });

      expect(correctPinError).toBeNull();
      expect(correctPin?.participant).toBeTruthy();
    });

    it('should prevent joining expired session', async () => {
      // Create expired session
      const { data: expiredSession } = await createSession({
        creatorNickname: 'ExpiredHost',
        creatorAvatarEmoji: '👨',
        expiresInHours: -1, // Already expired
      });

      const { data, error } = await joinSession({
        sessionId: expiredSession!.session.sessionId,
        nicknameId: 'fallback-005',
        nickname: 'TestParticipant5',
        avatarEmoji: '👩',
      });

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error?.code).toBe(SessionErrorCode.SESSION_EXPIRED);
    });

    it('should enforce participant limit', async () => {
      // Create session with limit of 2 (host + 1 participant)
      const { data: limitSession } = await createSession({
        creatorNickname: 'LimitHost',
        creatorAvatarEmoji: '👨',
      });

      // Fill up to 50 participants (MAX_PARTICIPANTS)
      const participants = [];
      for (let i = 0; i < 49; i++) {
        participants.push(
          prisma.participant.create({
            data: {
              sessionId: limitSession!.session.id,
              nickname: `Participant${i}`,
              avatarEmoji: '👩',
            },
          })
        );
      }
      await Promise.all(participants);

      // Try to join when full
      const { data, error } = await joinSession({
        sessionId: limitSession!.session.sessionId,
        nicknameId: 'fallback-050',
        nickname: 'TestParticipant50',
        avatarEmoji: '👩',
      });

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error?.code).toBe(SessionErrorCode.PARTICIPANT_LIMIT_REACHED);
    });

    it('should use transaction to rollback on nickname claim failure', async () => {
      // Create nickname that's already claimed
      const claimedNickname = await prisma.nicknamesPool.create({
        data: {
          nickname: 'ClaimedNick',
          avatarEmoji: '👨',
          gender: 'male',
          isAvailable: false, // Already claimed
        },
      });

      const { data, error } = await joinSession({
        sessionId: testSessionId,
        nicknameId: claimedNickname.id,
        nickname: 'ClaimedNick',
        avatarEmoji: '👨',
      });

      // Should fail
      expect(data).toBeNull();
      expect(error).toBeTruthy();

      // Verify no orphaned participant was created
      const participants = await prisma.participant.findMany({
        where: {
          sessionId: testSessionUuid,
          nickname: 'ClaimedNick',
        },
      });
      expect(participants).toHaveLength(0);
    });

    it('should reject joining non-existent session', async () => {
      const { data, error } = await joinSession({
        sessionId: 'nonexistent12',
        nicknameId: 'fallback-999',
        nickname: 'TestParticipant',
        avatarEmoji: '👩',
      });

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error?.code).toBe(SessionErrorCode.SESSION_NOT_FOUND);
    });
  });

  describe('leaveSession', () => {
    it('should mark participant as left (soft delete)', async () => {
      // Join session first
      const { data: joinData } = await joinSession({
        sessionId: testSessionId,
        nicknameId: 'fallback-101',
        nickname: 'LeavingUser',
        avatarEmoji: '👩',
      });

      const participantId = joinData!.participant.id;

      // Leave session
      const { data, error } = await leaveSession(participantId);

      expect(error).toBeNull();
      expect(data?.success).toBe(true);

      // Verify participant has leftAt timestamp
      const participant = await prisma.participant.findUnique({
        where: { id: participantId },
      });

      expect(participant?.leftAt).toBeTruthy();
    });

    it('should preserve participant history after leaving', async () => {
      const { data: joinData } = await joinSession({
        sessionId: testSessionId,
        nicknameId: 'fallback-102',
        nickname: 'HistoryUser',
        avatarEmoji: '👩',
      });

      const participantId = joinData!.participant.id;

      // Leave session
      await leaveSession(participantId);

      // Verify participant still exists in database
      const participant = await prisma.participant.findUnique({
        where: { id: participantId },
      });

      expect(participant).toBeTruthy();
      expect(participant?.nickname).toBe('HistoryUser');
    });
  });

  describe('updateParticipant', () => {
    it('should update items_confirmed status', async () => {
      const { data: joinData } = await joinSession({
        sessionId: testSessionId,
        nicknameId: 'fallback-201',
        nickname: 'UpdateUser1',
        avatarEmoji: '👩',
      });

      const participantId = joinData!.participant.id;

      const { data, error } = await updateParticipant(participantId, {
        itemsConfirmed: true,
      });

      expect(error).toBeNull();
      expect(data?.itemsConfirmed).toBe(true);
    });

    it('should update marked_not_coming status', async () => {
      const { data: joinData } = await joinSession({
        sessionId: testSessionId,
        nicknameId: 'fallback-202',
        nickname: 'UpdateUser2',
        avatarEmoji: '👩',
      });

      const participantId = joinData!.participant.id;

      const { data, error } = await updateParticipant(participantId, {
        markedNotComing: true,
      });

      expect(error).toBeNull();
      expect(data?.markedNotComing).toBe(true);
      expect(data?.markedNotComingAt).toBeTruthy();
    });

    it('should clear marked_not_coming timestamp when set to false', async () => {
      const { data: joinData } = await joinSession({
        sessionId: testSessionId,
        nicknameId: 'fallback-203',
        nickname: 'UpdateUser3',
        avatarEmoji: '👩',
      });

      const participantId = joinData!.participant.id;

      // Set to true first
      await updateParticipant(participantId, { markedNotComing: true });

      // Set back to false
      const { data } = await updateParticipant(participantId, {
        markedNotComing: false,
      });

      expect(data?.markedNotComing).toBe(false);
      expect(data?.markedNotComingAt).toBeNull();
    });

    it('should reject update with no fields', async () => {
      const { data: joinData } = await joinSession({
        sessionId: testSessionId,
        nicknameId: 'fallback-204',
        nickname: 'UpdateUser4',
        avatarEmoji: '👩',
      });

      const participantId = joinData!.participant.id;

      const { data, error } = await updateParticipant(participantId, {});

      expect(data).toBeNull();
      expect(error).toBeTruthy();
    });
  });

  describe('getParticipants', () => {
    it('should return active participants only', async () => {
      // Join 2 participants
      const { data: p1 } = await joinSession({
        sessionId: testSessionId,
        nicknameId: 'fallback-301',
        nickname: 'ActiveUser1',
        avatarEmoji: '👩',
      });

      await joinSession({
        sessionId: testSessionId,
        nicknameId: 'fallback-302',
        nickname: 'ActiveUser2',
        avatarEmoji: '👨',
      });

      // One leaves
      await leaveSession(p1!.participant.id);

      // Get participants
      const { data } = await getParticipants(testSessionId);

      // Should have host + 1 active participant (not the one who left)
      expect(data).toHaveLength(2); // Host + ActiveUser2
      expect(data?.find((p) => p.nickname === 'ActiveUser1')).toBeUndefined();
      expect(data?.find((p) => p.nickname === 'ActiveUser2')).toBeTruthy();
    });

    it('should include left participants when requested', async () => {
      const { data: p1 } = await joinSession({
        sessionId: testSessionId,
        nicknameId: 'fallback-401',
        nickname: 'LeftUser',
        avatarEmoji: '👩',
      });

      await leaveSession(p1!.participant.id);

      const { data } = await getParticipants(testSessionId, true);

      // Should include the left participant
      expect(data?.find((p) => p.nickname === 'LeftUser')).toBeTruthy();
    });

    it('should return participants in join order', async () => {
      await joinSession({
        sessionId: testSessionId,
        nicknameId: 'fallback-501',
        nickname: 'First',
        avatarEmoji: '👩',
      });

      await joinSession({
        sessionId: testSessionId,
        nicknameId: 'fallback-502',
        nickname: 'Second',
        avatarEmoji: '👨',
      });

      const { data } = await getParticipants(testSessionId);

      // Should be ordered by joinedAt (host first, then First, then Second)
      expect(data?.[0].nickname).toBe('TestHost');
      expect(data?.[1].nickname).toBe('First');
      expect(data?.[2].nickname).toBe('Second');
    });
  });

  describe('verifyParticipant (CRITICAL-2 fix)', () => {
    it('should verify valid participant with auth token', async () => {
      const { data: joinData } = await joinSession({
        sessionId: testSessionId,
        nicknameId: 'fallback-601',
        nickname: 'VerifyUser',
        avatarEmoji: '👩',
      });

      const participantId = joinData!.participant.id;
      const authToken = joinData!.authToken;

      const { data, error } = await verifyParticipant(participantId, authToken);

      expect(error).toBeNull();
      expect(data?.id).toBe(participantId);
      expect(data?.nickname).toBe('VerifyUser');
    });

    it('should reject invalid auth token', async () => {
      const { data: joinData } = await joinSession({
        sessionId: testSessionId,
        nicknameId: 'fallback-602',
        nickname: 'VerifyUser2',
        avatarEmoji: '👩',
      });

      const participantId = joinData!.participant.id;

      const { data, error } = await verifyParticipant(
        participantId,
        'invalid-token'
      );

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error?.code).toBe(SessionErrorCode.INVALID_HOST_TOKEN);
    });

    it('should reject participant who has left', async () => {
      const { data: joinData } = await joinSession({
        sessionId: testSessionId,
        nicknameId: 'fallback-603',
        nickname: 'VerifyUser3',
        avatarEmoji: '👩',
      });

      const participantId = joinData!.participant.id;
      const authToken = joinData!.authToken;

      // Leave session
      await leaveSession(participantId);

      // Try to verify
      const { data, error } = await verifyParticipant(participantId, authToken);

      expect(data).toBeNull();
      expect(error).toBeTruthy();
    });

    it('should prevent session hijacking with stale localStorage', async () => {
      // Simulate: User A joins, gets auth token, leaves
      const { data: userA } = await joinSession({
        sessionId: testSessionId,
        nicknameId: 'fallback-701',
        nickname: 'UserA',
        avatarEmoji: '👩',
      });

      const participantId = userA!.participant.id;
      const authToken = userA!.authToken;

      // User A leaves
      await leaveSession(participantId);

      // User A tries to restore from stale localStorage
      const { data, error } = await verifyParticipant(participantId, authToken);

      // Should be rejected (participant has left)
      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error?.message).toContain('left');
    });
  });
});
