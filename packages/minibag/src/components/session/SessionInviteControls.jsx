import React from 'react';
import { Share2, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Component for session invitation controls
 * Provides WhatsApp share and copy link buttons
 *
 * @param {Object} props
 * @param {Object} props.session - The session object
 * @param {number} props.participantCount - Number of participants (excluding host)
 * @param {Function} props.onShare - Callback for WhatsApp share button
 * @param {boolean} props.disabled - If true, buttons are disabled (session full)
 */
export default function SessionInviteControls({
  session,
  participantCount,
  onShare,
  disabled = false
}) {
  const { t } = useTranslation();

  const handleCopyLink = async () => {
    if (!session || disabled) return;

    const shareUrl = `${window.location.origin}/join/${session.session_id}`;
    // Use the same message as WhatsApp share
    const shareText = t('whatsapp.invitation', {
      url: shareUrl,
      defaultValue: `Hey! I'm going shopping soon.\n\nWant to add anything to the list? I'll grab it for you.\n\nJoin here: ${shareUrl}`
    });

    try {
      await navigator.clipboard.writeText(shareText);
      alert('✓ Invitation copied to clipboard!');
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      alert(`Copy this message:\n\n${shareText}`);
    }
  };

  return (
    <div className="flex gap-3">
      {/* WhatsApp Share Button */}
      <button
        onClick={onShare}
        disabled={disabled}
        data-tour="share-button"
        className="flex-1 border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-900 py-3.5 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center justify-center gap-2">
          <Share2 size={18} strokeWidth={2} />
          <span className="font-semibold">Invite friends</span>
        </div>
      </button>

      {/* Copy Link Icon Button */}
      <button
        onClick={handleCopyLink}
        disabled={disabled}
        className="w-14 h-14 border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        title="Copy invite message"
      >
        <Copy size={20} />
      </button>
    </div>
  );
}
