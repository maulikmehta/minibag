import React, { useState, useEffect } from 'react';
import { useIdentityDisplay } from '../../hooks/useIdentityDisplay';
import { useNotificationContext } from '../../contexts/NotificationContext';

/**
 * IdentityBanner Component
 *
 * Dynamic contextual banner that shows:
 * 1. Global banner notifications (from NotificationContext)
 * 2. Local temporary messages (passed as props)
 * 3. Identity information based on session phase
 *
 * @param {Object} currentParticipant - The current user's participant object
 * @param {Object} currentUser - The current user (with is_creator flag)
 * @param {string} phase - Current session phase: 'waiting' | 'shopping' | 'confirming' | 'payment'
 * @param {string|null} message - Temporary message to display (auto-dismisses after 3s)
 * @param {function} onMessageDismiss - Callback when temporary message is dismissed
 */
function IdentityBanner({
  currentParticipant,
  currentUser,
  phase = 'waiting',
  message = null,
  onMessageDismiss
}) {
  const [showMessage, setShowMessage] = useState(false);
  const isHost = currentUser?.is_creator || false;

  // Get banner notification from global context
  const { bannerNotification, clearBanner } = useNotificationContext();

  // Get identity display information
  const identity = useIdentityDisplay(
    currentParticipant,
    currentUser,
    phase === 'payment' ? 'payment' : 'full'
  );

  // Handle temporary message display
  useEffect(() => {
    if (message) {
      setShowMessage(true);
      const timer = setTimeout(() => {
        setShowMessage(false);
        if (onMessageDismiss) {
          onMessageDismiss();
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onMessageDismiss]);

  // Determine banner content based on priority:
  // 1. Global banner notification (from context)
  // 2. Local temporary message (from props)
  // 3. Identity display (default)
  const getBannerContent = () => {
    // Priority 1: Global banner notification
    if (bannerNotification) {
      const typeColors = {
        success: {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          emoji: '✓'
        },
        info: {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          emoji: 'ℹ️'
        },
        warning: {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          emoji: '⚠️'
        },
        error: {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          emoji: '✗'
        }
      };

      const colors = typeColors[bannerNotification.type] || typeColors.info;

      return {
        text: bannerNotification.message,
        emoji: colors.emoji,
        bgColor: colors.bgColor,
        borderColor: colors.borderColor,
        textColor: colors.textColor,
        isDismissible: true,
        onDismiss: clearBanner
      };
    }

    // Priority 2: Local temporary message
    if (showMessage && message) {
      return {
        text: message,
        emoji: '👋',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800'
      };
    }

    // Default identity message based on phase
    const alias = identity.alias;
    const displayName = identity.displayName;

    switch (phase) {
      case 'waiting':
        return {
          text: (
            <>
              You're joined as <span className="font-semibold">{displayName}</span>
              {isHost && ' (Host)'}
            </>
          ),
          emoji: currentParticipant?.avatar_emoji || '👤',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800'
        };

      case 'shopping':
        return {
          text: (
            <>
              Adding items as <span className="font-semibold">{alias}</span>
            </>
          ),
          emoji: currentParticipant?.avatar_emoji || '🛒',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800'
        };

      case 'confirming':
        return {
          text: (
            <>
              Review <span className="font-semibold">{alias}</span>'s items
            </>
          ),
          emoji: currentParticipant?.avatar_emoji || '✓',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          textColor: 'text-purple-800'
        };

      case 'payment':
        return {
          text: (
            <>
              You are <span className="font-semibold">{displayName}</span>
            </>
          ),
          emoji: currentParticipant?.avatar_emoji || '💳',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          textColor: 'text-orange-800'
        };

      default:
        return {
          text: (
            <>
              You're <span className="font-semibold">{alias}</span>
            </>
          ),
          emoji: currentParticipant?.avatar_emoji || '👤',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800'
        };
    }
  };

  const content = getBannerContent();

  return (
    <div
      className={`inline-flex items-center gap-2 ${content.bgColor} border ${content.borderColor} px-3 py-2 rounded-lg transition-all duration-300 relative`}
    >
      <span className="text-lg">{content.emoji}</span>
      <p className={`text-sm ${content.textColor}`}>
        {content.text}
      </p>
      {content.isDismissible && content.onDismiss && (
        <button
          onClick={content.onDismiss}
          className={`ml-2 ${content.textColor} opacity-60 hover:opacity-100 transition-opacity`}
          aria-label="Dismiss notification"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export default IdentityBanner;
