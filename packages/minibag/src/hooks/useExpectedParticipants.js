import { useState, useEffect } from 'react';

/**
 * Hook for managing expected participants and checkpoint logic
 * Tracks how many participants are expected to join, handles timeout, and determines checkpoint completion
 *
 * @param {Object} session - The current session object
 * @param {Array} participants - Array of participants who have joined
 * @returns {Object} Expected participants state and checkpoint status
 */
export function useExpectedParticipants(session, participants) {
  // Local state for expected participants (for optimistic UI updates)
  // null = not set (button disabled), 0 = go solo (no wait), 1-3 = wait for N participants
  const [localExpectedCount, setLocalExpectedCount] = useState(
    session?.expected_participants !== undefined && session?.expected_participants !== null
      ? session.expected_participants
      : null
  );

  // Track if invite has expired (20 minutes after expected_participants_set_at)
  const [isInviteExpired, setIsInviteExpired] = useState(false);

  // Sync local expected count with session data
  useEffect(() => {
    setLocalExpectedCount(
      session?.expected_participants !== undefined && session?.expected_participants !== null
        ? session.expected_participants
        : null
    );
  }, [session?.expected_participants]);

  // Check for invite timeout every 30 seconds
  useEffect(() => {
    const checkTimeout = () => {
      if (!session?.expected_participants_set_at) {
        setIsInviteExpired(false);
        return;
      }

      const TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes
      const setAt = new Date(session.expected_participants_set_at);
      const now = new Date();
      const elapsed = now - setAt;

      setIsInviteExpired(elapsed >= TIMEOUT_MS);
    };

    // Check immediately
    checkTimeout();

    // Check every 30 seconds
    const interval = setInterval(checkTimeout, 30000);

    return () => clearInterval(interval);
  }, [session?.expected_participants_set_at]);

  // Checkpoint logic - count participants who have responded
  const joinedCount = participants.filter(p => !p.marked_not_coming).length;
  const notComingCount = participants.filter(p => p.marked_not_coming).length;
  const expectedCount = localExpectedCount; // Use local state for instant checkpoint updates

  // Calculate auto-timed-out slots (unfilled expected slots after 20 minutes)
  const autoTimedOutCount = isInviteExpired && expectedCount > 0
    ? Math.max(0, expectedCount - joinedCount - notComingCount)
    : 0;

  // Three states: null (not set, disabled), 0 (solo mode, enabled), 1-3 (wait for N people)
  // After timeout, unfilled slots count as "timed out" to complete checkpoint
  const checkpointComplete = expectedCount === null
    ? false // Not set yet - button disabled
    : expectedCount === 0
      ? true // Go solo - button enabled immediately
      : (joinedCount + notComingCount + autoTimedOutCount) >= expectedCount; // Wait for expected count or timeout

  const waitingCount = expectedCount !== null && expectedCount > 0 && !isInviteExpired
    ? expectedCount - joinedCount - notComingCount
    : 0;

  return {
    expectedCount: localExpectedCount,
    setExpectedCount: setLocalExpectedCount,
    checkpointComplete,
    waitingCount,
    autoTimedOutCount,
    isInviteExpired
  };
}
