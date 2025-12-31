import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { protect, AuthRequest } from '../middleware/auth';
import { User, Subscription, Transaction } from '../models';
import { RAZORPAY_CONFIG, SUBSCRIPTION_PLANS } from '../config/config';
import { SubscriptionPlan } from '../models/Subscription';

const router = Router();

// Razorpay API base URL (v2)
const RAZORPAY_API = 'https://api.razorpay.com/v1';

// Helper to make Razorpay API calls
const razorpayRequest = async (
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' = 'GET',
  body?: Record<string, unknown>
) => {
  const auth = Buffer.from(
    `${RAZORPAY_CONFIG.KEY_ID}:${RAZORPAY_CONFIG.KEY_SECRET}`
  ).toString('base64');

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${RAZORPAY_API}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    console.error('Razorpay API error:', data);
    throw new Error(data.error?.description || 'Razorpay API request failed');
  }

  return data;
};

// Get subscription plans
router.get('/plans', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      plus: {
        ...SUBSCRIPTION_PLANS.plus,
        displayAmount: `₹${SUBSCRIPTION_PLANS.plus.amount / 100}`,
      },
      pro: {
        ...SUBSCRIPTION_PLANS.pro,
        displayAmount: `₹${SUBSCRIPTION_PLANS.pro.amount / 100}`,
      },
    },
  });
});

// Get Razorpay key (public key only - safe to expose)
router.get('/key', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      key: RAZORPAY_CONFIG.KEY_ID,
    },
  });
});

// Get current user's subscription
router.get(
  '/subscription',
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!._id;

      const user = await User.findById(userId).select(
        'subscriptionPlan subscriptionStatus subscriptionExpiresAt'
      );

      const subscription = await Subscription.findOne({ user: userId });

      // Fix: If expiration date is invalid (before 2020), recalculate it
      let expiresAt = user?.subscriptionExpiresAt;
      if (
        user?.subscriptionPlan &&
        user.subscriptionPlan !== 'free' &&
        (!expiresAt || new Date(expiresAt).getFullYear() < 2020)
      ) {
        // Set expiration to 30 days from now
        expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        // Update the user record with the corrected date
        await User.findByIdAndUpdate(userId, {
          subscriptionExpiresAt: expiresAt,
        });
        console.log(
          `Fixed subscription expiration for user ${userId}: ${expiresAt}`
        );
      }

      res.json({
        success: true,
        data: {
          plan: user?.subscriptionPlan || 'free',
          status: user?.subscriptionStatus || 'active',
          expiresAt,
          subscription,
        },
      });
    } catch (error) {
      console.error('Get subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get subscription',
      });
    }
  }
);

// Get user's transaction history
router.get(
  '/transactions',
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!._id;
      const { limit = 10, skip = 0 } = req.query;

      const transactions = await Transaction.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(Number(skip));

      const total = await Transaction.countDocuments({ user: userId });

      res.json({
        success: true,
        data: {
          transactions,
          total,
          hasMore: Number(skip) + transactions.length < total,
        },
      });
    } catch (error) {
      console.error('Get transactions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get transactions',
      });
    }
  }
);

