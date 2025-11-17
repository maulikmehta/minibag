import { useMemo } from 'react';
import { useNotificationContext } from '../contexts/NotificationContext';

/**
 * Simplified hook for using notifications
 * Provides friendly methods for each notification type
 *
 * @example
 * const notify = useNotification();
 *
 * notify.success('Item added successfully!');
 * notify.error('Failed to save changes');
 * notify.warning('This action cannot be undone');
 * notify.info('Session will expire in 10 minutes');
 */
export function useNotification() {
  const {
    addNotification,
    clearBanner,
    getBannerNotification,
    updateBanner
  } = useNotificationContext();

  // Memoize the notification object to maintain stable reference across renders
  // This prevents infinite loops in components that depend on this hook
  return useMemo(() => ({
    /**
     * Show a success notification
     * @param {string} message - Success message
     * @param {number} [duration=3000] - Duration in milliseconds
     * @param {string} [priority] - Priority level ('low', 'normal', 'high', 'critical')
     * @returns {string} Notification ID
     */
    success: (message, duration, priority) => addNotification('success', message, duration, priority),

    /**
     * Show an error notification
     * @param {string} message - Error message
     * @param {number} [duration=3000] - Duration in milliseconds
     * @param {string} [priority] - Priority level ('low', 'normal', 'high', 'critical')
     * @returns {string} Notification ID
     */
    error: (message, duration, priority) => addNotification('error', message, duration, priority),

    /**
     * Show a warning notification
     * @param {string} message - Warning message
     * @param {number} [duration=3000] - Duration in milliseconds
     * @param {string} [priority] - Priority level ('low', 'normal', 'high', 'critical')
     * @returns {string} Notification ID
     */
    warning: (message, duration, priority) => addNotification('warning', message, duration, priority),

    /**
     * Show an info notification
     * @param {string} message - Info message
     * @param {number} [duration=3000] - Duration in milliseconds
     * @param {string} [priority] - Priority level ('low', 'normal', 'high', 'critical')
     * @returns {string} Notification ID
     */
    info: (message, duration, priority) => addNotification('info', message, duration, priority),

    /**
     * Clear the current banner notification
     */
    clearBanner,

    /**
     * Get the current banner notification
     * @returns {object|null} Current banner notification or null
     */
    getBannerNotification,

    /**
     * Update banner notification if it matches a condition
     * @param {function} predicate - Function that tests if banner should be updated
     * @param {string} newMessage - New message to display
     * @returns {boolean} True if banner was updated
     */
    updateBanner
  }), [addNotification, clearBanner, getBannerNotification, updateBanner]);
}
