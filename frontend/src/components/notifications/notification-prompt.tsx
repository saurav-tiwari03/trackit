'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/use-push-notifications';

const PROMPT_DISMISSED_KEY = 'notification-prompt-dismissed';
const PROMPT_DELAY_MS = 5000; // Show after 5 seconds

export function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const { isSupported, isSubscribed, isPending, permission, subscribe } = usePushNotifications();

  useEffect(() => {
    // Don't show if not supported, already subscribed, or permission denied
    if (!isSupported || isSubscribed || permission === 'denied') {
      return;
    }

    // Check if user dismissed the prompt before
    const dismissed = localStorage.getItem(PROMPT_DISMISSED_KEY);
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      // Don't show again for 24 hours after dismissal
      if (dismissedTime > oneDayAgo) {
        return;
      }
    }

    // Show prompt after delay
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, PROMPT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isSupported, isSubscribed, permission]);

  const handleEnable = async () => {
    try {
      const success = await subscribe();
      if (success) {
        setShowPrompt(false);
      }
    } catch (err) {
      console.error('Failed to enable notifications:', err);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem(PROMPT_DISMISSED_KEY, Date.now().toString());
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:max-w-sm z-50"
        >
          <div className="bg-card border border-border rounded-xl shadow-2xl p-4 backdrop-blur-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10 shrink-0">
                <Bell className="h-5 w-5 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">Enable Notifications</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Get reminders for your habits and task updates, even when the app is closed.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={handleEnable}
                    disabled={isPending}
                    className="h-8 text-xs bg-orange-500 hover:bg-orange-600"
                  >
                    {isPending ? 'Enabling...' : 'Enable'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDismiss}
                    className="h-8 text-xs"
                  >
                    Not now
                  </Button>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 rounded-md hover:bg-muted transition-colors shrink-0"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

