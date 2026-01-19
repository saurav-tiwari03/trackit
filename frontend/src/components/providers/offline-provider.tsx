'use client';

import { useEffect, useRef } from 'react';
import { initOfflineDB, getPendingActions, hasPendingActions } from '@/lib/offline-storage';
import { useOnlineStatus } from '@/hooks/use-online-status';

interface OfflineProviderProps {
  children: React.ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const { syncPendingActions } = useOnlineStatus();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Initialize IndexedDB
    const init = async () => {
      try {
        await initOfflineDB();
        console.log('[Offline] IndexedDB initialized');

        // Check for pending actions and sync if online
        if (navigator.onLine) {
          const hasActions = await hasPendingActions();
          if (hasActions) {
            const actions = await getPendingActions();
            console.log(`[Offline] Found ${actions.length} pending actions, syncing...`);
            syncPendingActions();
          }
        }
      } catch (error) {
        console.error('[Offline] Failed to initialize IndexedDB:', error);
      }
    };

    init();

    // Listen for service worker sync messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_OFFLINE_ACTIONS') {
          console.log('[Offline] Service worker requested sync');
          syncPendingActions();
        }
      });
    }
  }, [syncPendingActions]);

  return <>{children}</>;
}
