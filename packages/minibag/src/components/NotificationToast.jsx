import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useNotificationContext } from '../contexts/NotificationContext';

/**
 * Icon mapping for notification types
 */
const NOTIFICATION_ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info
};

/**
 * Style mapping for notification types
 */
const NOTIFICATION_STYLES = {
  success: 'bg-green-500 text-white',
  error: 'bg-red-500 text-white',
  warning: 'bg-yellow-500 text-gray-900',
  info: 'bg-blue-500 text-white'
};

/**
 * ARIA role mapping for notification types
 */
const NOTIFICATION_ROLES = {
  success: 'status',
  error: 'alert',
  warning: 'alert',
  info: 'status'
};

/**
 * Single notification toast component
 */
function NotificationItem({ notification, onDismiss }) {
  const [isExiting, setIsExiting] = useState(false);
  const Icon = NOTIFICATION_ICONS[notification.type] || Info;
  const styles = NOTIFICATION_STYLES[notification.type] || NOTIFICATION_STYLES.info;
  const role = NOTIFICATION_ROLES[notification.type] || 'status';

  const handleDismiss = () => {
    setIsExiting(true);
    // Wait for animation to complete before removing
    setTimeout(() => {
      onDismiss(notification.id);
    }, 200);
  };

  return (
    <div
      role={role}
      aria-live={notification.type === 'error' || notification.type === 'warning' ? 'assertive' : 'polite'}
      className={`
        ${styles}
        rounded-lg shadow-lg p-4 mb-2 flex items-start gap-3
        transition-all duration-200 ease-in-out
        ${isExiting ? 'opacity-0 transform translate-y-2' : 'opacity-100 transform translate-y-0'}
        animate-slideDown
      `}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <p className="flex-1 text-sm font-medium">{notification.message}</p>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 hover:opacity-80 transition-opacity"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * NotificationToast container component
 * Renders all active notifications in a fixed position
 */
export default function NotificationToast() {
  const { notifications, removeNotification, clearAll } = useNotificationContext();

  // Handle Escape key to dismiss all notifications
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && notifications.length > 0) {
        clearAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [notifications.length, clearAll]);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] w-[90%] max-w-md"
      role="region"
      aria-label="Notifications"
    >
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={removeNotification}
        />
      ))}
    </div>
  );
}
