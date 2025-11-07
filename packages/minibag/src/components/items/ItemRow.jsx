import React from 'react';

// Parse quantity from subtitle for horizontal layout (e.g., "1kg" -> { qty: "1", unit: "kg" })
const parseQuantity = (subtitle) => {
  if (!subtitle || typeof subtitle !== 'string') return null;
  const match = subtitle.match(/^([\d.]+)\s*(kg|g|l|ml)?$/i);
  if (match) {
    return { qty: match[1], unit: match[2] || 'kg' };
  }
  return null;
};

/**
 * ItemRow Component
 *
 * Displays a single item row with emoji icon, name, subtitle, and optional action content.
 * Used across the app for consistent item display.
 *
 * @param {string} emoji - Emoji to display for the item (default: 🥬)
 * @param {string} name - Item name
 * @param {string|React.ReactNode} subtitle - Subtitle text or component
 * @param {React.ReactNode} rightContent - Optional content on the right (quantity, button, etc.)
 * @param {function} onClick - Optional click handler for the entire row
 * @param {string} className - Additional CSS classes
 * @param {string} layout - Layout mode: 'vertical' (default) or 'horizontal'
 */
function ItemRow({
  emoji = '🥬',
  name,
  subtitle,
  rightContent,
  onClick,
  className = '',
  layout = 'vertical'
}) {
  const containerClass = onClick
    ? 'flex items-center gap-3 py-3 px-2 cursor-pointer hover:bg-gray-50 transition-colors'
    : 'flex items-center gap-3 py-3 px-2';

  const quantityData = layout === 'horizontal' ? parseQuantity(subtitle) : null;

  return (
    <div className={`${containerClass} ${className}`} onClick={onClick}>
      {/* Item Emoji Icon */}
      <div
        className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-xl"
      >
        {emoji}
      </div>

      {/* Item info */}
      <div className="flex-1 min-w-0">
        {layout === 'horizontal' && quantityData ? (
          // Horizontal layout: Name and quantity on same line
          <div className="flex items-center justify-between gap-2">
            <p className="text-base text-gray-900">{name}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-lg text-gray-900">{quantityData.qty}</span>
              <span className="text-xs text-gray-500">{quantityData.unit}</span>
            </div>
          </div>
        ) : (
          // Vertical layout: Name and subtitle stacked
          <>
            <p className="text-base text-gray-900">{name}</p>
            {subtitle && (
              <p className="text-sm text-gray-600">{subtitle}</p>
            )}
          </>
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
