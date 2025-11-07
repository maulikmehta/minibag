/**
 * ErrorBoundary Component
 * Catches JavaScript errors in child components and displays a fallback UI
 * Prevents the entire app from crashing on render errors
 */

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught error:', error, errorInfo);

    // Store error info in state
    this.state.error = error;
    this.state.errorInfo = errorInfo;

    // TODO: Send to error tracking service (Sentry)
    // if (window.Sentry) {
    //   Sentry.captureException(error, { extra: errorInfo });
    // }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI from props, or default fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {this.props.title || 'Something went wrong'}
              </h1>
              <p className="text-gray-600">
                {this.props.message || 'We encountered an unexpected error. Please try refreshing the page.'}
              </p>
            </div>

            {/* Show error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 text-left bg-red-50 border border-red-200 rounded p-4">
                <p className="text-sm font-mono text-red-800 mb-2">
                  <strong>Error:</strong> {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className="text-xs text-red-700">
                    <summary className="cursor-pointer font-semibold mb-2">Stack trace</summary>
                    <pre className="whitespace-pre-wrap overflow-auto max-h-48">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReload}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Refresh Page
              </button>

              {this.props.onReset && (
                <button
                  onClick={() => {
                    this.handleReset();
                    this.props.onReset();
                  }}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Try Again
                </button>
              )}

              {this.props.showBackButton && (
                <button
                  onClick={() => window.history.back()}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Go Back
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * SessionErrorBoundary - Specialized error boundary for session screens
 * Includes session-specific error handling and recovery
 */
export class SessionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('SessionErrorBoundary caught error:', error, errorInfo);

    // Log session context for debugging
    if (this.props.sessionId) {
      console.error('Session context:', {
        sessionId: this.props.sessionId,
        timestamp: new Date().toISOString()
      });
    }

    // TODO: Send to error tracking with session context
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="text-6xl mb-4">🛒</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Session Error
              </h1>
              <p className="text-gray-600 mb-4">
                We encountered an error loading your shopping session.
              </p>
              {this.props.sessionId && (
                <p className="text-sm text-gray-500 font-mono">
                  Session: {this.props.sessionId}
                </p>
              )}
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 text-left bg-red-50 border border-red-200 rounded p-4">
                <p className="text-sm font-mono text-red-800">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Refresh Session
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
