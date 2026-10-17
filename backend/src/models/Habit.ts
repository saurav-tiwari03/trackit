import { Schema, model, Document, Types } from 'mongoose';

export interface IHabitCompletion {
  date: string; // YYYY-MM-DD format
  completed: boolean;
}

export interface IHabit extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  name: string;
  color: string;
  icon?: string;
  completions: IHabitCompletion[];
  currentStreak: number;
  longestStreak: number;
  isArchived: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const habitSchema = new Schema<IHabit>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Habit name is required'],
      trim: true,
      maxlength: [100, 'Habit name cannot exceed 100 characters'],
    },
    color: {
      type: String,
      default: '#22c55e', // Green
    },
    icon: {
      type: String,
      default: 'target',
    },
    completions: [
      {
        date: { type: String, required: true },
        completed: { type: Boolean, default: false },
      },
    ],
    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
habitSchema.index({ user: 1, isArchived: 1, order: 1 });
habitSchema.index({ 'completions.date': 1 });

export const Habit = model<IHabit>('Habit', habitSchema);
