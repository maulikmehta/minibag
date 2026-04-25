import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Component for displaying checkpoint status and start shopping button
 * Shows waiting count, timeout status, or confirmation status
 *
 * @param {Object} props
 * @param {boolean} props.checkpointComplete - Whether the checkpoint is complete
 * @param {number} props.waitingCount - Number of participants still waiting to join
 * @param {number} props.participantCount - Total number of joined participants (not declined)
 * @param {number} props.confirmedParticipants - Number of joined participants who confirmed
 * @param {boolean} props.hasConfirmedParticipants - Whether any participants have confirmed
 * @param {boolean} props.allJoinedParticipantsConfirmed - Whether all joined participants have confirmed their lists (host excluded, confirmed at "Start List")
 * @param {number} props.autoTimedOutCount - Number of slots that timed out
 * @param {boolean} props.isInviteExpired - Whether the 20-minute invite window expired
 * @param {number|null} props.expectedCount - Expected participants count
 * @param {Function} props.onStartShopping - Callback when start shopping button is clicked
 * @param {boolean} props.disabled - If true, button is disabled (no items, checkpoint incomplete, or waiting for confirmations)
 * @param {boolean} props.isLoading - If true, shows loading spinner
 * @param {string} props.disabledReason - Optional reason why button is disabled (e.g., "no_items", "waiting_confirmations")
 */
export default function CheckpointStatus({
  checkpointComplete,
  waitingCount,
  participantCount,
  confirmedParticipants,
  hasConfirmedParticipants,
  allJoinedParticipantsConfirmed,
  autoTimedOutCount,
  isInviteExpired,
  expectedCount,
  onStartShopping,
  disabled = false,
  isLoading = false,
  disabledReason = null,
  isConstantLinkMode = false // When true, suppress status message (banner shows instead)
}) {
  const [internalLoading, setInternalLoading] = useState(false);

  const handleClick = async () => {
    if (disabled || isLoading || internalLoading) return;

    setInternalLoading(true);
    try {
      await onStartShopping();
    } finally {
      // Keep loading state for a moment to prevent double-clicks
      setTimeout(() => setInternalLoading(false), 1000);
    }
  };

  const showLoading = isLoading || internalLoading;

  // Calculate remaining time for invite link (for constant invite mode)
  const getRemainingTime = () => {
    if (isInviteExpired || expectedCount !== 1) return null;

    // This will be calculated in the parent component if needed
    return null;
  };

  // Determine status message to show
  const getStatusMessage = () => {
    // If disabled due to no items
    if (disabledReason === 'no_items') {
      return 'Add items to your list to start shopping';
    }

    // If checkpoint is not complete, show waiting message
    if (!checkpointComplete && expectedCount > 0 && waitingCount > 0) {
      return `Waiting for ${waitingCount} ${waitingCount === 1 ? 'friend' : 'friends'} to respond (or 20 min)`;
    }

    // If checkpoint complete but waiting for confirmations
    if (checkpointComplete && participantCount > 0 && !allJoinedParticipantsConfirmed) {
      const waitingForConfirmations = participantCount - confirmedParticipants;
      return `Waiting for ${waitingForConfirmations} joined ${waitingForConfirmations === 1 ? 'participant' : 'participants'} to confirm their list`;
    }

    // Show checkpoint completion status
    if (checkpointComplete && participantCount > 0) {
      // In constant link mode with all confirmed, suppress message (banner shows instead)
      if (isConstantLinkMode && allJoinedParticipantsConfirmed) {
        return null;
      }
      if (isInviteExpired && autoTimedOutCount > 0) {
        return `Invite timeout: ${autoTimedOutCount} ${autoTimedOutCount === 1 ? 'slot' : 'slots'} unfilled after 20 minutes`;
      }
      if (confirmedParticipants > 0) {
        return `${confirmedParticipants} of ${participantCount} joined ${confirmedParticipants === 1 ? 'participant has' : 'participants have'} confirmed`;
      }
      return `${participantCount} ${participantCount === 1 ? 'participant has' : 'participants have'} joined`;
    }

    // Solo mode (expectedCount === 0)
    if (expectedCount === 0 && checkpointComplete) {
      return 'Shopping solo';
    }

    return null;
  };

  const statusMessage = getStatusMessage();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-6 max-w-md mx-auto z-50">
      {/* Show status message */}
      {statusMessage && (
        <p className="text-xs text-gray-600 mb-2 text-center">
          {statusMessage}
        </p>
      )}

      <button
        onClick={handleClick}
        disabled={disabled || showLoading}
        className={`w-full py-4 rounded-button text-base font-semibold transition-all duration-150 flex items-center justify-center gap-2 ${
          disabled && !showLoading
            ? 'bg-gray-400 text-white cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700 text-white active:scale-95'
        } ${!disabled && !showLoading ? 'animate-pulse-glow' : ''}`}
        title={
          expectedCount === null
            ? 'Set how many friends joining above'
            : (!checkpointComplete && waitingCount > 0)
              ? `Waiting for ${waitingCount} ${waitingCount === 1 ? 'friend' : 'friends'} to respond (or 20 min timeout)`
              : (participantCount > 0 && !allJoinedParticipantsConfirmed
                  ? `Waiting for ${participantCount - confirmedParticipants} joined ${participantCount - confirmedParticipants === 1 ? 'participant' : 'participants'} to confirm their list`
                  : '')
        }
      >
        {showLoading && (
          <Loader2 size={20} className="animate-spin" />
        )}
        <span className={!disabled && !showLoading ? 'animate-gradient-pulse' : ''}>
          {showLoading
            ? 'Starting...'
            : (expectedCount === null
                ? 'Start shopping'
                : (!checkpointComplete && waitingCount > 0)
                  ? `Waiting for ${waitingCount} ${waitingCount === 1 ? 'friend' : 'friends'}...`
                  : 'Start shopping')}
        </span>
      </button>
    </div>
  );
}
