import { useState, useEffect, useRef } from 'react';
import logger from '../../../shared/utils/frontendLogger.js';
import { API_BASE_URL } from '../services/api.js';

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
  // null = not set (button disabled), 0 = go solo (no wait), 1 = constant link mode (unlimited joins up to max_participants)
  const [localExpectedCount, setLocalExpectedCount] = useState(
    session?.expected_participants !== undefined && session?.expected_participants !== null
      ? session.expected_participants
      : null
  );

  // Track if invite has expired (20 minutes after expected_participants_set_at)
  const [isInviteExpired, setIsInviteExpired] = useState(false);

  // BUGFIX #3: Track if all invites have been resolved (claimed/declined/expired)
  const [allInvitesResolved, setAllInvitesResolved] = useState(false);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);

  // BUGFIX #3: Fetch invite resolution status periodically
  useEffect(() => {
    if (!session?.session_id || localExpectedCount === null || localExpectedCount === 0) {
      // No invites to resolve for solo mode or unset mode
      setAllInvitesResolved(true);
      setPendingInvitesCount(0);
      return;
    }

    const checkInviteResolution = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/sessions/${session.session_id}/invites/resolved`);
        const result = await response.json();

        if (result.success && result.data) {
          setAllInvitesResolved(result.data.allResolved);
          setPendingInvitesCount(result.data.pendingCount);

          logger.debug('[Checkpoint] Invite resolution status:', {
            allResolved: result.data.allResolved,
            pendingCount: result.data.pendingCount,
            totalCount: result.data.totalCount
          });
        }
      } catch (error) {
        logger.error('[Checkpoint] Failed to check invite resolution:', error);
        // On error, assume not all resolved (safer default)
        setAllInvitesResolved(false);
      }
    };

    // Check immediately
    checkInviteResolution();

    // Check every 5 seconds (more frequent than timeout check since this blocks progression)
    const interval = setInterval(checkInviteResolution, 5000);

    return () => clearInterval(interval);
  }, [session?.session_id, localExpectedCount]);

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

  // Check if constant invite link mode (group mode with unlimited joins)
  const isConstantLinkMode = expectedCount === 1 && session?.constant_invite_token;

  // Calculate auto-timed-out slots (unfilled expected slots after 20 minutes)
  const autoTimedOutCount = isInviteExpired && expectedCount > 0
    ? Math.max(0, expectedCount - joinedCount - notComingCount)
    : 0;

  // Three states: null (not set, disabled), 0 (solo mode, enabled), 1 (constant link mode)
  // CONSTANT INVITE MODE LOGIC:
  // - Before timeout: Wait for ALL joined participants to confirm
  // - After timeout: Enable if ≥1 participant confirmed (unconfirmed are auto-excluded)
  // BUGFIX #3: Also require all invites to be resolved (claimed/declined/expired)
  let checkpointComplete;

  if (expectedCount === null) {
    checkpointComplete = false; // Not set yet - button disabled
  } else if (expectedCount === 0) {
    checkpointComplete = true; // Go solo - button enabled immediately
  } else if (isConstantLinkMode) {
    // CONSTANT LINK MODE: Enable when ALL joined participants confirm (any time)
    // Host decides when to proceed - notification informs them the link is still open
    // BUGFIX #3: Also require all invites resolved
    const confirmedCount = participants.filter(p =>
      !p.marked_not_coming && p.items_confirmed
    ).length;

    checkpointComplete = joinedCount > 0 && joinedCount === confirmedCount && allInvitesResolved;

    logger.debug('[Checkpoint] Constant link mode:', {
      joinedCount,
      confirmedCount,
      isInviteExpired,
      allInvitesResolved,
      pendingInvitesCount,
      checkpointComplete,
      hint: 'Host can proceed when all joined participants confirm AND all invites resolved'
    });
  } else {
    // NUMBERED INVITE MODE (legacy): After timeout, unfilled slots count as "timed out"
    // BUGFIX #3: Also require all invites resolved
    checkpointComplete = (joinedCount + notComingCount + autoTimedOutCount) >= expectedCount && allInvitesResolved;
  }

  // Calculate waiting count (skip for constant link mode - it allows unlimited joins)
  const waitingCount = expectedCount !== null && expectedCount > 0 && !isInviteExpired && !isConstantLinkMode
    ? Math.max(0, expectedCount - joinedCount - notComingCount) // Ensure never negative
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
      // Skip for constant link mode (group mode) - allows unlimited joins up to max_participants
      // In constant link mode, expectedCount = 1 means "1 invite link", not "1 person expected"
      // Use the same constant link detection as checkpoint logic
      const isConstantLinkValidation = expectedCount === 1 && session?.constant_invite_token;

      if (totalResponses > expectedCount && !isConstantLinkValidation) {
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
    isInviteExpired,
    // BUGFIX #3: Expose invite resolution status
    allInvitesResolved,
    pendingInvitesCount
  };
}
