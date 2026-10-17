import { Schema, model, Document, Types } from 'mongoose';

export interface IAIUsage extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  date: string; // YYYY-MM-DD format for daily tracking
  mealAnalysisCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const aiUsageSchema = new Schema<IAIUsage>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    mealAnalysisCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: one record per user per day
aiUsageSchema.index({ user: 1, date: 1 }, { unique: true });

// Index for cleanup of old records
aiUsageSchema.index({ date: 1 });

// AI limits by subscription plan
export const AI_LIMITS = {
  free: {
    mealAnalysis: 2,
  },
  plus: {
    mealAnalysis: 5,
  },
  pro: {
    mealAnalysis: 10,
  },
} as const;

export type SubscriptionPlanForLimits = keyof typeof AI_LIMITS;

export const AIUsage = model<IAIUsage>('AIUsage', aiUsageSchema);

