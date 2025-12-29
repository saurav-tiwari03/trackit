'use client';

import { useState, useEffect, useCallback } from 'react';
import { pushAPI } from '@/lib/api';

interface UsePushNotificationsResult {
  isSupported: boolean;
  isSubscribed: boolean;
  isPending: boolean;
  permission: NotificationPermission | 'default';
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  sendTestNotification: () => Promise<boolean>;
  error: string | null;
}

// Convert URL-safe base64 to ArrayBuffer (for VAPID key)
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

// Get device name from user agent
function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS Device';
  if (/Android/.test(ua)) return 'Android Device';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown Device';
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [error, setError] = useState<string | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      if (typeof window === 'undefined') return false;
      return (
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
      );
    };

    setIsSupported(checkSupport());

    if (checkSupport()) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check current subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (err) {
        console.error('Error checking subscription:', err);
      }
    };

    checkSubscription();
  }, [isSupported]);

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers are not supported');
    }

    try {
      // Force update the service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });
      
      // Check if there's a waiting worker and skip waiting
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      
      // If installing, wait for it to activate
      if (registration.installing) {
        await new Promise<void>((resolve) => {
          registration.installing!.addEventListener('statechange', (e) => {
            if ((e.target as ServiceWorker).state === 'activated') {
              resolve();
            }
          });
        });
      }
      
      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      
      return registration;
    } catch (err) {
      console.error('Service worker registration failed:', err);
      throw err;
    }
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push notifications are not supported on this device');
      return false;
    }

    setIsPending(true);
    setError(null);

    try {
      // Request notification permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        setError('Notification permission was denied');
        return false;
      }

      // Register service worker and wait for it to be active
      await registerServiceWorker();
      const registration = await navigator.serviceWorker.ready;
      
      // Wait a bit for the service worker to fully activate
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get VAPID public key from server
      const vapidResponse = await pushAPI.getVapidPublicKey();
      const vapidPublicKey = vapidResponse.data.data.publicKey;

      if (!vapidPublicKey) {
        setError('Push notifications are not configured on the server');
        return false;
      }

      // Check for existing subscription and unsubscribe if exists (might have old key)
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        try {
          await existingSubscription.unsubscribe();
        } catch (e) {
          console.warn('Failed to unsubscribe existing subscription:', e);
        }
      }

      // Subscribe to push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Send subscription to server
      await pushAPI.subscribe({
        subscription: subscription.toJSON(),
        deviceName: getDeviceName(),
        userAgent: navigator.userAgent,
      });

      setIsSubscribed(true);
      return true;
    } catch (err: any) {
      console.error('Subscription error:', err);
      
      // Provide more helpful error messages
      let errorMessage = 'Failed to subscribe to push notifications';
      if (err.name === 'AbortError') {
        errorMessage = 'Push subscription was aborted. Please try again.';
      } else if (err.name === 'NotAllowedError') {
        errorMessage = 'Notification permission was denied';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      return false;
    } finally {
      setIsPending(false);
    }
  }, [isSupported, registerServiceWorker]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    setIsPending(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();

        // Remove from server
        await pushAPI.unsubscribe(subscription.endpoint);
      }

      setIsSubscribed(false);
      return true;
    } catch (err: any) {
      console.error('Unsubscribe error:', err);
      setError(err.message || 'Failed to unsubscribe from push notifications');
      return false;
    } finally {
      setIsPending(false);
    }
  }, [isSupported]);

  // Send test notification
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    if (!isSubscribed) {
      setError('You must subscribe first to receive test notifications');
      return false;
    }

    setIsPending(true);
    setError(null);

    try {
      await pushAPI.sendTest();
      return true;
    } catch (err: any) {
      console.error('Test notification error:', err);
      setError(err.message || 'Failed to send test notification');
      return false;
    } finally {
      setIsPending(false);
    }
  }, [isSubscribed]);

  return {
    isSupported,
    isSubscribed,
    isPending,
    permission,
    subscribe,
    unsubscribe,
    sendTestNotification,
    error,
  };
}

// Hook to auto-register service worker on mount
export function useServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('SW registered:', registration.scope);
        })
        .catch((err) => {
          console.error('SW registration failed:', err);
        });
    }
  }, []);
}

