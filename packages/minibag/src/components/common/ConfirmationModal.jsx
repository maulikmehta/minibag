/**
 * Confirmation Modal Component
 *
 * Accessible confirmation dialog for destructive actions
 * Optimized for elderly users with:
 * - Large, readable text (18px+)
 * - High contrast colors
 * - Big touch targets (48px minimum)
 * - Clear action descriptions
 * - Keyboard navigation support
 * - ARIA labels for screen readers
 */

import { useEffect, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'info'
}) {
  const confirmButtonRef = useRef(null);

  // Focus the cancel button when modal opens (safer default)
  useEffect(() => {
    if (isOpen && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen) return null;

  // Variant styles
  const variantStyles = {
    danger: {
      icon: 'bg-red-100 text-red-600',
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    },
    warning: {
      icon: 'bg-amber-100 text-amber-600',
      button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
    },
    info: {
      icon: 'bg-blue-100 text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Modal container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8">
          {/* Close button */}
          <button
            type="button"
            className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Icon */}
          <div className="flex items-center justify-center mb-4">
            <div className={`rounded-full p-4 ${styles.icon}`}>
              <AlertTriangle className="w-12 h-12" aria-hidden="true" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-6">
            <h3
              id="modal-title"
              className="text-xl font-semibold text-gray-900 mb-3"
            >
              {title}
            </h3>
            <p className="text-base text-gray-600 leading-relaxed">
              {message}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            {/* Cancel button (primary action for safety) */}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 text-base font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-gray-300 transition-all min-h-[56px]"
              aria-label={`${cancelText} this action`}
            >
              {cancelText}
            </button>

            {/* Confirm button (destructive action) */}
            <button
              type="button"
              ref={confirmButtonRef}
              onClick={onConfirm}
              className={`flex-1 px-6 py-4 text-base font-medium text-white rounded-xl focus:outline-none focus:ring-4 transition-all min-h-[56px] ${styles.button}`}
              aria-label={`${confirmText} - this action cannot be undone`}
            >
              {confirmText}
            </button>
          </div>

          {/* Keyboard hint (for accessibility) */}
          <p className="text-sm text-gray-500 text-center mt-4">
            Press <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300 font-mono">Esc</kbd> to cancel
          </p>
        </div>
      </div>
    </div>
  );
}
