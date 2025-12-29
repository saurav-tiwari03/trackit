import { Schema, model, Document, Types } from 'mongoose';

export interface IPushSubscription extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  deviceName?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const pushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
    },
    keys: {
      p256dh: {
        type: String,
        required: true,
      },
      auth: {
        type: String,
        required: true,
      },
    },
    userAgent: {
      type: String,
      default: '',
    },
    deviceName: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying by user
pushSubscriptionSchema.index({ user: 1, isActive: 1 });

export const PushSubscription = model<IPushSubscription>(
  'PushSubscription',
  pushSubscriptionSchema
);
