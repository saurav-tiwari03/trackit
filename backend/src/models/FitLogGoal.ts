import { Schema, model, Document, Types } from 'mongoose';

export type FitnessGoalType = 'lose_weight' | 'maintain' | 'gain_muscle' | 'gain_weight';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Gender = 'male' | 'female' | 'other';

export interface IFitLogGoal extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;

  // Personal info for calculations
  fitnessGoal: FitnessGoalType;
  activityLevel: ActivityLevel;
  gender?: Gender;
  age?: number;
  height?: number; // cm
  heightUnit: 'cm' | 'ft';
  currentWeight?: number;

  // Daily nutrition targets (calculated or manual)
  caloriesIntake: number;
  caloriesBurn: number;
  protein: number;
  carbs?: number;
  fat?: number;
  water?: number; // ml

  // Activity targets
  steps?: number;

  // Weight goal
  targetWeight?: number;
  startWeight?: number;
  weightUnit: 'kg' | 'lbs';

  // Workout frequency
  workoutsPerWeek?: number;

  // Whether targets are manually set or auto-calculated
  isCustomTargets: boolean;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const fitLogGoalSchema = new Schema<IFitLogGoal>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    // Personal info for calculations
    fitnessGoal: {
      type: String,
      enum: ['lose_weight', 'maintain', 'gain_muscle', 'gain_weight'],
      default: 'maintain',
    },
    activityLevel: {
      type: String,
      enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'],
      default: 'moderate',
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    age: {
      type: Number,
      min: 10,
      max: 120,
    },
    height: {
      type: Number,
      min: 0,
    },
    heightUnit: {
      type: String,
      enum: ['cm', 'ft'],
      default: 'cm',
    },
    currentWeight: {
      type: Number,
      min: 0,
    },
    // Nutrition targets
    caloriesIntake: {
      type: Number,
      default: 2000,
      min: 0,
    },
    caloriesBurn: {
      type: Number,
      default: 500,
      min: 0,
    },
    protein: {
      type: Number,
      default: 150,
      min: 0,
    },
    carbs: {
      type: Number,
      default: 200,
      min: 0,
    },
    fat: {
      type: Number,
      default: 65,
      min: 0,
    },
    water: {
      type: Number,
      default: 2000, // 2 liters in ml
      min: 0,
    },
    steps: {
      type: Number,
      default: 10000,
      min: 0,
    },
    targetWeight: {
      type: Number,
      min: 0,
    },
    startWeight: {
      type: Number,
      min: 0,
    },
    weightUnit: {
      type: String,
      enum: ['kg', 'lbs'],
      default: 'kg',
    },
    workoutsPerWeek: {
      type: Number,
      default: 4,
      min: 0,
      max: 7,
    },
    isCustomTargets: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const FitLogGoal = model<IFitLogGoal>('FitLogGoal', fitLogGoalSchema);

