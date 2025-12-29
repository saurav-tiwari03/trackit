import { Router, Response } from 'express';
import webpush from 'web-push';
import { PushSubscription } from '../models';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

// Configure web-push with VAPID keys
// Generate keys with: npx web-push generate-vapid-keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@trackit.app';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

// @route   GET /api/push/vapid-public-key
// @desc    Get VAPID public key for client subscription
// @access  Public
router.get('/vapid-public-key', (_req, res: Response) => {
  if (!vapidPublicKey) {
    res.status(500).json({
      success: false,
      message: 'Push notifications not configured',
    });
    return;
  }
  res.status(200).json({
    success: true,
    data: { publicKey: vapidPublicKey },
  });
});

// Protected routes
router.use(protect);

// @route   POST /api/push/subscribe
// @desc    Subscribe to push notifications
// @access  Private
router.post('/subscribe', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { subscription, deviceName, userAgent } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      res.status(400).json({
        success: false,
        message: 'Invalid subscription data',
      });
      return;
    }

    // Check if subscription already exists
    let existingSubscription = await PushSubscription.findOne({
      endpoint: subscription.endpoint,
    });

    if (existingSubscription) {
      // Update existing subscription
      existingSubscription.user = userId;
      existingSubscription.keys = subscription.keys;
      existingSubscription.userAgent = userAgent || '';
      existingSubscription.deviceName = deviceName || '';
      existingSubscription.isActive = true;
      await existingSubscription.save();
    } else {
      // Create new subscription
      existingSubscription = await PushSubscription.create({
        user: userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent: userAgent || '',
        deviceName: deviceName || '',
        isActive: true,
      });
    }

    res.status(201).json({
      success: true,
      data: existingSubscription,
      message: 'Successfully subscribed to push notifications',
    });
  } catch (error) {
    console.error('Push subscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Error subscribing to push notifications',
    });
  }
});

// @route   POST /api/push/unsubscribe
// @desc    Unsubscribe from push notifications
// @access  Private
router.post('/unsubscribe', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { endpoint } = req.body;

    if (endpoint) {
      // Unsubscribe specific device
      await PushSubscription.deleteOne({ user: userId, endpoint });
    } else {
      // Unsubscribe all devices
      await PushSubscription.deleteMany({ user: userId });
    }

    res.status(200).json({
      success: true,
      message: 'Successfully unsubscribed from push notifications',
    });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Error unsubscribing from push notifications',
    });
  }
});

// @route   GET /api/push/subscriptions
// @desc    Get all active subscriptions for current user
// @access  Private
router.get('/subscriptions', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const subscriptions = await PushSubscription.find({
      user: userId,
      isActive: true,
    }).select('-keys');

    res.status(200).json({
      success: true,
      data: subscriptions,
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscriptions',
    });
  }
});

// @route   POST /api/push/test
// @desc    Send a test push notification
// @access  Private
router.post('/test', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    const subscriptions = await PushSubscription.find({
      user: userId,
      isActive: true,
    });

    if (subscriptions.length === 0) {
      res.status(404).json({
        success: false,
        message: 'No active subscriptions found',
      });
      return;
    }

    const payload = JSON.stringify({
      title: '🎉 TrackIt Notification',
      body: 'Push notifications are working! You will now receive updates.',
      icon: '/icon-192x192.png',
      badge: '/favicon-48x48.png',
      tag: 'test-notification',
      data: { url: '/dashboard' },
    });

    const results = await Promise.allSettled(
      subscriptions.map(async sub => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth,
              },
            },
            payload
          );
          return { success: true, endpoint: sub.endpoint };
        } catch (error: any) {
          // If subscription is expired or invalid, mark as inactive
          if (error.statusCode === 404 || error.statusCode === 410) {
            await PushSubscription.updateOne(
              { _id: sub._id },
              { isActive: false }
            );
          }
          throw error;
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.status(200).json({
      success: true,
      message: `Sent to ${successful} device(s), ${failed} failed`,
      data: { successful, failed },
    });
  } catch (error) {
    console.error('Test push error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending test notification',
    });
  }
});

// Utility function to send push notification to a user (for internal use)
export async function sendPushToUser(
  userId: string,
  notification: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: Record<string, any>;
    actions?: Array<{ action: string; title: string; icon?: string }>;
    requireInteraction?: boolean;
  }
): Promise<{ successful: number; failed: number }> {
  try {
    const subscriptions = await PushSubscription.find({
      user: userId,
      isActive: true,
    });

    if (subscriptions.length === 0) {
      return { successful: 0, failed: 0 };
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icon-192x192.png',
      badge: notification.badge || '/favicon-48x48.png',
      tag: notification.tag || 'trackit-notification',
      data: notification.data || { url: '/dashboard' },
      actions: notification.actions || [],
      requireInteraction: notification.requireInteraction || false,
      vibrate: [200, 100, 200],
    });

    const results = await Promise.allSettled(
      subscriptions.map(async sub => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth,
              },
            },
            payload
          );
          return true;
        } catch (error: any) {
          if (error.statusCode === 404 || error.statusCode === 410) {
            await PushSubscription.updateOne(
              { _id: sub._id },
              { isActive: false }
            );
          }
          throw error;
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return { successful, failed };
  } catch (error) {
    console.error('Send push to user error:', error);
    return { successful: 0, failed: 0 };
  }
}

export default router;
