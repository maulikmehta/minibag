import React, { useState, useRef, useEffect } from 'react';
import { extractFirstName } from '../../utils/sessionTransformers';

/**
 * ParticipantAvatar Component
 *
 * Displays a circular avatar for a participant with selection states.
 * Used in session screens to show participants and allow selection.
 *
 * @param {string} displayText - Text to display (3-letter alias)
 * @param {string} label - Label below avatar (e.g., "Host", participant name)
 * @param {boolean} isSelected - Whether this participant is currently selected
 * @param {boolean} hasItems - Whether this participant has added items
 * @param {function} onClick - Callback when avatar is clicked
 * @param {string} size - Size variant: 'sm' (48px) or 'md' (64px). Default: 'md'
 * @param {string} realName - Full real name for long-press reveal (e.g., "Maulik Patel")
 * @param {boolean} isConfirmed - Whether participant has confirmed their list
 * @param {boolean} canSeeRealName - If true, allows long-press to reveal real name (host only)
 */
function ParticipantAvatar({
  displayText,
  label,
  isSelected = false,
  hasItems = false,
  onClick,
  size = 'md',
  realName = null,
  isConfirmed = false,
  canSeeRealName = false
}) {
  const [showPopup, setShowPopup] = useState(false);
  const pressTimer = useRef(null);
  const hideTimer = useRef(null);

  const sizeClasses = size === 'sm' ? 'w-12 h-12' : 'w-16 h-16';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  // Determine border styling based on state
  const borderClass = isSelected
    ? 'bg-gradient-to-br from-blue-500 via-purple-500 to-purple-600 p-[2px]'
    : hasItems
    ? 'border-2 border-green-600'
    : 'border-2 border-gray-300';

  // Extract first name for popup
  const firstName = realName ? extractFirstName(realName) : null;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (pressTimer.current) clearTimeout(pressTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  // Long press handlers
  const handlePressStart = (e) => {
    // Only show popup if we have a real name AND permission to see it (host only)
    if (!firstName || !canSeeRealName) return;

    // Clear any existing timers
    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);

    // Start long press timer (500ms)
    pressTimer.current = setTimeout(() => {
      setShowPopup(true);
    }, 500);
  };

  const handlePressEnd = () => {
    // Clear the press timer if they release before 500ms
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }

    // If popup is showing, hide it after 2 seconds
    if (showPopup) {
      hideTimer.current = setTimeout(() => {
        setShowPopup(false);
      }, 2000);
    }
  };

  const handleContextMenu = (e) => {
    // Prevent default context menu on long press (mobile) if allowed to see real name
    if (firstName && canSeeRealName) {
      e.preventDefault();
    }
  };

  return (
    <button
      onClick={onClick}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onContextMenu={handleContextMenu}
      className="flex flex-col items-center flex-shrink-0 relative transition-transform duration-150 active:scale-95"
    >
      {/* First name popup */}
      {showPopup && firstName && (
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 z-10 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg shadow-lg whitespace-nowrap">
          {firstName}
          {/* Arrow pointing down */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}

      <div className={`${sizeClasses} rounded-full flex items-center justify-center mb-2 transition-all ${borderClass} bg-white relative ${hasItems ? 'animate-bounce-in' : ''}`}>
        <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
          <span className={`${textSize} font-medium text-gray-900`}>
            {displayText}
          </span>
        </div>

        {/* Confirmation checkmark badge */}
        {isConfirmed && (
          <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-green-600 rounded-full flex items-center justify-center border-2 border-white animate-pop">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
      <p className={`text-xs ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
        {label}
      </p>
    </button>
  );
}

export default ParticipantAvatar;
