import React, { useState, useEffect } from 'react';
import { Copy, Share2, Check, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../hooks/useNotification.js';

/**
 * Tabbed interface for selecting participant mode and managing invite links
 * Replaces ExpectedParticipantsInput with a more intuitive tab-based UI
 *
 * @param {Object} props
 * @param {string} props.sessionId - The session ID
 * @param {number|null} props.expectedCount - Current expected count
 * @param {Array} props.invites - Array of invite objects from API
 * @param {boolean} props.locked - Whether tabs are locked (someone responded)
 * @param {Function} props.onChange - Callback when mode changes
 */
export default function InviteTabsSelector({
  sessionId,
  expectedCount,
  invites = [],
  locked = false,
  onChange
}) {
  const notify = useNotification();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(expectedCount === null ? null : expectedCount);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Helper to wrap invite URLs in language-specific messages
  const getInviteMessage = (inviteUrl) => {
    return t('whatsapp.invitation', {
      url: inviteUrl,
      defaultValue: `Hey! I'm going shopping soon.\n\nWant to add anything to the list? I'll grab it for you.\n\nJoin here: ${inviteUrl}`
    });
  };

  // Sync activeTab with expectedCount when it changes externally
  useEffect(() => {
    if (expectedCount !== null && expectedCount !== activeTab) {
      setActiveTab(expectedCount);
    }
  }, [expectedCount]);

  const tabs = [
    { value: 0, label: 'Solo', icon: Users },
    { value: 1, label: '1 Friend', icon: Users },
    { value: 2, label: '2 Friends', icon: Users },
    { value: 3, label: '3 Friends', icon: Users }
  ];

  const handleTabClick = async (value) => {
    if (locked) {
      notify.warning('Cannot change mode after someone has responded');
      return;
    }

    setActiveTab(value);
    onChange(value);

    // Call API to update expected_participants and get invite links
    try {
      const response = await fetch(`/api/sessions/${sessionId}/expected`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expected_participants: value })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to update mode:', error);
      notify.error('Failed to update mode. Please try again.');
    }
  };

  const getInviteUrl = (inviteToken) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/join/${sessionId}?inv=${inviteToken}`;
  };

  const handleCopy = async (inviteUrl, index) => {
    try {
      const shareText = getInviteMessage(inviteUrl);
      await navigator.clipboard.writeText(shareText);
      setCopiedIndex(index);
      notify.success('Invite message copied!');
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      notify.error('Failed to copy link');
    }
  };

  const handleShare = async (inviteUrl, inviteNumber) => {
    const shareText = getInviteMessage(inviteUrl);

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my shopping list',
          text: shareText,
          url: inviteUrl
        });
      } catch (error) {
        // User cancelled or error occurred
        if (error.name !== 'AbortError') {
          console.error('Share failed:', error);
          // Fallback to copy
          handleCopy(inviteUrl, inviteNumber - 1);
        }
      }
    } else {
      // Fallback to copy if share not supported
      handleCopy(inviteUrl, inviteNumber - 1);
    }
  };

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

  return (
    <div className="space-y-4">
      {/* Tab Headers */}
      <div className="border-b border-gray-300">
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => handleTabClick(tab.value)}
              disabled={locked}
              className={`
                flex-1 py-3 px-2 text-sm font-medium transition-all relative
                ${activeTab === tab.value
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
                ${locked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-2 py-4">
        {activeTab === null ? (
          <div className="text-center py-8 text-gray-500">
            <Users size={48} className="mx-auto mb-3 text-gray-400" />
            <p className="text-base">Select a mode above to continue</p>
          </div>
        ) : activeTab === 0 ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
              <Users size={28} className="text-green-600" />
            </div>
            <p className="text-base font-medium text-gray-900 mb-1">Shopping solo</p>
            <p className="text-sm text-gray-600">You can start shopping immediately</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from({ length: activeTab }, (_, i) => {
              const invite = invites.find(inv => inv.invite_number === i + 1);
              const inviteUrl = invite ? getInviteUrl(invite.invite_token) : '';
              const isPending = !invite || invite.status === 'pending';

              return (
                <div key={i} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      Invite {i + 1}
                    </span>
                    <span className={`text-sm ${getInviteStatusColor(invite)}`}>
                      {getInviteStatus(invite)}
                    </span>
                  </div>

                  {isPending && invite && (
                    <div className="flex gap-3">
                      {/* Share Button - Takes most space */}
                      <button
                        onClick={() => handleShare(inviteUrl, i + 1)}
                        className="flex-1 border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-900 py-3 px-4 rounded-xl transition-colors"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Share2 size={18} strokeWidth={2} />
                          <span className="font-semibold text-sm">Share invite {i + 1}</span>
                        </div>
                      </button>

                      {/* Copy Icon Button - Compact square */}
                      <button
                        onClick={() => handleCopy(inviteUrl, i)}
                        className="w-14 h-14 border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-600 rounded-xl transition-colors flex items-center justify-center"
                        title="Copy invite message"
                      >
                        {copiedIndex === i ? (
                          <Check size={20} className="text-green-600" />
                        ) : (
                          <Copy size={20} />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {locked && (
        <div className="px-2 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800 text-center">
            🔒 Mode locked - someone has already responded to an invite
          </p>
        </div>
      )}
    </div>
  );
}
