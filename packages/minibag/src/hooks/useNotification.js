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
  const { addNotification } = useNotificationContext();

  return {
    /**
     * Show a success notification
     * @param {string} message - Success message
     * @param {number} [duration=3000] - Duration in milliseconds
     * @returns {string} Notification ID
     */
    success: (message, duration) => addNotification('success', message, duration),

    /**
     * Show an error notification
     * @param {string} message - Error message
     * @param {number} [duration=3000] - Duration in milliseconds
     * @returns {string} Notification ID
     */
    error: (message, duration) => addNotification('error', message, duration),

    /**
     * Show a warning notification
     * @param {string} message - Warning message
     * @param {number} [duration=3000] - Duration in milliseconds
     * @returns {string} Notification ID
     */
    warning: (message, duration) => addNotification('warning', message, duration),

    /**
     * Show an info notification
     * @param {string} message - Info message
     * @param {number} [duration=3000] - Duration in milliseconds
     * @returns {string} Notification ID
     */
    info: (message, duration) => addNotification('info', message, duration)
  };
}
