import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * LoadingSpinner Component
 *
 * Reusable loading spinner with optional text.
 * Used across the application for consistent loading states.
 *
 * @param {number} size - Spinner size (default: 48)
 * @param {string} text - Optional loading text
 * @param {boolean} fullScreen - Show as full screen loader (default: true)
 * @param {string} className - Additional CSS classes
 */
function LoadingSpinner({
  size = 48,
  text = 'Loading...',
  fullScreen = true,
  className = ''
}) {
  const containerClasses = fullScreen
    ? 'max-w-md mx-auto bg-white min-h-screen flex flex-col items-center justify-center'
    : 'flex flex-col items-center justify-center';

  return (
    <div className={`${containerClasses} ${className}`}>
      <Loader2 size={size} className="text-gray-900 animate-spin mb-4" />
      {text && <p className="text-lg text-gray-600">{text}</p>}
    </div>
  );
}

export default LoadingSpinner;
