'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  getPendingActions, 
  deletePendingAction, 
  updatePendingAction,
  hasPendingActions,
  type PendingAction 
} from '@/lib/offline-storage';
import { notesAPI, tasksAPI } from '@/lib/api';

export interface OnlineStatusHook {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  syncPendingActions: () => Promise<void>;
  lastSyncAttempt: Date | null;
}

export function useOnlineStatus(): OnlineStatusHook {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAttempt, setLastSyncAttempt] = useState<Date | null>(null);

  // Check initial online status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
    }
  }, []);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    try {
      const hasActions = await hasPendingActions();
      if (hasActions) {
        const actions = await getPendingActions();
        setPendingCount(actions.length);
      } else {
        setPendingCount(0);
      }
    } catch (error) {
      console.error('Failed to get pending actions count:', error);
    }
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      syncPendingActions();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial pending count
    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Execute a pending action
  const executeAction = async (action: PendingAction): Promise<boolean> => {
    try {
      switch (action.type) {
        case 'CREATE_NOTE':
          await notesAPI.create(action.data as Parameters<typeof notesAPI.create>[0]);
          break;
        case 'UPDATE_NOTE':
          await notesAPI.update(
            action.entityId, 
            action.data as Parameters<typeof notesAPI.update>[1]
          );
          break;
        case 'DELETE_NOTE':
          await notesAPI.delete(action.entityId);
          break;
        case 'CREATE_TASK':
          await tasksAPI.create(action.data as Parameters<typeof tasksAPI.create>[0]);
          break;
        case 'UPDATE_TASK':
          await tasksAPI.update(
            action.entityId, 
            action.data as Parameters<typeof tasksAPI.update>[1]
          );
          break;
        case 'DELETE_TASK':
          await tasksAPI.delete(action.entityId);
          break;
        case 'COMPLETE_TASK':
          await tasksAPI.update(action.entityId, { 
            isCompleted: true, 
            status: 'completed' 
          });
          break;
        case 'MOVE_TASK':
          await tasksAPI.move(
            action.entityId, 
            action.data as Parameters<typeof tasksAPI.move>[1]
          );
          break;
        default:
          console.warn('Unknown action type:', action.type);
          return false;
      }
      return true;
    } catch (error) {
      console.error(`Failed to execute action ${action.type}:`, error);
      return false;
    }
  };

  // Sync all pending actions
  const syncPendingActions = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    setIsSyncing(true);
    setLastSyncAttempt(new Date());

    try {
      const actions = await getPendingActions();
      
      for (const action of actions) {
        const success = await executeAction(action);
        
        if (success) {
          // Delete successful action
          if (action.id !== undefined) {
            await deletePendingAction(action.id);
          }
        } else {
          // Increment retry count and update
          if (action.id !== undefined) {
            const updatedAction = { ...action, retryCount: action.retryCount + 1 };
            
            // Remove if too many retries
            if (updatedAction.retryCount >= 5) {
              await deletePendingAction(action.id);
              console.error('Action removed after 5 failed attempts:', action);
            } else {
              await updatePendingAction(updatedAction);
            }
          }
        }
      }

      await updatePendingCount();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, updatePendingCount]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    syncPendingActions,
    lastSyncAttempt,
  };
}

// Simple hook for just online status (no sync logic)
export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
