import React from 'react';
import { Plus, Users, X } from 'lucide-react';
import MinibagIcon from '../components/MinibagIcon.jsx';

/**
 * HomeScreen Component
 *
 * Landing page with branding and quick action menu.
 * Allows users to create new lists, view history, or go pro.
 *
 * @param {boolean} showPlusMenu - Whether the plus menu is open
 * @param {function} setShowPlusMenu - Toggle plus menu
 * @param {function} onCreateSession - Navigate to create session screen
 * @param {boolean} showSignUpModal - Whether sign-up modal is open
 * @param {function} setShowSignUpModal - Toggle sign-up modal
 * @param {string} signUpContext - Context for sign-up ('past-runs' or 'pro')
 * @param {function} setSignUpContext - Set sign-up context
 */
function HomeScreen({
  showPlusMenu,
  setShowPlusMenu,
  onCreateSession,
  showSignUpModal,
  setShowSignUpModal,
  signUpContext,
  setSignUpContext
}) {
  return (
    <div className="max-w-md mx-auto bg-gradient-to-b from-green-50 to-white min-h-screen flex flex-col">

      <div className="flex-1 flex flex-col items-center justify-center px-12 py-16">
        {/* Minibag Logo */}
        <MinibagIcon size={64} className="mb-6" />

        {/* Product Name */}
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Minibag</h1>

        {/* Tagline */}
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-2xl font-semibold text-gray-900 leading-tight">
            Simple lists that work alone or <span style={{ color: '#7c3aed' }}>together</span>
          </p>
        </div>

        {/* Trust Signal */}
        <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-600"></div>
          <span className="text-sm text-green-800 font-medium">Free forever • No signup</span>
        </div>
      </div>

      <div className="fixed bottom-8 right-8 z-40">
        {showPlusMenu && (
          <div
            className="absolute bottom-20 right-0 bg-white rounded-modal shadow-2xl border border-gray-200 overflow-hidden mb-3 w-52 animate-modal-enter"
            role="menu"
            aria-label="Actions menu"
          >
            <button
              onClick={() => { setShowPlusMenu(false); onCreateSession(); }}
              className="w-full px-5 py-4 text-left hover:bg-green-50 hover:text-green-700 border-b border-gray-200 transition-all duration-150 active:bg-green-100"
            >
              <p className="text-base font-medium text-gray-900">New List</p>
              <p className="text-xs text-gray-500 mt-0.5">Start a new shopping list</p>
            </button>
            <button
              onClick={() => {
                setShowPlusMenu(false);
                setSignUpContext('past-runs');
                setShowSignUpModal(true);
              }}
              data-tour="shopping-history"
              className="w-full px-5 py-4 text-left hover:bg-green-50 hover:text-green-700 border-b border-gray-200 transition-all duration-150 active:bg-green-100"
            >
              <p className="text-base font-medium text-gray-900">Shopping History</p>
              <p className="text-xs text-gray-500 mt-0.5">View past shopping lists</p>
            </button>
            <button
              onClick={() => {
                setShowPlusMenu(false);
                setSignUpContext('pro');
                setShowSignUpModal(true);
              }}
              data-tour="go-pro"
              className="w-full px-5 py-4 text-left hover:bg-green-50 hover:text-green-700 transition-all duration-150 active:bg-green-100"
            >
              <p className="text-base font-medium text-gray-900">Go Pro</p>
              <p className="text-xs text-gray-500 mt-0.5">Unlock premium features</p>
            </button>
          </div>
        )}

        <button
          onClick={() => setShowPlusMenu(!showPlusMenu)}
          data-tour="fab-menu"
          className={`w-16 h-16 bg-green-600 hover:bg-green-700 rounded-full shadow-xl hover:shadow-2xl flex items-center justify-center transition-all active:scale-90 ${
            showPlusMenu ? 'rotate-45 scale-110' : ''
          }`}
          aria-label={showPlusMenu ? 'Close menu' : 'Open menu'}
          aria-expanded={showPlusMenu}
          aria-haspopup="menu"
        >
          <Plus size={32} className="text-white" strokeWidth={2.5} />
        </button>
      </div>

      {showPlusMenu && (
        <div
          onClick={() => setShowPlusMenu(false)}
          className="fixed inset-0 z-30"
          aria-hidden="true"
        />
      )}

      {/* Sign up modal */}
      {showSignUpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-lg max-w-sm w-full p-6 relative">
            <button
              onClick={() => setShowSignUpModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <p className="text-xl text-gray-900 mb-4">
              {signUpContext === 'past-runs' ? 'Sign up to view history' : 'Sign up for Pro'}
            </p>
            <p className="text-sm text-gray-600 mb-6">
              {signUpContext === 'past-runs'
                ? 'Create an account to save and view your shopping history across all devices.'
                : 'Unlock unlimited participants, vendor confirmations, and advanced analytics.'}
            </p>

            <div className="space-y-3 mb-6">
              <button className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-base font-semibold flex items-center justify-center gap-2 transition-colors">
                <Users size={18} />
                Sign up with Phone
              </button>
              <button className="w-full py-3 border-2 border-gray-300 hover:border-green-600 text-gray-900 hover:text-green-600 rounded-lg text-base font-medium transition-colors">
                Log in
              </button>
            </div>

            <button
              onClick={() => setShowSignUpModal(false)}
              className="w-full text-sm text-gray-600 hover:text-gray-900"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomeScreen;
