/**
 * Loading State Component
 *
 * Provides specific, helpful loading messages instead of generic "Loading..."
 * Optimized for elderly users with clear communication
 *
 * Features:
 * - Specific messages (not generic)
 * - Large, readable text
 * - Animated spinner
 * - ARIA live region for screen readers
 */

import { Loader } from 'lucide-react';

export default function LoadingState({
  message = 'Loading...',
  size = 'medium', // 'small' | 'medium' | 'large'
  fullScreen = false,
}) {
  // Size configurations
  const sizeConfig = {
    small: {
      spinner: 'w-6 h-6',
      text: 'text-sm',
      padding: 'p-4',
    },
    medium: {
      spinner: 'w-8 h-8',
      text: 'text-base',
      padding: 'p-8',
    },
    large: {
      spinner: 'w-12 h-12',
      text: 'text-lg',
      padding: 'p-12',
    },
  };

  const config = sizeConfig[size];

  const content = (
    <div
      className={`flex flex-col items-center justify-center ${config.padding}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader
        className={`${config.spinner} text-blue-600 animate-spin mb-4`}
        aria-hidden="true"
      />
      <p className={`${config.text} text-gray-700 font-medium text-center`}>
        {message}
      </p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
}

/**
 * Specific loading messages for different scenarios
 * Use these instead of generic "Loading..."
 */
export const LoadingMessages = {
  // Session-related
  CREATING_SESSION: 'Creating your session...',
  JOINING_SESSION: 'Joining session...',
  LOADING_SESSION: 'Loading session details...',
  UPDATING_SESSION: 'Updating session...',

  // Items
  LOADING_CATALOG: 'Loading available items...',
  ADDING_ITEM: 'Adding item...',
  UPDATING_ITEMS: 'Updating your items...',
  DELETING_ITEM: 'Removing item...',

  // Payments
  RECORDING_PAYMENT: 'Recording payment...',
  LOADING_PAYMENTS: 'Loading payment information...',
  CALCULATING_SPLIT: 'Calculating payment split...',

  // Participants
  LOADING_PARTICIPANTS: 'Loading participants...',
  UPDATING_PARTICIPANT: 'Updating participant...',

  // Analytics
  LOADING_ANALYTICS: 'Loading analytics data...',

  // General
  SAVING: 'Saving changes...',
  PROCESSING: 'Processing...',
  PLEASE_WAIT: 'Please wait...',
};