// Create subscription (using Razorpay Subscriptions API)
router.post(
  '/create-subscription',
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!._id;
      const { plan } = req.body as { plan: 'plus' | 'pro' };

      // Validate plan
      if (!plan || !['plus', 'pro'].includes(plan)) {
        res.status(400).json({
          success: false,
          message: 'Invalid plan. Must be "plus" or "pro"',
        });
        return;
      }

      const planDetails = SUBSCRIPTION_PLANS[plan];
      const user = await User.findById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // Check if user already has an active subscription for this plan
      if (
        user.subscriptionPlan === plan &&
        user.subscriptionStatus === 'active'
      ) {
        res.status(400).json({
          success: false,
          message: 'You already have this plan',
        });
        return;
      }

      // Create Razorpay subscription
      const subscription = await razorpayRequest('/subscriptions', 'POST', {
        plan_id: planDetails.planId,
        customer_notify: 1,
        total_count: 12, // 12 billing cycles (1 year)
        notes: {
          userId: userId.toString(),
          plan,
          userEmail: user.email,
          userName: user.name,
        },
      });

      // Create pending transaction record
      await Transaction.create({
        user: userId,
        razorpayOrderId: subscription.id, // Store subscription ID
        amount: planDetails.amount,
        currency: planDetails.currency,
        plan,
        status: 'pending',
        email: user.email,
        description: planDetails.description,
        metadata: {
          subscriptionId: subscription.id,
          planId: planDetails.planId,
        },
      });

      res.json({
        success: true,
        data: {
          subscriptionId: subscription.id,
          key: RAZORPAY_CONFIG.KEY_ID,
          name: 'TrackIt',
          description: planDetails.description,
          amount: planDetails.amount,
          currency: planDetails.currency,
          prefill: {
            name: user.name,
            email: user.email,
          },
        },
      });
    } catch (error) {
      console.error('Create subscription error:', error);
      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to create subscription',
      });
    }
  }
);

