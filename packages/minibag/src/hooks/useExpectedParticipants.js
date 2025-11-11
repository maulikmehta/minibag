import { useState, useEffect, useRef } from 'react';
import logger from '../../../shared/utils/frontendLogger.js';

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

  // ENHANCED VALIDATION: Debounced checkpoint validation with better error detection
  const validationTimerRef = useRef(null);
  const lastInconsistentStateRef = useRef(null);

  useEffect(() => {
    // Clear existing timer on every render
    if (validationTimerRef.current) {
      clearTimeout(validationTimerRef.current);
    }

    if (expectedCount > 0 && !isInviteExpired) {
      const totalResponses = joinedCount + notComingCount;

      // Critical error: More responses than expected
      if (totalResponses > expectedCount) {
        logger.error('Checkpoint: More participants responded than expected', {
          expectedCount,
          joinedCount,
          notComingCount,
          totalResponses,
          participantsInState: participants.length,
          hint: 'This should never happen - check participant filtering logic'
        });
      }

      // Warning: Fewer participants than expected (might be normal during sync)
      if (totalResponses < expectedCount && participants.length < expectedCount) {
        const currentInconsistency = {
          expectedCount,
          participantsInState: participants.length,
          joinedCount,
          notComingCount,
          totalResponses,
          timestamp: Date.now()
        };

        // If this is the first time we've seen this inconsistency, record it
        if (!lastInconsistentStateRef.current) {
          lastInconsistentStateRef.current = currentInconsistency;
        }

        // Only warn if inconsistency has persisted for >5 seconds
        const inconsistencyDuration = Date.now() - lastInconsistentStateRef.current.timestamp;
        if (inconsistencyDuration >= 5000) {
          validationTimerRef.current = setTimeout(() => {
            logger.warn('Checkpoint: Persistent participant count mismatch (>5s)', {
              ...currentInconsistency,
              inconsistencyDurationMs: inconsistencyDuration,
              hint: 'Check if WebSocket sync is working or if declined participants are being filtered from state'
            });
          }, 0);
        }
      } else {
        // State is consistent, clear the reference
        lastInconsistentStateRef.current = null;
      }
    } else {
      // Not in group mode or invite expired, clear the reference
      lastInconsistentStateRef.current = null;
    }

    // Cleanup timer on unmount
    return () => {
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
      }
    };
  }, [expectedCount, joinedCount, notComingCount, participants.length, isInviteExpired]);

  return {
    expectedCount: localExpectedCount,
    setExpectedCount: setLocalExpectedCount,
    checkpointComplete,
    waitingCount,
    autoTimedOutCount,
    isInviteExpired
  };
}
