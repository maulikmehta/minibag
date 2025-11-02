import React from 'react';

/**
 * Full-screen error display for system errors
 * Clearly indicates the error is not the user's fault
 */
const ErrorScreen = ({
  error = null,
  message = null,
  onRetry = null,
  onDismiss = null,
  showWaitButton = false
}) => {
  // Determine error message to display
  const getErrorMessage = () => {
    if (message) return message;
    if (error?.userMessage) return error.userMessage;
    if (error?.message) return error.message;
    return "We're having trouble connecting. This isn't your fault.";
  };

  // Determine error title
  const getErrorTitle = () => {
    if (error?.status >= 500) return "Server Error";
    if (error?.status === 404) return "Not Found";
    if (error?.status === 0 || error?.message?.includes('network')) return "Connection Error";
    if (error?.message?.includes('timeout')) return "Timeout";
    return "System Error";
  };

  const errorMessage = getErrorMessage();
  const errorTitle = getErrorTitle();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Large error icon */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-100">
            <svg
              className="w-16 h-16 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        </div>

        {/* Error title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          {errorTitle}
        </h1>

        {/* Error message */}
        <p className="text-gray-600 mb-2">
          {errorMessage}
        </p>

        {/* Reassurance */}
        <p className="text-sm text-gray-500 mb-8">
          This is a system issue, not something you did wrong.
        </p>

        {/* Error details (if available and in development) */}
        {process.env.NODE_ENV === 'development' && error?.message && (
          <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left">
            <p className="text-xs font-mono text-gray-700 break-all">
              {error.message}
            </p>
            {error.status && (
              <p className="text-xs font-mono text-gray-500 mt-2">
                Status: {error.status}
              </p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
            >
              Try Again
            </button>
          )}

          {showWaitButton && onDismiss && (
            <button
              onClick={onDismiss}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold transition-colors"
            >
              Wait & Try Later
            </button>
          )}

          {!onRetry && !showWaitButton && onDismiss && (
            <button
              onClick={onDismiss}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold transition-colors"
            >
              Dismiss
            </button>
          )}

          {/* Go Home button if no other actions */}
          {!onRetry && !onDismiss && (
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold transition-colors"
            >
              Go Home
            </button>
          )}
        </div>

        {/* Additional help text */}
        <p className="text-xs text-gray-400 mt-6">
          If this problem persists, please check your internet connection or try again later.
        </p>
      </div>
    </div>
  );
};

export default ErrorScreen;