// Verify subscription payment (called after successful payment on frontend)
router.post('/verify', protect, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const {
      razorpay_subscription_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    // Validate required fields
    if (
      !razorpay_subscription_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      res.status(400).json({
        success: false,
        message: 'Missing required payment details',
      });
      return;
    }

    // Find the transaction by subscription ID
    const transaction = await Transaction.findOne({
      razorpayOrderId: razorpay_subscription_id,
      user: userId,
    });

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
      return;
    }

    // Verify signature for subscription
    // Signature = HMAC-SHA256(razorpay_payment_id + '|' + razorpay_subscription_id, secret)
    const body = `${razorpay_payment_id}|${razorpay_subscription_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_CONFIG.KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      // Update transaction as failed
      await Transaction.findByIdAndUpdate(transaction._id, {
        status: 'failed',
        errorCode: 'SIGNATURE_MISMATCH',
        errorDescription: 'Payment signature verification failed',
      });

      res.status(400).json({
        success: false,
        message: 'Payment verification failed',
      });
      return;
    }

    // Get subscription details from Razorpay
    const subscriptionDetails = await razorpayRequest(
      `/subscriptions/${razorpay_subscription_id}`
    );

    // Calculate subscription period
    const now = new Date();
    // Use Razorpay's current_end if available, otherwise calculate 30 days from now
    let periodEnd: Date;
    if (
      subscriptionDetails.current_end &&
      subscriptionDetails.current_end > 0
    ) {
      periodEnd = new Date(subscriptionDetails.current_end * 1000);
    } else {
      // Default to 30 days from now for monthly subscription
      periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    console.log('Subscription details:', {
      current_end: subscriptionDetails.current_end,
      periodEnd: periodEnd.toISOString(),
    });

    // Update transaction
    await Transaction.findByIdAndUpdate(transaction._id, {
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      status: 'completed',
    });

    // Update or create subscription
    await Subscription.findOneAndUpdate(
      { user: userId },
      {
        user: userId,
        plan: transaction.plan as SubscriptionPlan,
        status: 'active',
        razorpaySubscriptionId: razorpay_subscription_id,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      { upsert: true, new: true }
    );

    // Update user's subscription fields
    await User.findByIdAndUpdate(userId, {
      subscriptionPlan: transaction.plan,
      subscriptionStatus: 'active',
      subscriptionExpiresAt: periodEnd,
    });

    // Get updated user
    const updatedUser = await User.findById(userId);

    res.json({
      success: true,
      message: 'Subscription activated successfully',
      data: {
        plan: transaction.plan,
        expiresAt: periodEnd,
        user: updatedUser,
      },
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
    });
  }
});

// Cancel subscription
router.post('/cancel', protect, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;

    const subscription = await Subscription.findOne({
      user: userId,
      status: 'active',
    });

    if (!subscription || !subscription.razorpaySubscriptionId) {
      res.status(404).json({
        success: false,
        message: 'No active subscription found',
      });
      return;
    }

    // Cancel subscription in Razorpay
    await razorpayRequest(
      `/subscriptions/${subscription.razorpaySubscriptionId}/cancel`,
      'POST',
      { cancel_at_cycle_end: 1 } // Cancel at end of current billing cycle
    );

    // Update subscription status
    await Subscription.findByIdAndUpdate(subscription._id, {
      status: 'cancelled',
      cancelledAt: new Date(),
    });

    // Update user status (they keep access until period end)
    await User.findByIdAndUpdate(userId, {
      subscriptionStatus: 'cancelled',
    });

    res.json({
      success: true,
      message:
        'Subscription will be cancelled at the end of the current billing period',
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
    });
  }
});

// Helper function to calculate period end date
const calculatePeriodEnd = (currentEnd: number | undefined): Date => {
  if (currentEnd && currentEnd > 0) {
    return new Date(currentEnd * 1000);
  }
  // Default to 30 days from now
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
};

// Webhook handler for Razorpay events
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'] as string;

    // Verify webhook signature if secret is configured
    if (RAZORPAY_CONFIG.WEBHOOK_SECRET && webhookSignature) {
      const body = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_CONFIG.WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

      if (expectedSignature !== webhookSignature) {
        console.error('[WEBHOOK] Signature mismatch - rejecting request');
        res.status(400).json({ success: false, message: 'Invalid signature' });
        return;
      }
    }

    const event = req.body;
    const { event: eventType, payload } = event;

    console.log(`[WEBHOOK] Received event: ${eventType}`);

    switch (eventType) {
      // ============================================
      // SUBSCRIPTION EVENTS
      // ============================================

      case 'subscription.authenticated': {
        // Subscription authentication successful (before first payment)
        const subscription = payload.subscription.entity;
        const notes = subscription.notes || {};
        const { userId } = notes;

        if (userId) {
          console.log(
            `[WEBHOOK] Subscription authenticated for user ${userId}, subscription: ${subscription.id}`
          );

          await Subscription.findOneAndUpdate(
            { user: userId },
            {
              razorpaySubscriptionId: subscription.id,
              status: 'authenticated',
            },
            { upsert: true }
          );
        }
        break;
      }

      case 'subscription.activated': {
        // Subscription is now active (first payment successful)
        const subscription = payload.subscription.entity;
        const notes = subscription.notes || {};
        const { userId } = notes;
        const plan = notes.plan || 'plus';

        if (userId) {
          const periodEnd = calculatePeriodEnd(subscription.current_end);

          console.log(
            `[WEBHOOK] Subscription activated for user ${userId}, plan: ${plan}, expires: ${periodEnd.toISOString()}`
          );

          await Subscription.findOneAndUpdate(
            { user: userId },
            {
              plan: plan as SubscriptionPlan,
              status: 'active',
              razorpaySubscriptionId: subscription.id,
              currentPeriodStart: new Date(),
              currentPeriodEnd: periodEnd,
            },
            { upsert: true }
          );

          await User.findByIdAndUpdate(userId, {
            subscriptionPlan: plan,
            subscriptionStatus: 'active',
            subscriptionExpiresAt: periodEnd,
          });
        }
        break;
      }

      case 'subscription.charged': {
        // Recurring payment successful
        const payment = payload.payment.entity;
        const subscription = payload.subscription.entity;
        const notes = subscription.notes || {};
        const { userId } = notes;
        const plan = notes.plan || 'plus';

        if (userId) {
          const periodEnd = calculatePeriodEnd(subscription.current_end);

          console.log(
            `[WEBHOOK] Subscription charged for user ${userId}, amount: ${payment.amount / 100} ${payment.currency}, next renewal: ${periodEnd.toISOString()}`
          );

          // Check for duplicate transaction (idempotency)
          const existingTransaction = await Transaction.findOne({
            razorpayPaymentId: payment.id,
          });
          if (!existingTransaction) {
            await Transaction.create({
              user: userId,
              razorpayOrderId: subscription.id,
              razorpayPaymentId: payment.id,
              amount: payment.amount,
              currency: payment.currency,
              plan,
              status: 'completed',
              email: payment.email || notes.userEmail,
              paymentMethod: payment.method,
            });
          }

          // Update subscription period
          await Subscription.findOneAndUpdate(
            { user: userId },
            {
              currentPeriodStart: new Date(),
              currentPeriodEnd: periodEnd,
              status: 'active',
            }
          );

          await User.findByIdAndUpdate(userId, {
            subscriptionPlan: plan,
            subscriptionStatus: 'active',
            subscriptionExpiresAt: periodEnd,
          });
        }
        break;
      }

      case 'subscription.pending': {
        // Payment is pending (usually for bank transfers)
        const subscription = payload.subscription.entity;
        const notes = subscription.notes || {};
        const { userId } = notes;

        if (userId) {
          console.log(
            `[WEBHOOK] Subscription payment pending for user ${userId}`
          );

          await Subscription.findOneAndUpdate(
            { user: userId },
            { status: 'pending' }
          );

          await User.findByIdAndUpdate(userId, {
            subscriptionStatus: 'pending',
          });
        }
        break;
      }

      case 'subscription.halted': {
        // Subscription halted due to repeated payment failures
        const subscription = payload.subscription.entity;
        const notes = subscription.notes || {};
        const { userId } = notes;

        if (userId) {
          console.log(
            `[WEBHOOK] Subscription halted for user ${userId} - payment failures`
          );

          await Subscription.findOneAndUpdate(
            { user: userId },
            { status: 'halted' }
          );

          await User.findByIdAndUpdate(userId, {
            subscriptionStatus: 'halted',
          });

          // TODO: Send email notification to user about payment issues
        }
        break;
      }

      case 'subscription.cancelled': {
        // Subscription cancelled (by user or admin)
        const subscription = payload.subscription.entity;
        const notes = subscription.notes || {};
        const { userId } = notes;

        if (userId) {
          console.log(`[WEBHOOK] Subscription cancelled for user ${userId}`);

          await Subscription.findOneAndUpdate(
            { user: userId },
            {
              status: 'cancelled',
              cancelledAt: new Date(),
            }
          );

          // User keeps access until period end, but status shows cancelled
          await User.findByIdAndUpdate(userId, {
            subscriptionStatus: 'cancelled',
          });
        }
        break;
      }

      case 'subscription.paused': {
        // Subscription paused
        const subscription = payload.subscription.entity;
        const notes = subscription.notes || {};
        const { userId } = notes;

        if (userId) {
          console.log(`[WEBHOOK] Subscription paused for user ${userId}`);

          await Subscription.findOneAndUpdate(
            { user: userId },
            { status: 'paused', pausedAt: new Date() }
          );

          await User.findByIdAndUpdate(userId, {
            subscriptionStatus: 'paused',
          });
        }
        break;
      }

      case 'subscription.resumed': {
        // Subscription resumed after pause
        const subscription = payload.subscription.entity;
        const notes = subscription.notes || {};
        const { userId } = notes;
        const plan = notes.plan || 'plus';

        if (userId) {
          const periodEnd = calculatePeriodEnd(subscription.current_end);

          console.log(`[WEBHOOK] Subscription resumed for user ${userId}`);

          await Subscription.findOneAndUpdate(
            { user: userId },
            {
              status: 'active',
              pausedAt: null,
              currentPeriodEnd: periodEnd,
            }
          );

          await User.findByIdAndUpdate(userId, {
            subscriptionPlan: plan,
            subscriptionStatus: 'active',
            subscriptionExpiresAt: periodEnd,
          });
        }
        break;
      }

      case 'subscription.completed': {
        // All billing cycles completed
        const subscription = payload.subscription.entity;
        const notes = subscription.notes || {};
        const { userId } = notes;

        if (userId) {
          console.log(`[WEBHOOK] Subscription completed for user ${userId}`);

          await Subscription.findOneAndUpdate(
            { user: userId },
            { status: 'completed' }
          );

          await User.findByIdAndUpdate(userId, {
            subscriptionPlan: 'free',
            subscriptionStatus: 'expired',
            subscriptionExpiresAt: null,
          });
        }
        break;
      }

      case 'subscription.expired': {
        // Subscription expired
        const subscription = payload.subscription.entity;
        const notes = subscription.notes || {};
        const { userId } = notes;

        if (userId) {
          console.log(`[WEBHOOK] Subscription expired for user ${userId}`);

          await Subscription.findOneAndUpdate(
            { user: userId },
            { status: 'expired' }
          );

          await User.findByIdAndUpdate(userId, {
            subscriptionPlan: 'free',
            subscriptionStatus: 'expired',
            subscriptionExpiresAt: null,
          });
        }
        break;
      }

      // ============================================
      // PAYMENT EVENTS
      // ============================================

      case 'payment.authorized': {
        // Payment authorized but not captured (for subscriptions, usually auto-captured)
        const payment = payload.payment.entity;
        console.log(
          `[WEBHOOK] Payment authorized: ${payment.id}, amount: ${payment.amount / 100} ${payment.currency}`
        );
        break;
      }

      case 'payment.captured': {
        // Payment captured successfully
        const payment = payload.payment.entity;
        const notes = payment.notes || {};
        const { userId } = notes;

        console.log(
          `[WEBHOOK] Payment captured: ${payment.id}, amount: ${payment.amount / 100} ${payment.currency}`
        );

        if (userId) {
          // Update transaction if exists
          await Transaction.findOneAndUpdate(
            { razorpayPaymentId: payment.id },
            {
              status: 'completed',
              paymentMethod: payment.method,
            }
          );
        }
        break;
      }

      case 'payment.failed': {
        // Payment failed
        const payment = payload.payment.entity;
        const notes = payment.notes || {};
        const { userId } = notes;

        console.log(
          `[WEBHOOK] Payment failed: ${payment.id}, error: ${payment.error_code} - ${payment.error_description}`
        );

        if (userId) {
          // Update or create failed transaction record
          await Transaction.findOneAndUpdate(
            { razorpayPaymentId: payment.id },
            {
              user: userId,
              razorpayPaymentId: payment.id,
              amount: payment.amount,
              currency: payment.currency,
              status: 'failed',
              errorCode: payment.error_code,
              errorDescription: payment.error_description,
            },
            { upsert: true }
          );

          // TODO: Send email notification about failed payment
        }
        break;
      }

      // ============================================
      // REFUND EVENTS
      // ============================================

      case 'refund.created': {
        const refund = payload.refund.entity;
        console.log(
          `[WEBHOOK] Refund created: ${refund.id}, amount: ${refund.amount / 100}, payment: ${refund.payment_id}`
        );

        // Update transaction with refund info
        await Transaction.findOneAndUpdate(
          { razorpayPaymentId: refund.payment_id },
          {
            status: 'refunded',
            refundId: refund.id,
            refundAmount: refund.amount,
          }
        );
        break;
      }

      case 'refund.processed': {
        const refund = payload.refund.entity;
        console.log(`[WEBHOOK] Refund processed: ${refund.id}`);
        break;
      }

      default:
        console.log(`[WEBHOOK] Unhandled event: ${eventType}`);
    }

    // Always respond with 200 to acknowledge receipt
    res.json({ success: true, received: true });
  } catch (error) {
    console.error('[WEBHOOK] Error processing webhook:', error);
    // Still respond with 200 to prevent Razorpay from retrying on transient errors
    // For persistent errors, Razorpay will retry with exponential backoff
    res.json({ success: false, message: 'Webhook processing error' });
  }
});

export default router;
