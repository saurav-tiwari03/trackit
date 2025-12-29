'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, Check, X, Send, Smartphone, Monitor, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePushNotifications } from '@/hooks/use-push-notifications';

export function PushNotificationSettings() {
  const {
    isSupported,
    isSubscribed,
    isPending,
    permission,
    subscribe,
    unsubscribe,
    sendTestNotification,
    error,
  } = usePushNotifications();

  const [testSent, setTestSent] = useState(false);

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handleTestNotification = async () => {
    const success = await sendTestNotification();
    if (success) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    }
  };

  if (!isSupported) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <BellOff className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">Push Notifications</CardTitle>
              <CardDescription>Not supported on this device</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Push notifications are not supported in your browser. Try using Chrome, Firefox, or Safari on a supported device.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isSubscribed ? 'bg-green-500/10' : 'bg-muted'}`}>
              <Bell className={`h-5 w-5 ${isSubscribed ? 'text-green-500' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Push Notifications
                {isSubscribed && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 text-xs">
                    Active
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {isSubscribed
                  ? 'Receive updates even when the app is closed'
                  : 'Enable to receive task reminders and updates'}
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={isPending}
          />
        </div>
      </CardHeader>

      <AnimatePresence mode="wait">
        {permission === 'denied' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <X className="h-4 w-4 flex-shrink-0" />
                <p>
                  Notification permission was denied. Please enable notifications in your browser settings to continue.
                </p>
              </div>
            </CardContent>
          </motion.div>
        )}

        {error && permission !== 'denied' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <X className="h-4 w-4 flex-shrink-0" />
                <p>{error}</p>
              </div>
            </CardContent>
          </motion.div>
        )}

        {isSubscribed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <CardContent className="pt-0 space-y-4">
              {/* Device info */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {/iPhone|iPad|Android/.test(navigator.userAgent) ? (
                  <Smartphone className="h-4 w-4" />
                ) : (
                  <Monitor className="h-4 w-4" />
                )}
                <span>
                  Notifications enabled for this device
                </span>
              </div>

              {/* Notification preferences */}
              <div className="space-y-3 pt-2 border-t">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Notification Types
                </Label>
                
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Task Reminders</Label>
                    <p className="text-xs text-muted-foreground">Get reminded before task deadlines</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Habit Reminders</Label>
                    <p className="text-xs text-muted-foreground">Daily reminders to complete habits</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Team Updates</Label>
                    <p className="text-xs text-muted-foreground">When team members update shared tasks</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              {/* Test notification button */}
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestNotification}
                  disabled={isPending || testSent}
                  className="w-full"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : testSent ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                      Test notification sent!
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Test Notification
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

