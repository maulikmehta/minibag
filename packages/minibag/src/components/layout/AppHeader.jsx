import React from 'react';
import { ShoppingBag } from 'lucide-react';

/**
 * AppHeader Component
 *
 * Branded header bar for app screens.
 * Shows Minibag logo and name consistently across screens.
 *
 * @param {boolean} showLogo - Whether to show the logo icon (default: true)
 * @param {React.ReactNode} rightContent - Optional content for right side (e.g., menu button)
 */
function AppHeader({ showLogo = true, rightContent = null }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
      <div className="flex items-center gap-2">
        {showLogo && (
          <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
            <ShoppingBag size={18} className="text-white" strokeWidth={2.5} />
          </div>
        )}
        <h1 className="text-lg font-bold text-gray-900">Minibag</h1>
      </div>
      {rightContent && (
        <div className="flex items-center gap-2">
          {rightContent}
        </div>
      )}
    </div>
  );
}

export default AppHeader;
