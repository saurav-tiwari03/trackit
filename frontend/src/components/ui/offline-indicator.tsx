'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, Cloud, CloudOff, Check } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  className?: string;
  showPendingCount?: boolean;
  variant?: 'fixed' | 'inline';
}

export function OfflineIndicator({ 
  className, 
  showPendingCount = true,
  variant = 'fixed' 
}: OfflineIndicatorProps) {
  const { isOnline, isSyncing, pendingCount, syncPendingActions } = useOnlineStatus();
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [prevPendingCount, setPrevPendingCount] = useState(pendingCount);

  // Show success message when sync completes
  useEffect(() => {
    if (prevPendingCount > 0 && pendingCount === 0 && isOnline && !isSyncing) {
      setShowSyncSuccess(true);
      const timer = setTimeout(() => setShowSyncSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
    setPrevPendingCount(pendingCount);
  }, [pendingCount, isOnline, isSyncing, prevPendingCount]);

  // Don't show anything if online with no pending actions and no success message
  if (isOnline && pendingCount === 0 && !showSyncSuccess && !isSyncing) {
    return null;
  }

  const containerClasses = cn(
    'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg transition-all',
    variant === 'fixed' && 'fixed bottom-4 left-4 z-50',
    !isOnline && 'bg-orange-500 text-white',
    isOnline && pendingCount > 0 && 'bg-blue-500 text-white',
    isOnline && isSyncing && 'bg-blue-500 text-white',
    showSyncSuccess && 'bg-green-500 text-white',
    className
  );

  return (
    <AnimatePresence mode="wait">
      {/* Offline State */}
      {!isOnline && (
        <motion.div
          key="offline"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={containerClasses}
        >
          <WifiOff className="h-4 w-4" />
          <span>You&apos;re offline</span>
          {showPendingCount && pendingCount > 0 && (
            <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {pendingCount} pending
            </span>
          )}
        </motion.div>
      )}

      {/* Syncing State */}
      {isOnline && isSyncing && (
        <motion.div
          key="syncing"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={containerClasses}
        >
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Syncing changes...</span>
        </motion.div>
      )}

      {/* Pending Actions (online but not syncing) */}
      {isOnline && !isSyncing && pendingCount > 0 && !showSyncSuccess && (
        <motion.div
          key="pending"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={containerClasses}
        >
          <CloudOff className="h-4 w-4" />
          <span>{pendingCount} change{pendingCount !== 1 ? 's' : ''} pending</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-2 h-6 px-2 text-white hover:bg-white/20"
            onClick={() => syncPendingActions()}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Sync
          </Button>
        </motion.div>
      )}

      {/* Sync Success */}
      {showSyncSuccess && (
        <motion.div
          key="success"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={containerClasses}
        >
          <Check className="h-4 w-4" />
          <span>All changes synced</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Compact inline version for header/navbar
export function OfflineStatusBadge({ className }: { className?: string }) {
  const { isOnline, isSyncing, pendingCount } = useOnlineStatus();

  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className={cn(
          'flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium',
          !isOnline && 'bg-orange-500/10 text-orange-500',
          isOnline && pendingCount > 0 && 'bg-blue-500/10 text-blue-500',
          isOnline && isSyncing && 'bg-blue-500/10 text-blue-500',
          className
        )}
      >
        {!isOnline && (
          <>
            <WifiOff className="h-3 w-3" />
            <span>Offline</span>
          </>
        )}
        {isOnline && isSyncing && (
          <>
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>Syncing</span>
          </>
        )}
        {isOnline && !isSyncing && pendingCount > 0 && (
          <>
            <Cloud className="h-3 w-3" />
            <span>{pendingCount} pending</span>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
