import React from 'react';
import { ShoppingBag, MoreVertical, X, HelpCircle } from 'lucide-react';
import LanguageSwitcher from '../LanguageSwitcher.jsx';

/**
 * AppHeader Component
 *
 * Fixed/sticky header bar for app screens.
 * Shows Minibag logo, language switcher, help icon, and optional end session menu.
 *
 * @param {boolean} showLogo - Whether to show the logo icon (default: true)
 * @param {Object} i18n - i18n instance for language management
 * @param {function} onLanguageChange - Language change handler
 * @param {function} onLogoClick - Logo/brand click handler (navigate home with warning)
 * @param {boolean} showEndSessionMenu - Whether to show end session menu (host only)
 * @param {boolean} endSessionMenuOpen - Whether end session menu is open
 * @param {function} onEndSessionMenuToggle - Toggle end session menu
 * @param {function} onEndSession - End session handler
 * @param {function} onHelpClick - Help icon click handler (for on-demand tooltips)
 * @param {React.ReactNode} rightContent - Optional additional right content
 */
function AppHeader({
  showLogo = true,
  i18n = null,
  onLanguageChange = null,
  onLogoClick = null,
  showEndSessionMenu = false,
  endSessionMenuOpen = false,
  onEndSessionMenuToggle = null,
  onEndSession = null,
  onHelpClick = null,
  rightContent = null
}) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 max-w-md mx-auto flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
      <button
        onClick={onLogoClick}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        {showLogo && (
          <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
            <ShoppingBag size={18} className="text-white" strokeWidth={2.5} />
          </div>
        )}
        <h1 className="text-lg font-bold text-gray-900">Minibag</h1>
      </button>

      <div className="flex items-center gap-3">
        {/* Language Switcher */}
        {i18n && i18n.language && onLanguageChange && (
          <LanguageSwitcher
            currentLanguage={i18n.language}
            onLanguageChange={onLanguageChange}
          />
        )}

        {/* Help Icon */}
        {onHelpClick && (
          <button
            onClick={onHelpClick}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            title="Show guided tour"
            data-tour="help-button"
          >
            <HelpCircle size={18} className="text-gray-600" />
          </button>
        )}

        {/* End Session Menu (Host only) */}
        {showEndSessionMenu && onEndSessionMenuToggle && onEndSession && (
          <div className="relative">
            <button
              onClick={() => onEndSessionMenuToggle(!endSessionMenuOpen)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <MoreVertical size={18} className="text-gray-600" />
            </button>

            {endSessionMenuOpen && (
              <>
                {/* Backdrop to close menu */}
                <div
                  onClick={() => onEndSessionMenuToggle(false)}
                  className="fixed inset-0 z-30"
                />

                {/* Menu dropdown */}
                <div className="absolute right-0 top-8 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-40 w-48">
                  <button
                    onClick={() => {
                      onEndSessionMenuToggle(false);
                      onEndSession();
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-red-50 transition-colors flex items-center gap-2 text-red-600 hover:text-red-700"
                  >
                    <X size={16} />
                    <span className="font-medium">End Session</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Additional right content */}
        {rightContent}
      </div>
    </div>
  );
}

export default AppHeader;
