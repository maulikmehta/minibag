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
  // Listen for participant joins and show notification (host only)
  useEffect(() => {
    if (!session?.session_id || !currentParticipant?.is_creator) return;

    // Ensure socket is connected before adding listeners
    if (!socketService.socket) {
      socketService.connect();
    }

    const handleParticipantJoinNotification = (participant) => {
      // Show notification with identity reveal format
      const firstName = participant.real_name?.split(' ')[0] || participant.nickname;
      const displayName = participant.real_name
        ? `${firstName} @ ${participant.nickname}`
        : participant.nickname;

      onShowNotification(`${displayName} joined the session`);
    };

    socketService.onParticipantJoined(handleParticipantJoinNotification);

    return () => {
      socketService.off('participant-joined', handleParticipantJoinNotification);
    };
  }, [session?.session_id, currentParticipant?.is_creator, onShowNotification]);

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

      // Show notification when participant confirms their list (host only)
      if (currentParticipant?.is_creator && items_confirmed) {
        const firstName = real_name?.split(' ')[0] || nickname;
        const displayName = real_name ? `${firstName} @ ${nickname}` : nickname;
        onShowNotification(`${displayName} submitted the list`);
      }
    };

    socketService.on('participant-items-updated', handleParticipantItemsUpdate);

    return () => {
      socketService.off('participant-items-updated', handleParticipantItemsUpdate);
    };
  }, [session?.session_id, participants, currentParticipant?.is_creator, onUpdateParticipants, onShowNotification]);
}
