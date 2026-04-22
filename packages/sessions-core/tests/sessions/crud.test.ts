/**
 * Tests for session CRUD operations
 * Verifies transaction support, error handling, and core session management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createSession,
  getSession,
  updateSession,
  completeSession,
  deleteSession,
  isSessionExpired,
} from '../../src/sessions/crud.js';
import { getDatabaseClient } from '../../src/database/client.js';
import { SessionErrorCode } from '../../src/sessions/types.js';

describe('Session CRUD Operations', () => {
  const prisma = getDatabaseClient();

  beforeEach(async () => {
    // Clean up test data
    await prisma.participant.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.nicknamesPool.deleteMany({
      where: { nickname: { startsWith: 'TestUser' } },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.participant.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.nicknamesPool.deleteMany({
      where: { nickname: { startsWith: 'TestUser' } },
    });
  });

  describe('createSession', () => {
    it('should create a session with host participant', async () => {
      const { data, error } = await createSession({
        creatorNickname: 'TestUser1',
        creatorAvatarEmoji: '👨',
        creatorRealName: 'Test User',
        expectedParticipants: 2,
      });

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data?.session.sessionId).toMatch(/^[a-f0-9]{12}$/); // 12 hex chars
      expect(data?.session.creatorNickname).toBe('TestUser1');
      expect(data?.session.status).toBe('open');
      expect(data?.participant.nickname).toBe('TestUser1');
      expect(data?.participant.isCreator).toBe(true);
      expect(data?.hostToken).toBeTruthy();
      expect(data?.authToken).toBeTruthy(); // CRITICAL-1 fix
    });

    it('should create session with auto-generated PIN', async () => {
      const { data, error } = await createSession({
        creatorNickname: 'TestUser2',
        creatorAvatarEmoji: '👩',
        generatePin: true,
      });

      expect(error).toBeNull();
      expect(data?.sessionPin).toMatch(/^\d{4}$/); // 4-digit PIN
      expect(data?.session.sessionPin).toBe(data?.sessionPin);
    });

    it('should create session with custom PIN', async () => {
      const customPin = '123456';
      const { data, error } = await createSession({
        creatorNickname: 'TestUser3',
        creatorAvatarEmoji: '👨',
        sessionPin: customPin,
      });

      expect(error).toBeNull();
      expect(data?.sessionPin).toBe(customPin);
    });

    it('should reject invalid PIN format', async () => {
      const { data, error } = await createSession({
        creatorNickname: 'TestUser4',
        creatorAvatarEmoji: '👩',
        sessionPin: '12', // Too short
      });

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error?.message).toContain('4-6 digit');
    });

    it('should set checkpoint_complete when expected_participants is 0', async () => {
      const { data, error } = await createSession({
        creatorNickname: 'TestUser5',
        creatorAvatarEmoji: '👨',
        expectedParticipants: 0, // Solo mode
      });

      expect(error).toBeNull();
      expect(data?.session.checkpointComplete).toBe(true);
    });

    it('should calculate expiry time correctly', async () => {
      const expiryHours = 12;
      const { data, error } = await createSession({
        creatorNickname: 'TestUser6',
        creatorAvatarEmoji: '👩',
        expiresInHours: expiryHours,
      });

      expect(error).toBeNull();
      expect(data?.session.expiresAt).toBeTruthy();

      if (data?.session.expiresAt) {
        const expectedExpiry = new Date();
        expectedExpiry.setHours(expectedExpiry.getHours() + expiryHours);

        const diff = Math.abs(
          new Date(data.session.expiresAt).getTime() - expectedExpiry.getTime()
        );
        expect(diff).toBeLessThan(5000); // Within 5 seconds
      }
    });

    it('should use transaction to rollback on nickname claim failure', async () => {
      // Create a nickname that's already claimed
      const nickname = await prisma.nicknamesPool.create({
        data: {
          nickname: 'ClaimedNick',
          avatarEmoji: '👨',
          gender: 'male',
          isAvailable: false, // Already claimed
        },
      });

      const { data, error } = await createSession({
        creatorNickname: 'ClaimedNick',
        creatorAvatarEmoji: '👨',
        nicknameId: nickname.id,
      });

      // Should fail due to nickname claim failure
      expect(data).toBeNull();
      expect(error).toBeTruthy();

      // Verify no orphaned session was created
      const sessions = await prisma.session.findMany({
        where: { creatorNickname: 'ClaimedNick' },
      });
      expect(sessions).toHaveLength(0);

      // Verify no orphaned participant was created
      const participants = await prisma.participant.findMany({
        where: { nickname: 'ClaimedNick' },
      });
      expect(participants).toHaveLength(0);
    });
  });

  describe('getSession', () => {
    it('should retrieve session with participants', async () => {
      // Create a session first
      const { data: createData } = await createSession({
        creatorNickname: 'TestHost',
        creatorAvatarEmoji: '👨',
      });

      const sessionId = createData!.session.sessionId;

      // Retrieve it
      const { data, error } = await getSession(sessionId);

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data?.sessionId).toBe(sessionId);
      expect(data?.participants).toHaveLength(1);
      expect(data?.participants[0].nickname).toBe('TestHost');
    });

    it('should only return active participants', async () => {
      // Create session
      const { data: createData } = await createSession({
        creatorNickname: 'TestHost2',
        creatorAvatarEmoji: '👨',
      });

      const sessionId = createData!.session.sessionId;
      const sessionUuid = createData!.session.id;

      // Create a participant who has left
      await prisma.participant.create({
        data: {
          sessionId: sessionUuid,
          nickname: 'LeftParticipant',
          avatarEmoji: '👩',
          leftAt: new Date(), // Already left
        },
      });

      // Get session
      const { data } = await getSession(sessionId);

      // Should only return the host (active participant)
      expect(data?.participants).toHaveLength(1);
      expect(data?.participants[0].nickname).toBe('TestHost2');
    });

    it('should detect expired sessions', async () => {
      // Create session that expires immediately
      const { data: createData } = await createSession({
        creatorNickname: 'TestExpired',
        creatorAvatarEmoji: '👨',
        expiresInHours: -1, // Already expired
      });

      const sessionId = createData!.session.sessionId;

      const { data } = await getSession(sessionId);

      expect(data?.status).toBe('expired');
    });

    it('should return error for invalid session ID format', async () => {
      const { data, error } = await getSession('invalid-id');

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error?.code).toBe(SessionErrorCode.INVALID_SESSION_ID);
    });

    it('should return error for non-existent session', async () => {
      const { data, error } = await getSession('abc123def456'); // Valid format, doesn't exist

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error?.code).toBe(SessionErrorCode.SESSION_NOT_FOUND);
    });
  });

  describe('updateSession', () => {
    it('should update session status with host token', async () => {
      // Create session
      const { data: createData } = await createSession({
        creatorNickname: 'TestUpdate',
        creatorAvatarEmoji: '👨',
      });

      const sessionId = createData!.session.sessionId;
      const hostToken = createData!.hostToken;

      // Update status
      const { data, error } = await updateSession(sessionId, hostToken, {
        status: 'active',
      });

      expect(error).toBeNull();
      expect(data?.status).toBe('active');
    });

    it('should set completed_at when status changes to completed', async () => {
      const { data: createData } = await createSession({
        creatorNickname: 'TestComplete',
        creatorAvatarEmoji: '👨',
      });

      const sessionId = createData!.session.sessionId;
      const hostToken = createData!.hostToken;

      const { data } = await updateSession(sessionId, hostToken, {
        status: 'completed',
      });

      expect(data?.status).toBe('completed');
      expect(data?.completedAt).toBeTruthy();
    });

    it('should set cancelled_at when status changes to cancelled', async () => {
      const { data: createData } = await createSession({
        creatorNickname: 'TestCancel',
        creatorAvatarEmoji: '👨',
      });

      const sessionId = createData!.session.sessionId;
      const hostToken = createData!.hostToken;

      const { data } = await updateSession(sessionId, hostToken, {
        status: 'cancelled',
      });

      expect(data?.status).toBe('cancelled');
      expect(data?.cancelledAt).toBeTruthy();
    });

    it('should reject update with invalid host token', async () => {
      const { data: createData } = await createSession({
        creatorNickname: 'TestInvalidToken',
        creatorAvatarEmoji: '👨',
      });

      const sessionId = createData!.session.sessionId;

      const { data, error } = await updateSession(sessionId, 'invalid-token', {
        status: 'active',
      });

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error?.code).toBe(SessionErrorCode.INVALID_HOST_TOKEN);
    });

    it('should update expected_participants', async () => {
      const { data: createData } = await createSession({
        creatorNickname: 'TestExpected',
        creatorAvatarEmoji: '👨',
        expectedParticipants: 2,
      });

      const sessionId = createData!.session.sessionId;
      const hostToken = createData!.hostToken;

      const { data } = await updateSession(sessionId, hostToken, {
        expectedParticipants: 3,
      });

      expect(data?.expectedParticipants).toBe(3);
    });

    it('should prevent updating expired session', async () => {
      const { data: createData } = await createSession({
        creatorNickname: 'TestExpiredUpdate',
        creatorAvatarEmoji: '👨',
        expiresInHours: -1, // Already expired
      });

      const sessionId = createData!.session.sessionId;
      const hostToken = createData!.hostToken;

      const { data, error } = await updateSession(sessionId, hostToken, {
        status: 'active',
      });

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error?.code).toBe(SessionErrorCode.SESSION_EXPIRED);
    });
  });

  describe('completeSession', () => {
    it('should mark session as completed', async () => {
      const { data: createData } = await createSession({
        creatorNickname: 'TestComplete2',
        creatorAvatarEmoji: '👨',
      });

      const sessionId = createData!.session.sessionId;
      const hostToken = createData!.hostToken;

      const { data, error } = await completeSession(sessionId, hostToken);

      expect(error).toBeNull();
      expect(data?.status).toBe('completed');
      expect(data?.completedAt).toBeTruthy();
    });
  });

  describe('deleteSession', () => {
    it('should mark session as cancelled', async () => {
      const { data: createData } = await createSession({
        creatorNickname: 'TestDelete',
        creatorAvatarEmoji: '👨',
      });

      const sessionId = createData!.session.sessionId;
      const hostToken = createData!.hostToken;

      const { data, error } = await deleteSession(sessionId, hostToken);

      expect(error).toBeNull();
      expect(data?.success).toBe(true);

      // Verify session is cancelled
      const { data: sessionData } = await getSession(sessionId);
      expect(sessionData?.status).toBe('cancelled');
    });
  });

  describe('isSessionExpired', () => {
    it('should return false for session with no expiry', () => {
      const session = { expiresAt: null };
      expect(isSessionExpired(session)).toBe(false);
    });

    it('should return false for session not yet expired', () => {
      const future = new Date();
      future.setHours(future.getHours() + 1);
      const session = { expiresAt: future };
      expect(isSessionExpired(session)).toBe(false);
    });

    it('should return true for expired session', () => {
      const past = new Date();
      past.setHours(past.getHours() - 1);
      const session = { expiresAt: past };
      expect(isSessionExpired(session)).toBe(true);
    });
  });
});
