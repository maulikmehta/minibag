import React from 'react';

/**
 * ParticipantAvatar Component
 *
 * Displays a circular avatar for a participant with selection states.
 * Used in session screens to show participants and allow selection.
 *
 * @param {string} displayText - Text to display (initials or nickname)
 * @param {string} label - Label below avatar (e.g., "Host", participant name)
 * @param {boolean} isSelected - Whether this participant is currently selected
 * @param {boolean} hasItems - Whether this participant has added items
 * @param {function} onClick - Callback when avatar is clicked
 * @param {string} size - Size variant: 'sm' (48px) or 'md' (64px). Default: 'md'
 */
function ParticipantAvatar({
  displayText,
  label,
  isSelected = false,
  hasItems = false,
  onClick,
  size = 'md'
}) {
  const sizeClasses = size === 'sm' ? 'w-12 h-12' : 'w-16 h-16';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  // Determine border styling based on state
  const borderClass = isSelected
    ? 'bg-gradient-to-br from-blue-500 via-purple-500 to-purple-600 p-[2px]'
    : hasItems
    ? 'border-2 border-green-600'
    : 'border-2 border-gray-300';

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center flex-shrink-0"
    >
      <div className={`${sizeClasses} rounded-full flex items-center justify-center mb-2 transition-all ${borderClass} bg-white`}>
        <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
          <span className={`${textSize} font-medium text-gray-900`}>
            {displayText}
          </span>
        </div>
      </div>
      <p className={`text-xs ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
        {label}
      </p>
    </button>
  );
}

export default ParticipantAvatar;
