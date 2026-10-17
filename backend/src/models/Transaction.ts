import { Schema, model, Document, Types } from 'mongoose';
import { SubscriptionPlan } from './Subscription';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'wallet' | 'other';

export interface ITransaction extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  amount: number; // Amount in paise
  currency: string;
  plan: SubscriptionPlan;
  status: TransactionStatus;
  paymentMethod?: PaymentMethod;
  email?: string;
  contact?: string;
  description?: string;
  errorCode?: string;
  errorDescription?: string;
  refundId?: string;
  refundAmount?: number;
  refundedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpaySignature: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    plan: {
      type: String,
      enum: ['free', 'plus', 'pro'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['upi', 'card', 'netbanking', 'wallet', 'other'],
    },
    email: {
      type: String,
    },
    contact: {
      type: String,
    },
    description: {
      type: String,
    },
    errorCode: {
      type: String,
    },
    errorDescription: {
      type: String,
    },
    refundId: {
      type: String,
    },
    refundAmount: {
      type: Number,
    },
    refundedAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ razorpayPaymentId: 1 });
transactionSchema.index({ status: 1, createdAt: -1 });

export const Transaction = model<ITransaction>(
  'Transaction',
  transactionSchema
);
