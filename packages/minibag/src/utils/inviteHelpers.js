/**
 * Shared utilities for invite link generation and sharing
 */

/**
 * Build an invite URL for a session
 * @param {string} sessionId - The session ID
 * @param {string|null} inviteToken - Optional invite token for named invites
 * @returns {string} The complete invite URL
 */
export function buildInviteUrl(sessionId, inviteToken = null) {
  const baseUrl = window.location.origin;
  if (inviteToken) {
    return `${baseUrl}/join/${sessionId}?inv=${inviteToken}`;
  }
  return `${baseUrl}/join/${sessionId}`;
}

/**
 * Build a localized invite message with the URL
 * @param {string} inviteUrl - The invite URL to include in the message
 * @param {Function} t - The i18n translation function
 * @returns {string} Localized invite message
 */
export function buildInviteMessage(inviteUrl, t) {
  return t('whatsapp.invitation', {
    url: inviteUrl,
    defaultValue: `Hey! I'm going shopping soon.\n\nWant to add anything to the list? I'll grab it for you.\n\nJoin here: ${inviteUrl}`
  });
}

/**
 * Copy invite message to clipboard
 * @param {string} inviteUrl - The invite URL
 * @param {Function} t - The i18n translation function
 * @param {Object} notify - The notification object (with success/error methods)
 * @returns {Promise<boolean>} True if copy succeeded, false otherwise
 */
export async function copyInviteToClipboard(inviteUrl, t, notify) {
  try {
    const shareText = buildInviteMessage(inviteUrl, t);
    await navigator.clipboard.writeText(shareText);
    notify.success('Invite message copied!');
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    notify.error('Failed to copy link');
    return false;
  }
}

/**
 * Share invite via native share API or fallback to copy
 * @param {string} inviteUrl - The invite URL
 * @param {Function} t - The i18n translation function
 * @param {Object} notify - The notification object
 * @param {Function} fallbackCopy - Optional fallback copy function
 * @returns {Promise<boolean>} True if share succeeded or was cancelled, false if failed
 */
export async function shareInvite(inviteUrl, t, notify, fallbackCopy = null) {
  const shareText = buildInviteMessage(inviteUrl, t);

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Join my shopping list',
        text: shareText,
        url: inviteUrl
      });
      return true;
    } catch (error) {
      // User cancelled
      if (error.name === 'AbortError') {
        return true;
      }

      // Share failed, try fallback
      console.error('Share failed:', error);
      if (fallbackCopy) {
        return await fallbackCopy();
      }
      return await copyInviteToClipboard(inviteUrl, t, notify);
    }
  } else {
    // Share API not supported, use fallback or copy
    if (fallbackCopy) {
      return await fallbackCopy();
    }
    return await copyInviteToClipboard(inviteUrl, t, notify);
  }
}
