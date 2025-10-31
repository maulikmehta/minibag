import { useState, useEffect } from 'react';

/**
 * Hook for managing toast notifications in session screens
 * Auto-dismisses notifications after 3 seconds
 */
export function useSessionNotifications() {
  const [notification, setNotification] = useState(null);

  // Auto-dismiss notifications after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  return {
    notification,
    showNotification: setNotification
  };
}
