import React, { useState, useEffect } from 'react';
import { useIdentityDisplay } from '../../hooks/useIdentityDisplay';

/**
 * IdentityBanner Component
 *
 * Replaces the static "You're joined as" message with a dynamic contextual banner.
 * Shows identity information and temporary contextual messages.
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

  // Determine banner content based on phase and message
  const getBannerContent = () => {
    // Show temporary message if present
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
      className={`inline-flex items-center gap-2 ${content.bgColor} border ${content.borderColor} px-3 py-2 rounded-lg transition-all duration-300`}
    >
      <span className="text-lg">{content.emoji}</span>
      <p className={`text-sm ${content.textColor}`}>
        {content.text}
      </p>
    </div>
  );
}

export default IdentityBanner;
