import { Schema, model, Document, Types } from 'mongoose';

export type SubscriptionPlan = 'free' | 'plus' | 'pro';
export type SubscriptionStatus =
  | 'active'
  | 'authenticated'
  | 'pending'
  | 'halted'
  | 'cancelled'
  | 'paused'
  | 'expired'
  | 'completed';

export interface ISubscription extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  razorpaySubscriptionId?: string;
  razorpayCustomerId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelledAt?: Date;
  pausedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    plan: {
      type: String,
      enum: ['free', 'plus', 'pro'],
      default: 'free',
    },
    status: {
      type: String,
      enum: [
        'active',
        'authenticated',
        'pending',
        'halted',
        'cancelled',
        'paused',
        'expired',
        'completed',
      ],
      default: 'active',
    },
    razorpaySubscriptionId: {
      type: String,
      sparse: true,
    },
    razorpayCustomerId: {
      type: String,
      sparse: true,
    },
    currentPeriodStart: {
      type: Date,
    },
    currentPeriodEnd: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    pausedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for quick lookups
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ currentPeriodEnd: 1, status: 1 });

export const Subscription = model<ISubscription>(
  'Subscription',
  subscriptionSchema
);
