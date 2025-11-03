import React from 'react';
import { Copy, Share2, Check } from 'lucide-react';

/**
 * Individual invite card showing status and share/copy actions
 *
 * @param {Object} props
 * @param {Object|null} props.invite - The invite object from API
 * @param {number} props.inviteNumber - The invite number (1-indexed)
 * @param {Function} props.onShare - Callback for share button (inviteUrl, inviteNumber)
 * @param {Function} props.onCopy - Callback for copy button (inviteUrl, index)
 * @param {number|null} props.copiedIndex - Index of currently copied invite (for showing check icon)
 */
export default function InviteCard({
  invite,
  inviteNumber,
  onShare,
  onCopy,
  copiedIndex
}) {
  const getInviteStatus = (invite) => {
    if (!invite) return 'Pending...';

    switch (invite.status) {
      case 'claimed':
        return invite.participant?.nickname
          ? `${invite.participant.nickname} joined ✓`
          : 'Joined ✓';
      case 'declined':
        return 'Declined ✗';
      case 'expired':
        return 'Expired (20min timeout)';
      default:
        return 'Waiting...';
    }
  };

  const getInviteStatusColor = (invite) => {
    if (!invite) return 'text-gray-500';

    switch (invite.status) {
      case 'claimed':
        return 'text-green-600';
      case 'declined':
        return 'text-red-600';
      case 'expired':
        return 'text-amber-600';
      default:
        return 'text-gray-500';
    }
  };

  const isPending = !invite || invite.status === 'pending';
  const index = inviteNumber - 1; // Convert to 0-indexed for copiedIndex comparison

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900">
          Invite {inviteNumber}
        </span>
        <span className={`text-sm ${getInviteStatusColor(invite)}`}>
          {getInviteStatus(invite)}
        </span>
      </div>

      {isPending && invite && (
        <div className="flex gap-3">
          {/* Share Button - Takes most space */}
          <button
            onClick={() => onShare(invite, inviteNumber)}
            className="flex-1 border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-900 py-3 px-4 rounded-xl transition-colors"
          >
            <div className="flex items-center justify-center gap-2">
              <Share2 size={18} strokeWidth={2} />
              <span className="font-semibold text-sm">Share invite {inviteNumber}</span>
            </div>
          </button>

          {/* Copy Icon Button - Compact square */}
          <button
            onClick={() => onCopy(invite, index)}
            className="w-14 h-14 border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-600 rounded-xl transition-colors flex items-center justify-center"
            title="Copy invite message"
          >
            {copiedIndex === index ? (
              <Check size={20} className="text-green-600" />
            ) : (
              <Copy size={20} />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
