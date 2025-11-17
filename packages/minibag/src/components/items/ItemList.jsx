import React from 'react';

/**
 * ItemList Component
 *
 * Container for displaying a list of items with dividers and empty state.
 * Used across the app for consistent list styling.
 *
 * @param {React.ReactNode} children - List items (typically ItemRow components)
 * @param {string} emptyMessage - Message to show when list is empty
 * @param {boolean} showEmpty - Whether to show empty state (default: true)
 * @param {string} className - Additional CSS classes
 */
function ItemList({
  children,
  emptyMessage = 'No items',
  showEmpty = true,
  className = ''
}) {
  const hasItems = React.Children.count(children) > 0;

  if (!hasItems && showEmpty) {
    return (
      <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  if (!hasItems) {
    return null;
  }

  return (
    <div className={`divide-y divide-gray-200 ${className}`}>
      {children}
    </div>
  );
}

export default ItemList;
