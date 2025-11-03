import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../hooks/useNotification.js';
import InviteCard from './InviteCard.jsx';
import { buildInviteUrl, copyInviteToClipboard, shareInvite } from '../../utils/inviteHelpers.js';

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
 * @param {boolean} props.showConfirmButton - Whether to show OK button (for modal mode)
 * @param {Function} props.onConfirm - Callback when OK button clicked
 * @param {Function} props.onInvitesUpdate - Callback to update invites immediately after API call
 */
export default function InviteTabsSelector({
  sessionId,
  expectedCount,
  invites = [],
  locked = false,
  onChange,
  showConfirmButton = false,
  onConfirm,
  onInvitesUpdate
}) {
  const notify = useNotification();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(expectedCount === null ? null : expectedCount);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [loadingInvites, setLoadingInvites] = useState(false);

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

    // Generate invites but don't start timeout yet (wait for OK button)
    if (value > 0) {
      setLoadingInvites(true);
      await commitSelection(value, { start_timeout: false });
      setLoadingInvites(false);
    }
  };

  const commitSelection = async (value, options = {}) => {
    const selectedValue = value ?? activeTab;
    const { start_timeout = true } = options;

    // Call API to update expected_participants and get invite links
    try {
      const response = await fetch(`/api/sessions/${sessionId}/expected`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expected_participants: selectedValue,
          start_timeout
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error);
      }

      // Update invites immediately with response data (no need to wait for polling)
      if (data.data?.invites && onInvitesUpdate) {
        onInvitesUpdate(data.data.invites);
      }

      return true;
    } catch (error) {
      console.error('Failed to update mode:', error);
      notify.error('Failed to update mode. Please try again.');
      return false;
    }
  };

  const handleConfirm = async () => {
    if (activeTab === null) {
      notify.warning('Please select a shopping mode');
      return;
    }

    // NOW start the 20-minute timeout by calling API with start_timeout: true
    const success = await commitSelection(activeTab, { start_timeout: true });

    if (success && onConfirm) {
      onConfirm(activeTab);
    }
  };

  // Handle copy with timeout for UI feedback
  const handleCopy = async (invite, index) => {
    const inviteUrl = buildInviteUrl(sessionId, invite.invite_token);
    const success = await copyInviteToClipboard(inviteUrl, t, notify);
    if (success) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  // Handle share with fallback to copy
  const handleShare = async (invite, inviteNumber) => {
    const inviteUrl = buildInviteUrl(sessionId, invite.invite_token);
    await shareInvite(inviteUrl, t, notify, () => handleCopy(invite, inviteNumber - 1));
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
              return (
                <InviteCard
                  key={i}
                  invite={invite}
                  inviteNumber={i + 1}
                  onShare={handleShare}
                  onCopy={handleCopy}
                  copiedIndex={copiedIndex}
                />
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

      {/* OK Button for Modal Mode */}
      {showConfirmButton && (
        <div className="px-2 pt-4 border-t border-gray-200">
          <button
            onClick={handleConfirm}
            disabled={activeTab === null || locked || loadingInvites}
            className={`
              w-full py-3 px-4 rounded-lg font-medium transition-all
              ${activeTab === null || locked || loadingInvites
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
              }
            `}
          >
            {activeTab === null ? 'Select a mode to continue' : loadingInvites ? 'Loading invites...' : 'OK'}
          </button>
        </div>
      )}
    </div>
  );
}
