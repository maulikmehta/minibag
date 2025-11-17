/**
 * Connection Status Indicator
 *
 * Shows WebSocket connection status to users
 * Critical for elderly users to know if their actions are syncing
 *
 * Features:
 * - Clear visual indicator (color + icon)
 * - Readable status message
 * - Accessible (ARIA live region)
 * - Auto-hide when connected
 * - Prominent when disconnected
 */

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, Loader } from 'lucide-react';

export default function ConnectionStatus({ isConnected, isReconnecting = false }) {
  const [showConnected, setShowConnected] = useState(false);

  // Show "Connected" message briefly when connection is restored
  useEffect(() => {
    if (isConnected && !isReconnecting) {
      setShowConnected(true);
      const timer = setTimeout(() => setShowConnected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, isReconnecting]);

  // Don't show anything when connected (after initial message fades)
  if (isConnected && !showConnected) {
    return null;
  }

  // Determine status
  let status, icon, colorClasses;

  if (isReconnecting) {
    status = 'Reconnecting...';
    icon = <Loader className="w-5 h-5 animate-spin" aria-hidden="true" />;
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
  } else if (isConnected) {
    status = 'Connected';
    icon = <Wifi className="w-5 h-5" aria-hidden="true" />;
    colorClasses = 'bg-green-50 text-green-800 border-green-200';
  } else {
    status = 'Not Connected - Changes may not sync';
    icon = <WifiOff className="w-5 h-5" aria-hidden="true" />;
    colorClasses = 'bg-red-50 text-red-800 border-red-200';
  }

  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-40 px-4 py-3 rounded-xl border-2 shadow-lg ${colorClasses} transition-all duration-300`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-base font-medium">
          {status}
        </span>
      </div>
    </div>
  );
}
