import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IGoogleCalendarTokens {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  email?: string;
}

export type SubscriptionPlanType = 'free' | 'plus' | 'pro';

export type SubscriptionStatusType = 'active' | 'authenticated' | 'pending' | 'halted' | 'cancelled' | 'paused' | 'expired' | 'completed';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  avatar?: string;
  labels: string[];
  googleCalendar?: IGoogleCalendarTokens;
  // Subscription fields for quick access
  subscriptionPlan: SubscriptionPlanType;
  subscriptionStatus: SubscriptionStatusType;
  subscriptionExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    avatar: {
      type: String,
      default: '',
    },
    labels: {
      type: [String],
      default: [],
    },
    googleCalendar: {
      accessToken: { type: String },
      refreshToken: { type: String },
      expiryDate: { type: Number },
      email: { type: String },
    },
    subscriptionPlan: {
      type: String,
      enum: ['free', 'plus', 'pro'],
      default: 'free',
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'authenticated', 'pending', 'halted', 'cancelled', 'paused', 'expired', 'completed'],
      default: 'active',
    },
    subscriptionExpiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = model<IUser>('User', userSchema);
