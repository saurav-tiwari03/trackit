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
  // AI API keys
  hasGeminiKey?: boolean;
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

export interface RepeatConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval?: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endDate?: string;
  occurrences?: number;
}

export type TaskProgress = 'not_started' | 'in_progress' | 'completed' | 'late';

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
  progress: TaskProgress;
  startDate?: string;
  dueDate?: string;
  repeat?: RepeatConfig;
  showNotesOnCard?: boolean;
  showChecklistOnCard?: boolean;
  labels: string[];
  attachments?: Attachment[];
  subtasks: Subtask[];
  subtaskCount?: number;
  subtaskCompletedCount?: number;
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

export interface InboxStatsSummary {
  total: number;
  tasksLeft: number;
  notStarted: number;
  inProgress: number;
  late: number;
  completed: number;
}

export interface InboxBucketStat {
  bucket: string;
  sectionId: string;
  total: number;
  notStarted: number;
  inProgress: number;
  late: number;
  completed: number;
}

export interface InboxPriorityStat {
  priority: string;
  label: string;
  total: number;
  notStarted: number;
  inProgress: number;
  late: number;
  completed: number;
}

export interface InboxMemberStat {
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  total: number;
}

export interface InboxStats {
  summary: InboxStatsSummary;
  buckets: InboxBucketStat[];
  priorities: InboxPriorityStat[];
  members: InboxMemberStat[];
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

// Movie Types
export type MovieStatus = 'watched' | 'watching' | 'watchlist';
export type MoviePlatform = 'netflix' | 'prime' | 'disney' | 'hbo' | 'apple' | 'theater' | 'bluray' | 'other';

export interface Movie {
  _id: string;
  user: string;
  tmdbId?: number;
  title: string;
  originalTitle?: string;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  releaseDate?: string;
  runtime?: number;
  genres?: string[];
  voteAverage?: number;
  status: MovieStatus;
  rating?: number;
  review?: string;
  watchedDate?: string;
  plannedDate?: string;
  platform?: MoviePlatform;
  rewatchCount: number;
  isFavorite: boolean;
  tags?: string[];
  notes?: string;
  lists?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MovieList {
  _id: string;
  user: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isPublic: boolean;
  order: number;
  movieCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MovieStats {
  total: number;
  watched: number;
  watching: number;
  watchlist: number;
  favorites: number;
  totalRuntime: number;
  avgRating: number | null;
  thisMonth: number;
  topGenres: { genre: string; count: number }[];
  platforms: { platform: string; count: number }[];
}

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime?: number;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  vote_average: number;
  vote_count: number;
  popularity: number;
}

export interface TMDBSearchResult {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

// List Types (multiple lists with listName; each list has items with name + description)
export interface ListItem {
  _id: string;
  name: string;
  description?: string;
  order: number;
  createdAt: string;
}

export interface List {
  _id: string;
  name: string;
  user: string;
  items: ListItem[];
  color?: string;
  icon?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}
