import { useEffect } from 'react';
import socketService from '../services/socket.js';

/**
 * Hook for syncing participant data via WebSocket
 * Handles participant join events and status updates (marked as not coming)
 */
export function useParticipantSync({
  session,
  currentParticipant,
  participants,
  onUpdateParticipants,
  onShowNotification
}) {
  // Listen for participant joins and show notification (privacy-aware)
  useEffect(() => {
    if (!session?.session_id || !currentParticipant) return;

    // Ensure socket is connected before adding listeners
    if (!socketService.socket) {
      socketService.connect();
    }

    const handleParticipantJoinNotification = (participant) => {
      const isHost = currentParticipant?.is_creator;

      if (isHost) {
        // Host sees full identity: "FirstName @ ALIAS joined"
        const firstName = participant.real_name?.split(' ')[0] || participant.nickname;
        const alias = (participant.nickname || '').toUpperCase();
        const displayName = participant.real_name
          ? `${firstName} @ ${alias}`
          : alias;
        onShowNotification(`${displayName} joined the session`);
      } else {
        // Participants see generic message (privacy)
        onShowNotification('Someone joined the session');
      }
    };

    socketService.onParticipantJoined(handleParticipantJoinNotification);

    return () => {
      socketService.off('participant-joined', handleParticipantJoinNotification);
    };
  }, [session?.session_id, currentParticipant, onShowNotification]);

  // Listen for participant status updates (marked as not coming)
  useEffect(() => {
    if (!session?.session_id) return;

    // Ensure socket is connected before adding listeners
    if (!socketService.socket) {
      socketService.connect();
    }

    const handleParticipantStatusUpdate = (updatedParticipant) => {
      // Update local participant state
      const updatedParticipants = participants.map(p =>
        p.id === updatedParticipant.id ? { ...p, ...updatedParticipant } : p
      );
      onUpdateParticipants(updatedParticipants);

      // Show notification (host only)
      if (currentParticipant?.is_creator && updatedParticipant.marked_not_coming !== undefined) {
        const participantName = updatedParticipant.nickname || updatedParticipant.name;
        const status = updatedParticipant.marked_not_coming ? 'marked as not coming' : 'marked as coming';
        onShowNotification(`${participantName} ${status}`);
      }
    };

    socketService.on('participant-status-updated', handleParticipantStatusUpdate);

    return () => {
      socketService.off('participant-status-updated', handleParticipantStatusUpdate);
    };
  }, [session?.session_id, participants, currentParticipant?.is_creator, onUpdateParticipants, onShowNotification]);

  // Listen for participant items updates (real-time sync when participants add/update items)
  useEffect(() => {
    if (!session?.session_id) return;

    // Ensure socket is connected before adding listeners
    if (!socketService.socket) {
      socketService.connect();
    }

    const handleParticipantItemsUpdate = (data) => {
      const { participantId, items, real_name, nickname, items_confirmed } = data;

      // Update local participant state with new items
      const updatedParticipants = participants.map(p => {
        if (p.id === participantId) {
          return {
            ...p,
            items,
            ...(items_confirmed !== undefined && { items_confirmed }),
            ...(real_name && { real_name }),
            ...(nickname && { nickname })
          };
        }
        return p;
      });
      onUpdateParticipants(updatedParticipants);

      // Show notification when participant confirms their list (privacy-aware)
      if (items_confirmed) {
        const isHost = currentParticipant?.is_creator;

        if (isHost) {
          // Host sees full identity: "FirstName @ ALIAS submitted the list"
          const firstName = real_name?.split(' ')[0] || nickname;
          const alias = (nickname || '').toUpperCase();
          const displayName = real_name ? `${firstName} @ ${alias}` : alias;
          onShowNotification(`${displayName} submitted the list`);
        } else {
          // Participants see generic message (privacy)
          onShowNotification('A participant confirmed their list');
        }
      }
    };

    socketService.on('participant-items-updated', handleParticipantItemsUpdate);

    return () => {
      socketService.off('participant-items-updated', handleParticipantItemsUpdate);
    };
  }, [session?.session_id, participants, currentParticipant?.is_creator, onUpdateParticipants, onShowNotification]);
}
