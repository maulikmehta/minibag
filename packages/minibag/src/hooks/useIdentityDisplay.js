import { extractFirstName } from '../utils/sessionTransformers';

/**
 * useIdentityDisplay Hook
 *
 * Determines what identity information to display based on privacy rules:
 * - Participants can only see 3-letter aliases for others (privacy)
 * - Host can see real names contextually (shopping: alias, payment: real name)
 * - Everyone knows their own full identity ("Maulik @ JAY")
 *
 * @param {Object} participant - The participant whose identity to display
 * @param {string} participant.id - Participant ID
 * @param {string} participant.real_name - Full real name (e.g., "Maulik Patel")
 * @param {string} participant.nickname - 3-letter alias (e.g., "JAY")
 * @param {Object} currentUser - The current user viewing the identity
 * @param {string} currentUser.id - Current user ID
 * @param {boolean} currentUser.is_creator - Whether current user is the host
 * @param {string} context - Display context: 'casual' | 'payment' | 'notification' | 'full'
 *
 * @returns {Object} Identity display information
 * @returns {string} displayName - The formatted name to display
 * @returns {boolean} showRealName - Whether real name is included
 * @returns {boolean} canInteract - Whether tooltips/long-press should work
 * @returns {string} alias - The 3-letter alias
 * @returns {string|null} firstName - First name extracted from real_name
 */
export function useIdentityDisplay(participant, currentUser, context = 'casual') {
  if (!participant) {
    return {
      displayName: 'Unknown',
      showRealName: false,
      canInteract: false,
      alias: 'UNK',
      firstName: null
    };
  }

  const alias = (participant.nickname || 'UNK').toUpperCase();
  const realName = participant.real_name;
  const firstName = realName ? extractFirstName(realName) : null;
  const isSelf = currentUser && participant.id === currentUser.id;
  const isHost = currentUser && currentUser.is_creator;

  // Case 1: Viewing own identity - always show full identity
  if (isSelf) {
    return {
      displayName: firstName ? `${firstName} @ ${alias}` : alias,
      showRealName: !!firstName,
      canInteract: true,
      alias,
      firstName
    };
  }

  // Case 2: Participant viewing others - privacy mode (alias only)
  if (!isHost) {
    return {
      displayName: alias,
      showRealName: false,
      canInteract: false, // Participants can't see real names
      alias,
      firstName: null // Don't expose real name
    };
  }

  // Case 3: Host viewing participants - contextual display
  switch (context) {
    case 'casual':
    case 'shopping':
      // Shopping context: Show alias only for casual interaction
      return {
        displayName: alias,
        showRealName: false,
        canInteract: true, // Host can long-press to see real name
        alias,
        firstName
      };

    case 'payment':
      // Payment context: Show real name prominently with alias
      return {
        displayName: firstName ? `${firstName} @ ${alias}` : alias,
        showRealName: !!firstName,
        canInteract: true,
        alias,
        firstName
      };

    case 'notification':
      // Notification context: Show full identity
      return {
        displayName: firstName ? `${firstName} @ ${alias}` : alias,
        showRealName: !!firstName,
        canInteract: true,
        alias,
        firstName
      };

    case 'full':
      // Full identity: Always show both
      return {
        displayName: firstName ? `${firstName} @ ${alias}` : alias,
        showRealName: !!firstName,
        canInteract: true,
        alias,
        firstName
      };

    default:
      // Default to alias only
      return {
        displayName: alias,
        showRealName: false,
        canInteract: true,
        alias,
        firstName
      };
  }
}

export default useIdentityDisplay;
