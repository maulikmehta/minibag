import React from 'react';

/**
 * ItemRow Component
 *
 * Displays a single item row with image, name, subtitle, and optional action content.
 * Used across the app for consistent item display.
 *
 * @param {string} imageUrl - URL of item thumbnail
 * @param {string} fallbackEmoji - Emoji to show if image fails (default: 🥬)
 * @param {string} name - Item name
 * @param {string|React.ReactNode} subtitle - Subtitle text or component
 * @param {React.ReactNode} rightContent - Optional content on the right (quantity, button, etc.)
 * @param {function} onClick - Optional click handler for the entire row
 * @param {string} className - Additional CSS classes
 */
function ItemRow({
  imageUrl,
  fallbackEmoji = '🥬',
  name,
  subtitle,
  rightContent,
  onClick,
  className = ''
}) {
  const containerClass = onClick
    ? 'flex items-center gap-3 py-3 px-2 cursor-pointer hover:bg-gray-50 transition-colors'
    : 'flex items-center gap-3 py-3 px-2';

  return (
    <div className={`${containerClass} ${className}`} onClick={onClick}>
      {/* Image with fallback */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          loading="lazy"
          className="w-10 h-10 rounded-full object-cover bg-gray-100 flex-shrink-0"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextElementSibling.style.display = 'flex';
          }}
        />
      ) : null}
      <div
        className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-xl"
        style={{ display: imageUrl ? 'none' : 'flex' }}
      >
        {fallbackEmoji}
      </div>

      {/* Item info */}
      <div className="flex-1 min-w-0">
        <p className="text-base text-gray-900">{name}</p>
        {subtitle && (
          <p className="text-sm text-gray-600">{subtitle}</p>
        )}
      </div>

      {/* Right content (quantity, button, etc.) */}
      {rightContent && (
        <div className="flex-shrink-0">
          {rightContent}
        </div>
      )}
    </div>
  );
}

export default ItemRow;
