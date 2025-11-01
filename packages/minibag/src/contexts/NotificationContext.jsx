import React, { createContext, useState, useCallback, useContext, useEffect } from 'react';

/**
 * Notification Context for managing global toast notifications
 * Supports success, error, warning, and info notification types
 */
const NotificationContext = createContext();

/**
 * Maximum number of notifications to display simultaneously
 */
const MAX_NOTIFICATIONS = 3;

/**
 * Default duration for notifications (milliseconds)
 */
const DEFAULT_DURATION = 3000;

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  /**
   * Add a new notification to the queue
   * @param {string} type - Type of notification: 'success', 'error', 'warning', 'info'
   * @param {string} message - Message to display
   * @param {number} duration - Duration in milliseconds (default: 3000)
   * @returns {string} Notification ID
   */
  const addNotification = useCallback((type, message, duration = DEFAULT_DURATION) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const notification = {
      id,
      type,
      message,
      duration,
      timestamp: Date.now()
    };

    setNotifications(prev => {
      // Add new notification
      const updated = [...prev, notification];

      // Keep only the most recent MAX_NOTIFICATIONS
      if (updated.length > MAX_NOTIFICATIONS) {
        return updated.slice(-MAX_NOTIFICATIONS);
      }

      return updated;
    });

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
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

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearAll
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
