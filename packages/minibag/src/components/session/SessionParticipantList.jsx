import React from 'react';
import { Users } from 'lucide-react';
import ParticipantAvatar from './ParticipantAvatar.jsx';

/**
 * Component for displaying session participants with avatar slots
 * Shows host + up to 3 participant slots, with empty slots for unfilled positions
 *
 * @param {Object} props
 * @param {Array} props.participants - Array of participant objects
 * @param {Object} props.hostItems - Host's selected items
 * @param {string} props.hostNickname - Display name for the host
 * @param {string|null} props.hostRealName - Real name for the host (optional)
 * @param {string} props.selectedParticipant - Currently selected participant ('host' or participant name)
 * @param {Function} props.onParticipantSelect - Callback when participant is clicked
 * @param {boolean} props.isHost - Whether current user is the host
 * @param {string|null} props.currentParticipantId - ID of the current participant
 * @param {boolean} props.readOnly - If true, avatars are not interactive
 */
export default function SessionParticipantList({
  participants,
  hostItems,
  hostNickname,
  hostRealName = null,
  selectedParticipant,
  onParticipantSelect,
  isHost,
  currentParticipantId = null,
  readOnly = false
}) {
  const participantCount = participants.length + 1; // +1 for host

  return (
    <div className="mb-6">
      <p className="text-sm text-gray-600 mb-4">
        {`${participantCount} of 4 people`}
      </p>
      <div className="flex gap-4 overflow-x-auto pb-4 px-2 -mx-2">
        {/* Host slot */}
        <ParticipantAvatar
          displayText={hostNickname.toUpperCase()}
          label={isHost ? "You (Host)" : "Host"}
          isSelected={!readOnly && selectedParticipant === 'host'}
          hasItems={Object.keys(hostItems).length > 0}
          onClick={readOnly ? () => {} : () => onParticipantSelect('host')}
          realName={hostRealName}
          canSeeRealName={isHost}
        />

        {/* Participant slots - show 3 slots total */}
        {[0, 1, 2].map((slotIndex) => {
          const participant = participants[slotIndex];

          if (participant) {
            // Active participant slot
            const participantName = participant.nickname || participant.name || `P${slotIndex + 1}`;
            const isMe = participant.id === currentParticipantId;
            const isSelected = !readOnly && (
              isHost
                ? selectedParticipant === participantName
                : isMe
            );

            return (
              <ParticipantAvatar
                key={participant.id || participantName}
                displayText={participantName.toUpperCase()}
                label={isMe ? `You (${participantName})` : participantName}
                isSelected={isSelected}
                hasItems={Object.keys(participant.items || {}).length > 0}
                onClick={readOnly ? () => {} : () => onParticipantSelect(participantName)}
                realName={participant.real_name || null}
                isConfirmed={participant.items_confirmed || false}
                canSeeRealName={isHost}
              />
            );
          } else {
            // Empty slot
            return (
              <div
                key={`empty-${slotIndex}`}
                className="flex flex-col items-center flex-shrink-0 opacity-30"
              >
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-2 border-2 border-dashed border-gray-300 bg-gray-50">
                  <Users size={24} className="text-gray-400" />
                </div>
                <p className="text-xs text-gray-400">Empty</p>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
}
