import React from 'react';

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
  disabled = false
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-6 max-w-md mx-auto z-50">
      {/* Show checkpoint status or timeout message */}
      {checkpointComplete && participantCount > 0 && (
        <p className="text-xs text-gray-600 mb-2 text-center">
          {isInviteExpired && autoTimedOutCount > 0
            ? `Invite timeout: ${autoTimedOutCount} ${autoTimedOutCount === 1 ? 'slot' : 'slots'} unfilled after 20 minutes`
            : confirmedParticipants > 0
              ? `${confirmedParticipants} of ${participantCount} joined ${confirmedParticipants === 1 ? 'participant has' : 'participants have'} confirmed`
              : `${participantCount} ${participantCount === 1 ? 'participant has' : 'participants have'} joined`}
        </p>
      )}

      <button
        onClick={onStartShopping}
        disabled={disabled}
        className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg text-base font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        title={
          expectedCount === null
            ? 'Set how many friends joining above'
            : !checkpointComplete
              ? `Waiting for ${waitingCount} ${waitingCount === 1 ? 'friend' : 'friends'} to respond`
              : (participantCount > 0 && !allJoinedParticipantsConfirmed
                  ? `Waiting for ${participantCount - confirmedParticipants} joined ${participantCount - confirmedParticipants === 1 ? 'participant' : 'participants'} to confirm their list`
                  : '')
        }
      >
        {expectedCount === null
          ? 'Start shopping'
          : !checkpointComplete
            ? `Waiting for ${waitingCount} ${waitingCount === 1 ? 'friend' : 'friends'}...`
            : 'Start shopping'}
      </button>
    </div>
  );
}
