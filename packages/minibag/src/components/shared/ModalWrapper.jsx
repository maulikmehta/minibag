import React from 'react';
import { X } from 'lucide-react';

/**
 * ModalWrapper Component
 *
 * Reusable modal container with backdrop and close button.
 * Used across the application for consistent modal styling.
 *
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Callback when modal is closed
 * @param {string} title - Optional modal title
 * @param {React.ReactNode} children - Modal content
 * @param {string} maxWidth - Optional max width (default: 'max-w-sm')
 * @param {boolean} showCloseButton - Show X close button (default: true)
 */
function ModalWrapper({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-sm',
  showCloseButton = true
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
      <div className={`bg-white rounded-lg ${maxWidth} w-full p-6 relative`}>
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        )}

        {title && (
          <h2 className="text-xl text-gray-900 mb-4 font-semibold">{title}</h2>
        )}

        {children}
      </div>
    </div>
  );
}

export default ModalWrapper;
