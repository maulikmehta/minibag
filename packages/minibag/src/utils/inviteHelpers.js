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
 * Build a localized invite message for Web Share API (URL passed separately)
 * @param {string|null} pin - The session PIN (required for joining)
 * @param {Function} t - The i18n translation function
 * @returns {string} Localized invite message without URL
 */
export function buildShareMessage(pin, t) {
  return `${t('whatsapp.inviteTitle')}
${t('whatsapp.invitePin', { pin: pin || 'N/A' })}
${t('whatsapp.splitBillsLater')}`;
}

/**
 * Build a localized invite message for clipboard copy (includes URL)
 * @param {string} inviteUrl - The invite URL to include in the message
 * @param {string|null} pin - The session PIN (required for joining)
 * @param {Function} t - The i18n translation function
 * @returns {string} Localized invite message with URL
 */
export function buildCopyMessage(inviteUrl, pin, t) {
  return `${t('whatsapp.inviteTitle')}
${t('whatsapp.inviteLink', { url: inviteUrl })}
${t('whatsapp.invitePin', { pin: pin || 'N/A' })}
${t('whatsapp.splitBillsLater')}`;
}

/**
 * @deprecated Use buildShareMessage() or buildCopyMessage() instead
 * Build a localized invite message with the URL and PIN
 * @param {string} inviteUrl - The invite URL to include in the message
 * @param {string|null} pin - The session PIN (required for joining)
 * @param {Function} t - The i18n translation function
 * @returns {string} Localized invite message
 */
export function buildInviteMessage(inviteUrl, pin, t) {
  return buildCopyMessage(inviteUrl, pin, t);
}

/**
 * Copy invite message to clipboard
 * @param {string} inviteUrl - The invite URL
 * @param {string|null} pin - The session PIN
 * @param {Function} t - The i18n translation function
 * @param {Object} notify - The notification object (optional, for error only)
 * @returns {Promise<boolean>} True if copy succeeded, false otherwise
 */
export async function copyInviteToClipboard(inviteUrl, pin, t, notify = null) {
  try {
    const shareText = buildCopyMessage(inviteUrl, pin, t);
    await navigator.clipboard.writeText(shareText);
    // No success notification - UI will show inline feedback
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    if (notify) {
      notify.error(t('errors.failedToCopyLink'));
    }
    return false;
  }
}

/**
 * Share invite via native share API or fallback to copy
 * @param {string} inviteUrl - The invite URL
 * @param {string|null} pin - The session PIN
 * @param {Function} t - The i18n translation function
 * @param {Object} notify - The notification object
 * @param {Function} fallbackCopy - Optional fallback copy function
 * @returns {Promise<boolean>} True if share succeeded or was cancelled, false if failed
 */
export async function shareInvite(inviteUrl, pin, t, notify, fallbackCopy = null) {
  const shareText = buildShareMessage(pin, t);

  if (navigator.share) {
    try {
      await navigator.share({
        title: t('whatsapp.shareTitle'),
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
      return await copyInviteToClipboard(inviteUrl, pin, t, notify);
    }
  } else {
    // Share API not supported, use fallback or copy
    if (fallbackCopy) {
      return await fallbackCopy();
    }
    return await copyInviteToClipboard(inviteUrl, pin, t, notify);
  }
}
