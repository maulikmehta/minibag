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
      // Show in banner for low/normal priority
      setBannerNotification(notification);

      // Auto-dismiss banner
      if (duration > 0) {
        setTimeout(() => {
          setBannerNotification(prev => prev?.id === id ? null : prev);
        }, duration);
      }
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

      // Auto-dismiss toast
      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
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
  }, []);

  /**
   * Clear all notifications
   */
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Clear banner notification
   */
  const clearBanner = useCallback(() => {
    setBannerNotification(null);
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
