export type SubscriptionPlan = 'free' | 'plus' | 'pro';
export type SubscriptionStatus = 'active' | 'authenticated' | 'pending' | 'halted' | 'cancelled' | 'paused' | 'expired' | 'completed';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  // Optional presence indicator (used by chat UI / socket presence)
  status?: 'online' | 'offline' | 'busy';
  labels?: string[];
  // Subscription fields
  subscriptionPlan?: SubscriptionPlan;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionExpiresAt?: string;
}

export interface SubscriptionPlanDetails {
  name: string;
  amount: number;
  displayAmount: string;
  currency: string;
  description: string;
  features: string[];
}

export interface Transaction {
  _id: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  amount: number;
  currency: string;
  plan: SubscriptionPlan;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  _id: string;
  name: string;
  order: number;
  color: string;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  owner: User;
  members: User[];
  sections: Section[];
  color: string;
  icon?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  tasks?: Task[];
}

export interface Subtask {
  _id: string;
  title: string;
  isCompleted: boolean;
  order: number;
  dueDate?: string;
  priority?: 'P1' | 'P2' | 'P3' | 'P4';
}

export interface Attachment {
  _id: string;
  name: string;
  url: string;
  storage?: 'local' | 's3';
  key?: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  project: Project | string;
  section: string;
  parentTask?: string | null;
  assignee?: User;
  creator: User;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  status: 'open' | 'in_progress' | 'completed' | 'overdue';
  dueDate?: string;
  labels: string[];
  attachments?: Attachment[];
  subtasks: Subtask[];
  order: number;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  comments?: Comment[];
}

export interface Comment {
  _id: string;
  content: string;
  task: string;
  author: User;
  attachments: string[];
  mentions?: User[];
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = 'project_invite' | 'mention';
export type InviteStatus = 'pending' | 'accepted' | 'rejected';

export interface Notification {
  _id: string;
  recipient: string;
  actor?: User;
  type: NotificationType;
  title: string;
  body?: string;
  project?: { _id: string; name: string; color: string } | string;
  task?: string;
  comment?: string;
  readAt?: string | null;
  inviteStatus?: InviteStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStats {
  open: number;
  overdue: number;
  inProgress: number;
  completed: number;
}

export interface HabitCompletion {
  date: string;
  completed: boolean;
}

export interface Habit {
  _id: string;
  user: string;
  name: string;
  color: string;
  icon?: string;
  completions: HabitCompletion[];
  currentStreak: number;
  longestStreak: number;
  isArchived: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface HabitStats {
  totalHabits: number;
  totalCompletions: number;
  longestStreak: number;
  activeStreaks: number;
}

// FitLog Types
export interface FitLogExercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  duration?: number;
  notes?: string;
}

export type WorkoutType =
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

export interface FitLogWorkout {
  _id?: string;
  type: WorkoutType;
  customName?: string;
  exercises: FitLogExercise[];
  duration: number;
  caloriesBurned?: number;
  notes?: string;
}

export type MealType =
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'snack'
  | 'pre_workout'
  | 'post_workout'
  | 'other';

export interface FitLogMeal {
  _id?: string;
  type: MealType;
  name?: string;
  description?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time?: string;
  imageKey?: string;
  imageUrl?: string; // Presigned S3 URL for displaying the image
}

export interface FitLogNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water?: number;
  meals?: FitLogMeal[];
}

export interface FitLogBodyMetrics {
  weight?: number;
  bodyFat?: number;
}

export type MoodType = 'great' | 'good' | 'okay' | 'tired' | 'poor';

export interface FitLogEntry {
  _id: string;
  user: string;
  date: string;
  nutrition?: FitLogNutrition;
  workout?: FitLogWorkout; // Legacy single workout
  workouts?: FitLogWorkout[]; // Multiple workouts
  bodyMetrics?: FitLogBodyMetrics;
  caloriesBurned?: number;
  steps?: number;
  notes?: string;
  mood?: MoodType;
  createdAt: string;
  updatedAt: string;
}

export type FitnessGoalType = 'lose_weight' | 'maintain' | 'gain_muscle' | 'gain_weight';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Gender = 'male' | 'female' | 'other';

export interface FitLogGoal {
  _id: string;
  user: string;
  // Personal info for calculations
  fitnessGoal: FitnessGoalType;
  activityLevel: ActivityLevel;
  gender?: Gender;
  age?: number;
  height?: number;
  heightUnit: 'cm' | 'ft';
  currentWeight?: number;
  // Nutrition targets
  caloriesIntake: number;
  caloriesBurn: number;
  protein: number;
  carbs?: number;
  fat?: number;
  water?: number;
  steps?: number;
  targetWeight?: number;
  startWeight?: number;
  weightUnit: 'kg' | 'lbs';
  workoutsPerWeek?: number;
  isCustomTargets: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FitLogWeeklyStats {
  totalCaloriesIn: number;
  totalCaloriesBurned: number;
  totalProtein: number;
  avgCaloriesIn: number;
  avgProtein: number;
  workoutsCompleted: number;
  avgWeight: number;
  latestWeight: number;
  entriesCount: number;
  daysLogged: number;
}

