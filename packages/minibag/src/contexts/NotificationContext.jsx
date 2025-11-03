import React, { createContext, useState, useCallback, useContext, useEffect } from 'react';

/**
 * Notification Context for managing global notifications
 * Supports two types of notifications:
 * 1. Toast notifications - for critical errors and important alerts
 * 2. Banner notifications - for contextual, soft notifications
 */
const NotificationContext = createContext();

/**
 * Maximum number of toast notifications to display simultaneously
 */
const MAX_NOTIFICATIONS = 3;

/**
 * Default duration for notifications (milliseconds)
 */
const DEFAULT_DURATION = 3000;

/**
 * Notification priority levels
 * - 'critical': Always shows as toast (errors, system failures)
 * - 'high': Shows as toast (warnings, important info)
 * - 'normal': Shows in banner if available, falls back to toast
 * - 'low': Shows in banner only (contextual updates)
 */
export const NOTIFICATION_PRIORITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low'
};

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [bannerNotification, setBannerNotification] = useState(null);
  const [bannerQueue, setBannerQueue] = useState([]);

  // Track active timers to prevent memory leaks
  const timersRef = React.useRef({
    banner: null,
    toasts: new Map()
  });

  /**
   * Show next banner notification from queue
   * Notifications stay visible until next one arrives (no auto-dismiss)
   */
  const showNextBanner = useCallback(() => {
    setBannerQueue(prev => {
      if (prev.length === 0) {
        // No more notifications in queue
        return prev;
      }

      const [next, ...rest] = prev;
      setBannerNotification(next);

      return rest;
    });
  }, []);

  /**
   * Add a new notification to the queue
   * Routes to banner or toast based on priority
   * @param {string} type - Type of notification: 'success', 'error', 'warning', 'info'
   * @param {string} message - Message to display
   * @param {number} duration - Duration in milliseconds (default: 3000)
   * @param {string} priority - Priority level (default: based on type)
   * @returns {string} Notification ID
   */
  const addNotification = useCallback((type, message, duration = DEFAULT_DURATION, priority = null) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Determine priority based on type if not explicitly set
    const notificationPriority = priority || (() => {
      if (type === 'error') return NOTIFICATION_PRIORITY.CRITICAL;
      if (type === 'warning') return NOTIFICATION_PRIORITY.HIGH;
      if (type === 'success') return NOTIFICATION_PRIORITY.LOW;
      return NOTIFICATION_PRIORITY.NORMAL;
    })();

    const notification = {
      id,
      type,
      message,
      duration,
      priority: notificationPriority,
      timestamp: Date.now()
    };

    // Route to banner or toast based on priority
    if (notificationPriority === NOTIFICATION_PRIORITY.LOW ||
        notificationPriority === NOTIFICATION_PRIORITY.NORMAL) {
      // Add to banner queue - new notifications immediately replace current one
      setBannerNotification(notification);

      // If there are more notifications coming, they'll replace this one
      // No auto-dismiss timer - stays until next notification arrives
    } else {
      // Show in toast for high/critical priority
      setNotifications(prev => {
        // Add new notification
        const updated = [...prev, notification];

        // Keep only the most recent MAX_NOTIFICATIONS
        if (updated.length > MAX_NOTIFICATIONS) {
          return updated.slice(-MAX_NOTIFICATIONS);
        }

        return updated;
      });

      // Auto-dismiss toast with timer tracking
      if (duration > 0) {
        const timerId = setTimeout(() => {
          removeNotification(id);
          timersRef.current.toasts.delete(id);
        }, duration);

        // Track timer to allow cleanup
        timersRef.current.toasts.set(id, timerId);
      }
    }

    return id;
  }, []);

  /**
   * Remove a notification by ID
   * @param {string} id - Notification ID to remove
   */
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));

    // Clear associated timer if exists
    const timer = timersRef.current.toasts.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.toasts.delete(id);
    }
  }, []);

  /**
   * Clear all notifications
   */
  const clearAll = useCallback(() => {
    setNotifications([]);

    // Clear all toast timers
    timersRef.current.toasts.forEach(timer => clearTimeout(timer));
    timersRef.current.toasts.clear();
  }, []);

  /**
   * Clear banner notification
   */
  const clearBanner = useCallback(() => {
    setBannerNotification(null);
  }, []);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      // Clear banner timer
      if (timersRef.current.banner) {
        clearTimeout(timersRef.current.banner);
      }

      // Clear all toast timers
      timersRef.current.toasts.forEach(timer => clearTimeout(timer));
      timersRef.current.toasts.clear();
    };
  }, []);

  const value = {
    notifications,
    bannerNotification,
    addNotification,
    removeNotification,
    clearAll,
    clearBanner
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to access notification context
 * @throws {Error} If used outside NotificationProvider
 */
export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
};
