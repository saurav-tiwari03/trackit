import { Schema, model, Document, Types } from 'mongoose';

// Exercise entry within a workout
export interface IExercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number; // kg or lbs
  duration?: number; // minutes (for cardio)
  notes?: string;
}

// Workout session
export interface IWorkout {
  type:
  | 'push'
  | 'pull'
  | 'legs'
  | 'upper'
  | 'lower'
  | 'full_body'
  | 'cardio'
  | 'hiit'
  | 'rest'
  | 'custom';
  customName?: string;
  exercises: IExercise[];
  duration: number; // minutes
  caloriesBurned?: number;
  notes?: string;
}

// Meal entry
export interface IMeal {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout' | 'other';
  name?: string;
  description?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time?: string; // HH:MM format
  imageKey?: string; // S3 key for the meal image
}

// Nutrition tracking
export interface INutrition {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  water?: number; // ml
  meals?: IMeal[];
}

// Body measurements
export interface IBodyMetrics {
  weight?: number; // kg or lbs
  bodyFat?: number; // percentage
}

export interface IFitLogEntry extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  date: string; // YYYY-MM-DD format
  nutrition?: INutrition;
  workout?: IWorkout; // Legacy single workout (kept for backward compatibility)
  workouts?: IWorkout[]; // Multiple workouts per day
  bodyMetrics?: IBodyMetrics;
  caloriesBurned?: number; // Total for the day
  steps?: number;
  notes?: string;
  mood?: 'great' | 'good' | 'okay' | 'tired' | 'poor';
  createdAt: Date;
  updatedAt: Date;
}

const exerciseSchema = new Schema<IExercise>(
  {
    name: { type: String, required: true, trim: true },
    sets: { type: Number, required: true, min: 0 },
    reps: { type: Number, required: true, min: 0 },
    weight: { type: Number, min: 0 },
    duration: { type: Number, min: 0 },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const workoutSchema = new Schema<IWorkout>(
  {
    type: {
      type: String,
      enum: [
        'push',
        'pull',
        'legs',
        'upper',
        'lower',
        'full_body',
        'cardio',
        'hiit',
        'rest',
        'custom',
      ],
      required: true,
    },
    customName: { type: String, trim: true },
    exercises: [exerciseSchema],
    duration: { type: Number, required: true, min: 0 },
    caloriesBurned: { type: Number, min: 0 },
    notes: { type: String, trim: true },
  },
  { _id: true }
);

const mealSchema = new Schema<IMeal>(
  {
    type: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout', 'other'],
      required: true,
    },
    name: { type: String, trim: true },
    description: { type: String, trim: true, maxlength: 500 },
    calories: { type: Number, required: true, min: 0 },
    protein: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
    time: { type: String, match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ },
    imageKey: { type: String, trim: true },
  },
  { _id: true }
);

const nutritionSchema = new Schema<INutrition>(
  {
    calories: { type: Number, required: true, min: 0 },
    protein: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
    water: { type: Number, min: 0 },
    meals: [mealSchema],
  },
  { _id: false }
);

const bodyMetricsSchema = new Schema<IBodyMetrics>(
  {
    weight: { type: Number, min: 0 },
    bodyFat: { type: Number, min: 0, max: 100 },
  },
  { _id: false }
);

const fitLogEntrySchema = new Schema<IFitLogEntry>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    },
    nutrition: nutritionSchema,
    workout: workoutSchema, // Legacy single workout
    workouts: [workoutSchema], // Multiple workouts
    bodyMetrics: bodyMetricsSchema,
    caloriesBurned: { type: Number, min: 0 },
    steps: { type: Number, min: 0 },
    notes: { type: String, trim: true, maxlength: 1000 },
    mood: {
      type: String,
      enum: ['great', 'good', 'okay', 'tired', 'poor'],
    },
  },
  { timestamps: true }
);

// Compound index for user + date (one entry per day per user)
fitLogEntrySchema.index({ user: 1, date: 1 }, { unique: true });
// Index for date range queries
fitLogEntrySchema.index({ user: 1, date: -1 });

export const FitLogEntry = model<IFitLogEntry>('FitLogEntry', fitLogEntrySchema);

