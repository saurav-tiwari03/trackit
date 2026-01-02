'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell,
  Flame,
  Apple,
  Scale,
  Target,
  TrendingDown,
  TrendingUp,
  Plus,
  Droplets,
  Footprints,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  Utensils,
  Beef,
  Wheat,
  Droplet,
  Check,
  X,
  Settings,
  BarChart3,
  History,
  CalendarDays,
} from 'lucide-react';
import {
  FitLogEntry,
  FitLogGoal,
  FitLogWeeklyStats,
  FitLogExercise,
  WorkoutType,
  MealType,
  FitLogMeal,
  FitnessGoalType,
  ActivityLevel,
  Gender,
} from '@/types';
import { fitlogAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';

const WORKOUT_TYPES: { value: WorkoutType; label: string; emoji: string }[] = [
  { value: 'push', label: 'Push', emoji: '💪' },
  { value: 'pull', label: 'Pull', emoji: '🏋️' },
  { value: 'legs', label: 'Legs', emoji: '🦵' },
  { value: 'upper', label: 'Upper Body', emoji: '👆' },
  { value: 'lower', label: 'Lower Body', emoji: '👇' },
  { value: 'full_body', label: 'Full Body', emoji: '🏃' },
  { value: 'cardio', label: 'Cardio', emoji: '❤️' },
  { value: 'hiit', label: 'HIIT', emoji: '⚡' },
  { value: 'rest', label: 'Rest Day', emoji: '😴' },
  { value: 'custom', label: 'Custom', emoji: '✨' },
];

const MOOD_OPTIONS = [
  { value: 'great', label: 'Great', emoji: '🔥' },
  { value: 'good', label: 'Good', emoji: '😊' },
  { value: 'okay', label: 'Okay', emoji: '😐' },
  { value: 'tired', label: 'Tired', emoji: '😴' },
  { value: 'poor', label: 'Poor', emoji: '😞' },
];

const MEAL_TYPES: { value: MealType; label: string; emoji: string }[] = [
  { value: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { value: 'lunch', label: 'Lunch', emoji: '☀️' },
  { value: 'dinner', label: 'Dinner', emoji: '🌙' },
  { value: 'snack', label: 'Snack', emoji: '🍎' },
  { value: 'pre_workout', label: 'Pre-Workout', emoji: '⚡' },
  { value: 'post_workout', label: 'Post-Workout', emoji: '💪' },
  { value: 'other', label: 'Other', emoji: '🍽️' },
];

const FITNESS_GOALS: { value: FitnessGoalType; label: string; emoji: string; description: string }[] = [
  { value: 'lose_weight', label: 'Lose Weight', emoji: '🔥', description: 'Calorie deficit for fat loss' },
  { value: 'maintain', label: 'Maintain', emoji: '⚖️', description: 'Keep current weight' },
  { value: 'gain_muscle', label: 'Build Muscle', emoji: '💪', description: 'Lean gains with high protein' },
  { value: 'gain_weight', label: 'Gain Weight', emoji: '📈', description: 'Calorie surplus for mass' },
];

const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; multiplier: number }[] = [
  { value: 'sedentary', label: 'Sedentary (desk job)', multiplier: 1.2 },
  { value: 'light', label: 'Light (1-2 days/week)', multiplier: 1.375 },
  { value: 'moderate', label: 'Moderate (3-5 days/week)', multiplier: 1.55 },
  { value: 'active', label: 'Active (6-7 days/week)', multiplier: 1.725 },
  { value: 'very_active', label: 'Very Active (athlete)', multiplier: 1.9 },
];

// Calculate recommended macros based on goals
const calculateRecommendedMacros = (
  weight: number,
  height: number,
  age: number,
  gender: Gender,
  activityLevel: ActivityLevel,
  fitnessGoal: FitnessGoalType
) => {
  // BMR using Mifflin-St Jeor equation
  let bmr: number;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  // TDEE (Total Daily Energy Expenditure)
  const activityMultiplier = ACTIVITY_LEVELS.find(a => a.value === activityLevel)?.multiplier || 1.55;
  let tdee = bmr * activityMultiplier;

  // Adjust for goal
  let proteinMultiplier = 1.6; // g per kg
  switch (fitnessGoal) {
    case 'lose_weight':
      tdee *= 0.8; // 20% deficit
      proteinMultiplier = 2.0; // Higher protein to preserve muscle
      break;
    case 'gain_muscle':
      tdee *= 1.1; // 10% surplus
      proteinMultiplier = 2.2; // High protein for muscle growth
      break;
    case 'gain_weight':
      tdee *= 1.2; // 20% surplus
      proteinMultiplier = 1.8;
      break;
    default:
      // maintain
      break;
  }

  const calories = Math.round(tdee);
  const protein = Math.round(weight * proteinMultiplier);
  const fat = Math.round((calories * 0.25) / 9); // 25% of calories from fat
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4); // Remaining from carbs

  return { calories, protein, carbs, fat };
};

// Helper to get UTC date string in YYYY-MM-DD format
const getUTCDateString = (date: Date = new Date()): string => {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
};

const formatDisplayDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
};

// Circular progress component
const CircularProgress = ({
  value,
  max,
  size = 120,
  strokeWidth = 10,
  color,
  label,
  sublabel,
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label: string;
  sublabel?: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(value / max, 1);
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted/30"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-xs text-muted-foreground">/ {max}</span>
        <span className="text-[10px] font-medium text-muted-foreground mt-1">
          {label}
        </span>
        {sublabel && (
          <span className="text-[10px] text-muted-foreground">{sublabel}</span>
        )}
      </div>
    </div>
  );
};

// Macro progress bar component
const MacroBar = ({
  label,
  value,
  max,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  icon: React.ElementType;
}) => {
  const progress = Math.min((value / max) * 100, 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color }} />
          <span className="font-medium">{label}</span>
        </div>
        <span className="text-muted-foreground">
          {value}g / {max}g
        </span>
      </div>
      <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

export default function FitLogPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [entry, setEntry] = useState<FitLogEntry | null>(null);
  const [goals, setGoals] = useState<FitLogGoal | null>(null);
  const [stats, setStats] = useState<FitLogWeeklyStats | null>(null);
  const [weightHistory, setWeightHistory] = useState<{ date: string; weight: number }[]>([]);
  const [selectedDate, setSelectedDate] = useState(getUTCDateString());
  const [dayOffset, setDayOffset] = useState(0);

  // Dialog states
  const [showNutritionDialog, setShowNutritionDialog] = useState(false);
  const [showMealDialog, setShowMealDialog] = useState(false);
  const [showWorkoutDialog, setShowWorkoutDialog] = useState(false);
  const [showWeightDialog, setShowWeightDialog] = useState(false);
  const [showGoalsDialog, setShowGoalsDialog] = useState(false);

  // Form states
  const [nutritionForm, setNutritionForm] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    water: 0,
  });
  const [mealForm, setMealForm] = useState<{
    type: MealType;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    time: string;
  }>({
    type: 'breakfast',
    name: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    time: '',
  });
  const [workoutForm, setWorkoutForm] = useState<{
    type: WorkoutType;
    customName: string;
    duration: number;
    caloriesBurned: number;
    exercises: FitLogExercise[];
  }>({
    type: 'push',
    customName: '',
    duration: 60,
    caloriesBurned: 0,
    exercises: [],
  });
  const [newExercise, setNewExercise] = useState({
    name: '',
    sets: 3,
    reps: 10,
    weight: 0,
  });
  const [weightForm, setWeightForm] = useState({ weight: 0, bodyFat: 0, date: getUTCDateString() });
  const [goalsForm, setGoalsForm] = useState({
    fitnessGoal: 'maintain' as FitnessGoalType,
    activityLevel: 'moderate' as ActivityLevel,
    gender: 'male' as Gender,
    age: 25,
    height: 170,
    heightUnit: 'cm' as 'cm' | 'ft',
    currentWeight: 70,
    caloriesIntake: 2000,
    protein: 150,
    carbs: 200,
    fat: 65,
    water: 2000,
    targetWeight: 70,
    weightUnit: 'kg' as 'kg' | 'lbs',
    workoutsPerWeek: 4,
    isCustomTargets: false,
  });

  const [isSaving, setIsSaving] = useState(false);

  // Calculate selected date based on offset
  useEffect(() => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - dayOffset);
    setSelectedDate(getUTCDateString(date));
  }, [dayOffset]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [entryRes, goalsRes, statsRes, weightRes] = await Promise.all([
        fitlogAPI.getEntry(selectedDate),
        fitlogAPI.getGoals(),
        fitlogAPI.getWeeklyStats(),
        fitlogAPI.getWeightProgress(30),
      ]);

      setEntry(entryRes.data.data);
      setGoals(goalsRes.data.data);
      setStats(statsRes.data.data);
      setWeightHistory(weightRes.data.data || []);

      // Initialize forms with existing data
      if (entryRes.data.data?.nutrition) {
        setNutritionForm({
          calories: entryRes.data.data.nutrition.calories || 0,
          protein: entryRes.data.data.nutrition.protein || 0,
          carbs: entryRes.data.data.nutrition.carbs || 0,
          fat: entryRes.data.data.nutrition.fat || 0,
          water: entryRes.data.data.nutrition.water || 0,
        });
      } else {
        setNutritionForm({ calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 });
      }

      if (entryRes.data.data?.workout) {
        setWorkoutForm({
          type: entryRes.data.data.workout.type,
          customName: entryRes.data.data.workout.customName || '',
          duration: entryRes.data.data.workout.duration || 60,
          caloriesBurned: entryRes.data.data.workout.caloriesBurned || 0,
          exercises: entryRes.data.data.workout.exercises || [],
        });
      } else {
        setWorkoutForm({
          type: 'push',
          customName: '',
          duration: 60,
          caloriesBurned: 0,
          exercises: [],
        });
      }

      if (entryRes.data.data?.bodyMetrics) {
        setWeightForm({
          weight: entryRes.data.data.bodyMetrics.weight || 0,
          bodyFat: entryRes.data.data.bodyMetrics.bodyFat || 0,
          date: selectedDate,
        });
      } else {
        setWeightForm({ weight: 0, bodyFat: 0, date: selectedDate });
      }

      if (goalsRes.data.data) {
        setGoalsForm({
          fitnessGoal: goalsRes.data.data.fitnessGoal || 'maintain',
          activityLevel: goalsRes.data.data.activityLevel || 'moderate',
          gender: goalsRes.data.data.gender || 'male',
          age: goalsRes.data.data.age || 25,
          height: goalsRes.data.data.height || 170,
          heightUnit: goalsRes.data.data.heightUnit || 'cm',
          currentWeight: goalsRes.data.data.currentWeight || 70,
          caloriesIntake: goalsRes.data.data.caloriesIntake || 2000,
          protein: goalsRes.data.data.protein || 150,
          carbs: goalsRes.data.data.carbs || 200,
          fat: goalsRes.data.data.fat || 65,
          water: goalsRes.data.data.water || 2000,
          targetWeight: goalsRes.data.data.targetWeight || 70,
          weightUnit: goalsRes.data.data.weightUnit || 'kg',
          workoutsPerWeek: goalsRes.data.data.workoutsPerWeek || 4,
          isCustomTargets: goalsRes.data.data.isCustomTargets || false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch fitlog data:', error);
      toast.error('Failed to load fitness data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveNutrition = async () => {
    try {
      setIsSaving(true);
      await fitlogAPI.saveEntry({
        date: selectedDate,
        nutrition: nutritionForm,
      });
      toast.success('Nutrition logged!');
      setShowNutritionDialog(false);
      fetchData();
    } catch (error) {
      console.error('Failed to save nutrition:', error);
      toast.error('Failed to save nutrition');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMeal = async () => {
    try {
      setIsSaving(true);
      await fitlogAPI.addMeal(selectedDate, {
        type: mealForm.type,
        name: mealForm.name || undefined,
        calories: mealForm.calories,
        protein: mealForm.protein,
        carbs: mealForm.carbs,
        fat: mealForm.fat,
        time: mealForm.time || undefined,
      });
      const mealLabel = MEAL_TYPES.find(m => m.value === mealForm.type)?.label || 'Meal';
      toast.success(`${mealLabel} added!`);
      setShowMealDialog(false);
      setMealForm({
        type: 'breakfast',
        name: '',
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        time: '',
      });
      fetchData();
    } catch (error) {
      console.error('Failed to add meal:', error);
      toast.error('Failed to add meal');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    try {
      await fitlogAPI.deleteMeal(selectedDate, mealId);
      toast.success('Meal deleted');
      fetchData();
    } catch (error) {
      console.error('Failed to delete meal:', error);
      toast.error('Failed to delete meal');
    }
  };

  const handleAddExercise = () => {
    if (!newExercise.name.trim()) return;
    setWorkoutForm((prev) => ({
      ...prev,
      exercises: [...prev.exercises, { ...newExercise }],
    }));
    setNewExercise({ name: '', sets: 3, reps: 10, weight: 0 });
  };

  const handleRemoveExercise = (index: number) => {
    setWorkoutForm((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index),
    }));
  };

  const handleSaveWorkout = async () => {
    try {
      setIsSaving(true);
      await fitlogAPI.addWorkout(selectedDate, {
        type: workoutForm.type,
        customName: workoutForm.customName || undefined,
        exercises: workoutForm.exercises,
        duration: workoutForm.duration,
        caloriesBurned: workoutForm.caloriesBurned || undefined,
      });
      const workoutLabel = WORKOUT_TYPES.find(w => w.value === workoutForm.type)?.label || 'Workout';
      toast.success(`${workoutLabel} added!`);
      setShowWorkoutDialog(false);
      // Reset form for next workout
      setWorkoutForm({
        type: 'push',
        customName: '',
        duration: 60,
        caloriesBurned: 0,
        exercises: [],
      });
      fetchData();
    } catch (error) {
      console.error('Failed to save workout:', error);
      toast.error('Failed to save workout');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    try {
      await fitlogAPI.deleteWorkout(selectedDate, workoutId);
      toast.success('Workout deleted');
      fetchData();
    } catch (error) {
      console.error('Failed to delete workout:', error);
      toast.error('Failed to delete workout');
    }
  };

  const handleSaveWeight = async () => {
    try {
      setIsSaving(true);
      await fitlogAPI.saveEntry({
        date: weightForm.date,
        bodyMetrics: {
          weight: weightForm.weight || undefined,
          bodyFat: weightForm.bodyFat || undefined,
        },
      });
      const formattedDate = new Date(weightForm.date + 'T00:00:00Z').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      toast.success(`Weight logged for ${formattedDate}!`);
      setShowWeightDialog(false);
      fetchData();
    } catch (error) {
      console.error('Failed to save weight:', error);
      toast.error('Failed to save weight');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGoals = async () => {
    try {
      setIsSaving(true);
      await fitlogAPI.updateGoals(goalsForm);
      toast.success('Goals updated!');
      setShowGoalsDialog(false);
      fetchData();
    } catch (error) {
      console.error('Failed to save goals:', error);
      toast.error('Failed to save goals');
    } finally {
      setIsSaving(false);
    }
  };

  const isToday = dayOffset === 0;
  const nutrition = entry?.nutrition;
  const workouts = entry?.workouts || [];
  const bodyMetrics = entry?.bodyMetrics;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Dumbbell className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">FitLog</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Track your fitness journey
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowGoalsDialog(true)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Goals</span>
          </Button>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDayOffset((p) => p + 1)}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center min-w-[180px]">
            <p className="font-semibold">
              {isToday ? 'Today' : formatDisplayDate(selectedDate)}
            </p>
            {!isToday && (
              <p className="text-xs text-muted-foreground">{selectedDate}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDayOffset((p) => Math.max(0, p - 1))}
            disabled={isToday}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDayOffset(0)}
              className="text-xs"
            >
              Today
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Calories Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-amber-500" />
                    <span className="font-semibold">Calories</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNutritionDialog(true)}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex justify-center">
                  <CircularProgress
                    value={nutrition?.calories || 0}
                    max={goals?.caloriesIntake || 2000}
                    color="#f59e0b"
                    label="kcal"
                  />
                </div>
                {entry?.caloriesBurned && (
                  <div className="mt-3 text-center text-sm text-muted-foreground">
                    🔥 Burned: {entry.caloriesBurned} kcal
                  </div>
                )}
              </motion.div>

              {/* Protein Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-red-500/10 to-rose-500/5 border border-red-500/20 rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Beef className="h-5 w-5 text-red-500" />
                    <span className="font-semibold">Protein</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(
                      ((nutrition?.protein || 0) / (goals?.protein || 150)) *
                        100
                    )}
                    %
                  </Badge>
                </div>
                <div className="flex justify-center">
                  <CircularProgress
                    value={nutrition?.protein || 0}
                    max={goals?.protein || 150}
                    color="#ef4444"
                    label="grams"
                  />
                </div>
              </motion.div>

              {/* Weight Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/20 rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-cyan-500" />
                    <span className="font-semibold">Weight</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setWeightForm(prev => ({ ...prev, date: getUTCDateString() }));
                      setShowWeightDialog(true);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-center py-4">
                  {bodyMetrics?.weight ? (
                    <>
                      <p className="text-4xl font-bold text-cyan-600">
                        {bodyMetrics.weight}
                      </p>
                      <p className="text-muted-foreground">
                        {goals?.weightUnit || 'kg'}
                      </p>
                      {goals?.targetWeight && (
                        <div className="mt-2 flex items-center justify-center gap-1 text-sm">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Target: {goals.targetWeight} {goals.weightUnit}
                          </span>
                        </div>
                      )}
                      {stats?.latestWeight &&
                        stats.latestWeight !== bodyMetrics.weight && (
                          <div className="mt-1 flex items-center justify-center gap-1 text-sm">
                            {bodyMetrics.weight < stats.latestWeight ? (
                              <>
                                <TrendingDown className="h-4 w-4 text-emerald-500" />
                                <span className="text-emerald-500">
                                  -
                                  {(
                                    stats.latestWeight - bodyMetrics.weight
                                  ).toFixed(1)}
                                </span>
                              </>
                            ) : (
                              <>
                                <TrendingUp className="h-4 w-4 text-rose-500" />
                                <span className="text-rose-500">
                                  +
                                  {(
                                    bodyMetrics.weight - stats.latestWeight
                                  ).toFixed(1)}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                    </>
                  ) : (
                    <div className="text-muted-foreground">
                      <Scale className="h-10 w-10 mx-auto opacity-30 mb-2" />
                      <p className="text-sm">No weight logged</p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => {
                          setWeightForm(prev => ({ ...prev, date: getUTCDateString() }));
                          setShowWeightDialog(true);
                        }}
                        className="mt-1"
                      >
                        Log weight
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Macros & Meals Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card border rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Utensils className="h-5 w-5 text-purple-500" />
                  Nutrition
                </h3>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowMealDialog(true)}
                  className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <Plus className="h-4 w-4" />
                  Add Meal
                </Button>
              </div>

              {/* Meals List */}
              {nutrition?.meals && nutrition.meals.length > 0 && (
                <div className="mb-4 space-y-2">
                  {nutrition.meals.map((meal, idx) => {
                    const mealInfo = MEAL_TYPES.find(m => m.value === meal.type);
                    return (
                      <div
                        key={meal._id || idx}
                        className="flex items-center justify-between py-2.5 px-3 bg-muted/30 rounded-lg group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{mealInfo?.emoji || '🍽️'}</span>
                          <div>
                            <p className="font-medium text-sm">
                              {meal.name || mealInfo?.label || 'Meal'}
                            </p>
                            {meal.time && (
                              <p className="text-xs text-muted-foreground">{meal.time}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right text-xs">
                            <p className="font-medium">{meal.calories} kcal</p>
                            <p className="text-muted-foreground">
                              P:{meal.protein}g C:{meal.carbs}g F:{meal.fat}g
                            </p>
                          </div>
                          {meal._id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                              onClick={() => handleDeleteMeal(meal._id!)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* No meals message */}
              {(!nutrition?.meals || nutrition.meals.length === 0) && (
                <div className="text-center py-4 mb-4 bg-muted/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">No meals logged yet</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setShowMealDialog(true)}
                    className="mt-1"
                  >
                    Add your first meal
                  </Button>
                </div>
              )}

              {/* Macro Progress Bars */}
              <div className="space-y-4">
                <MacroBar
                  label="Protein"
                  value={nutrition?.protein || 0}
                  max={goals?.protein || 150}
                  color="#ef4444"
                  icon={Beef}
                />
                <MacroBar
                  label="Carbs"
                  value={nutrition?.carbs || 0}
                  max={goals?.carbs || 200}
                  color="#3b82f6"
                  icon={Wheat}
                />
                <MacroBar
                  label="Fat"
                  value={nutrition?.fat || 0}
                  max={goals?.fat || 65}
                  color="#a855f7"
                  icon={Droplet}
                />
              </div>
              {/* Water */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Water</span>
                  </div>
                  <span className="text-muted-foreground">
                    {nutrition?.water || 0}ml / {goals?.water || 2000}ml
                  </span>
                </div>
                <div className="mt-2 flex gap-1">
                  {Array.from({ length: 8 }).map((_, i) => {
                    const waterPerGlass = (goals?.water || 2000) / 8;
                    const filled = (nutrition?.water || 0) >= waterPerGlass * (i + 1);
                    return (
                      <div
                        key={i}
                        className={cn(
                          'h-8 flex-1 rounded-md transition-colors',
                          filled ? 'bg-blue-500' : 'bg-muted/50'
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            </motion.div>

            {/* Workout Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card border rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-emerald-500" />
                  Today&apos;s Workouts
                  {workouts.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {workouts.length}
                    </Badge>
                  )}
                </h3>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setWorkoutForm({
                      type: 'push',
                      customName: '',
                      duration: 60,
                      caloriesBurned: 0,
                      exercises: [],
                    });
                    setShowWorkoutDialog(true);
                  }}
                  className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                >
                  <Plus className="h-4 w-4" />
                  Add Workout
                </Button>
              </div>

              {workouts.length > 0 ? (
                <div className="space-y-4">
                  {workouts.map((workout, idx) => {
                    const workoutInfo = WORKOUT_TYPES.find((w) => w.value === workout.type);
                    return (
                      <div
                        key={workout._id || idx}
                        className="border rounded-xl p-4 bg-muted/20 group"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-xl">
                              {workoutInfo?.emoji || '💪'}
                            </div>
                            <div>
                              <p className="font-semibold">
                                {workout.customName || workoutInfo?.label}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {workout.duration} min
                                {workout.caloriesBurned && ` • ${workout.caloriesBurned} kcal`}
                              </p>
                            </div>
                          </div>
                          {workout._id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                              onClick={() => handleDeleteWorkout(workout._id!)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {workout.exercises && workout.exercises.length > 0 && (
                          <div className="space-y-1.5 mt-2">
                            {workout.exercises.map((exercise, exIdx) => (
                              <div
                                key={exIdx}
                                className="flex items-center justify-between py-1.5 px-2 bg-background/50 rounded-md text-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <Check className="h-3 w-3 text-emerald-500" />
                                  <span>{exercise.name}</span>
                                </div>
                                <span className="text-muted-foreground">
                                  {exercise.sets}×{exercise.reps}
                                  {exercise.weight ? ` @ ${exercise.weight}kg` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Total Summary */}
                  {workouts.length > 1 && (
                    <div className="flex items-center justify-between pt-3 border-t text-sm">
                      <span className="text-muted-foreground">Total</span>
                      <div className="flex items-center gap-4">
                        <span>
                          {workouts.reduce((sum, w) => sum + w.duration, 0)} min
                        </span>
                        <span className="text-amber-500 font-medium">
                          🔥 {workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0)} kcal
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Dumbbell className="h-12 w-12 mx-auto opacity-30 mb-3" />
                  <p>No workouts logged yet</p>
                  <Button
                    variant="link"
                    onClick={() => setShowWorkoutDialog(true)}
                    className="mt-2"
                  >
                    Log your first workout
                  </Button>
                </div>
              )}
            </motion.div>

            {/* Weekly Stats */}
            {stats && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/20 rounded-2xl p-6"
              >
                <h3 className="font-semibold flex items-center gap-2 mb-4">
                  <BarChart3 className="h-5 w-5 text-violet-500" />
                  This Week
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-violet-600">
                      {stats.workoutsCompleted}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Workouts / {goals?.workoutsPerWeek || 4}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-600">
                      {stats.avgCaloriesIn}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Calories</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {stats.avgProtein}g
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Protein</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-600">
                      {stats.daysLogged}
                    </p>
                    <p className="text-xs text-muted-foreground">Days Logged</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Weight History Section */}
            {weightHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-card border rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <History className="h-5 w-5 text-cyan-500" />
                    Weight History
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    Last 30 days
                  </Badge>
                </div>

                {/* Weight Chart */}
                <div className="mb-4">
                  <div className="relative h-32 flex items-end gap-1">
                    {(() => {
                      const weights = weightHistory.map(w => w.weight);
                      const minWeight = Math.min(...weights);
                      const maxWeight = Math.max(...weights);
                      const range = maxWeight - minWeight || 1;
                      
                      return weightHistory.map((entry, idx) => {
                        const height = ((entry.weight - minWeight) / range) * 80 + 20;
                        const isLatest = idx === weightHistory.length - 1;
                        const [, month, day] = entry.date.split('-');
                        
                        return (
                          <div
                            key={entry.date}
                            className="flex-1 flex flex-col items-center gap-1"
                          >
                            <motion.div
                              className={cn(
                                'w-full rounded-t-sm transition-colors',
                                isLatest
                                  ? 'bg-cyan-500'
                                  : 'bg-cyan-500/40 hover:bg-cyan-500/60'
                              )}
                              style={{ height: `${height}%` }}
                              initial={{ height: 0 }}
                              animate={{ height: `${height}%` }}
                              transition={{ delay: idx * 0.05, duration: 0.3 }}
                              title={`${entry.date}: ${entry.weight} ${goals?.weightUnit || 'kg'}`}
                            />
                            {(idx === 0 || idx === weightHistory.length - 1 || idx % Math.ceil(weightHistory.length / 5) === 0) && (
                              <span className="text-[9px] text-muted-foreground">
                                {day}/{month}
                              </span>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                  {/* Y-axis labels */}
                  <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                    <span>
                      {Math.min(...weightHistory.map(w => w.weight)).toFixed(1)} {goals?.weightUnit || 'kg'}
                    </span>
                    <span>
                      {Math.max(...weightHistory.map(w => w.weight)).toFixed(1)} {goals?.weightUnit || 'kg'}
                    </span>
                  </div>
                </div>

                {/* Weight Entries List */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {[...weightHistory].reverse().map((entry, idx, arr) => {
                    const prevWeight = arr[idx + 1]?.weight;
                    const diff = prevWeight ? entry.weight - prevWeight : 0;
                    const [year, month, day] = entry.date.split('-').map(Number);
                    const dateObj = new Date(Date.UTC(year, month - 1, day));
                    const isToday = entry.date === getUTCDateString();
                    
                    return (
                      <div
                        key={entry.date}
                        className={cn(
                          'flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors',
                          isToday
                            ? 'bg-cyan-500/10 border border-cyan-500/30'
                            : 'bg-muted/30 hover:bg-muted/50'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold',
                            isToday ? 'bg-cyan-500 text-white' : 'bg-muted'
                          )}>
                            {day}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {dateObj.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                              {isToday && (
                                <span className="ml-2 text-xs text-cyan-500 font-normal">
                                  Today
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {diff !== 0 && (
                            <div className={cn(
                              'flex items-center gap-0.5 text-xs font-medium',
                              diff < 0 ? 'text-emerald-500' : 'text-rose-500'
                            )}>
                              {diff < 0 ? (
                                <TrendingDown className="h-3 w-3" />
                              ) : (
                                <TrendingUp className="h-3 w-3" />
                              )}
                              {Math.abs(diff).toFixed(1)}
                            </div>
                          )}
                          <p className="text-lg font-bold">
                            {entry.weight}
                            <span className="text-xs font-normal text-muted-foreground ml-1">
                              {goals?.weightUnit || 'kg'}
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary */}
                {weightHistory.length >= 2 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">First</p>
                        <p className="font-bold">
                          {weightHistory[0].weight} {goals?.weightUnit || 'kg'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Latest</p>
                        <p className="font-bold">
                          {weightHistory[weightHistory.length - 1].weight} {goals?.weightUnit || 'kg'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Change</p>
                        {(() => {
                          const change = weightHistory[weightHistory.length - 1].weight - weightHistory[0].weight;
                          return (
                            <p className={cn(
                              'font-bold flex items-center justify-center gap-1',
                              change < 0 ? 'text-emerald-500' : change > 0 ? 'text-rose-500' : ''
                            )}>
                              {change < 0 ? (
                                <TrendingDown className="h-4 w-4" />
                              ) : change > 0 ? (
                                <TrendingUp className="h-4 w-4" />
                              ) : null}
                              {change > 0 ? '+' : ''}{change.toFixed(1)} {goals?.weightUnit || 'kg'}
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Nutrition Dialog */}
      <Dialog open={showNutritionDialog} onOpenChange={setShowNutritionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Apple className="h-5 w-5 text-green-500" />
              Log Nutrition
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Calories (kcal)
              </label>
              <Input
                type="number"
                value={nutritionForm.calories || ''}
                onChange={(e) =>
                  setNutritionForm((p) => ({
                    ...p,
                    calories: parseInt(e.target.value) || 0,
                  }))
                }
                placeholder="e.g., 2000"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Protein (g)
                </label>
                <Input
                  type="number"
                  value={nutritionForm.protein || ''}
                  onChange={(e) =>
                    setNutritionForm((p) => ({
                      ...p,
                      protein: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder="150"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Carbs (g)
                </label>
                <Input
                  type="number"
                  value={nutritionForm.carbs || ''}
                  onChange={(e) =>
                    setNutritionForm((p) => ({
                      ...p,
                      carbs: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder="200"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Fat (g)</label>
                <Input
                  type="number"
                  value={nutritionForm.fat || ''}
                  onChange={(e) =>
                    setNutritionForm((p) => ({
                      ...p,
                      fat: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder="65"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Water (ml)</label>
              <Input
                type="number"
                value={nutritionForm.water || ''}
                onChange={(e) =>
                  setNutritionForm((p) => ({
                    ...p,
                    water: parseInt(e.target.value) || 0,
                  }))
                }
                placeholder="2000"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowNutritionDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveNutrition}
              disabled={isSaving}
              className="bg-gradient-to-r from-emerald-500 to-teal-500"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Meal Dialog */}
      <Dialog open={showMealDialog} onOpenChange={setShowMealDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-purple-500" />
              Add Meal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Meal Type</label>
              <Select
                value={mealForm.type}
                onValueChange={(v) => setMealForm((p) => ({ ...p, type: v as MealType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.emoji} {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Meal Name (optional)
                </label>
                <Input
                  value={mealForm.name}
                  onChange={(e) => setMealForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Oatmeal with fruits"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Time (optional)
                </label>
                <Input
                  type="time"
                  value={mealForm.time}
                  onChange={(e) => setMealForm((p) => ({ ...p, time: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Calories</label>
              <Input
                type="number"
                value={mealForm.calories || ''}
                onChange={(e) =>
                  setMealForm((p) => ({ ...p, calories: parseInt(e.target.value) || 0 }))
                }
                placeholder="e.g., 500"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Protein (g)</label>
                <Input
                  type="number"
                  value={mealForm.protein || ''}
                  onChange={(e) =>
                    setMealForm((p) => ({ ...p, protein: parseInt(e.target.value) || 0 }))
                  }
                  placeholder="30"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Carbs (g)</label>
                <Input
                  type="number"
                  value={mealForm.carbs || ''}
                  onChange={(e) =>
                    setMealForm((p) => ({ ...p, carbs: parseInt(e.target.value) || 0 }))
                  }
                  placeholder="50"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Fat (g)</label>
                <Input
                  type="number"
                  value={mealForm.fat || ''}
                  onChange={(e) =>
                    setMealForm((p) => ({ ...p, fat: parseInt(e.target.value) || 0 }))
                  }
                  placeholder="15"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowMealDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddMeal}
              disabled={isSaving || !mealForm.calories}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Meal'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Workout Dialog */}
      <Dialog open={showWorkoutDialog} onOpenChange={setShowWorkoutDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-emerald-500" />
              Add Workout
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Workout Type
              </label>
              <Select
                value={workoutForm.type}
                onValueChange={(v) =>
                  setWorkoutForm((p) => ({ ...p, type: v as WorkoutType }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKOUT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.emoji} {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {workoutForm.type === 'custom' && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Custom Name
                </label>
                <Input
                  value={workoutForm.customName}
                  onChange={(e) =>
                    setWorkoutForm((p) => ({ ...p, customName: e.target.value }))
                  }
                  placeholder="e.g., Morning Yoga"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Duration (min)
                </label>
                <Input
                  type="number"
                  value={workoutForm.duration || ''}
                  onChange={(e) =>
                    setWorkoutForm((p) => ({
                      ...p,
                      duration: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder="60"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Calories Burned
                </label>
                <Input
                  type="number"
                  value={workoutForm.caloriesBurned || ''}
                  onChange={(e) =>
                    setWorkoutForm((p) => ({
                      ...p,
                      caloriesBurned: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder="300"
                />
              </div>
            </div>

            {/* Exercises */}
            <div>
              <label className="text-sm font-medium mb-2 block">Exercises</label>
              {workoutForm.exercises.length > 0 && (
                <div className="space-y-2 mb-3">
                  {workoutForm.exercises.map((ex, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg"
                    >
                      <span className="font-medium">{ex.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {ex.sets}×{ex.reps}
                          {ex.weight ? ` @ ${ex.weight}kg` : ''}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleRemoveExercise(idx)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-12 gap-2">
                <Input
                  className="col-span-5"
                  placeholder="Exercise name"
                  value={newExercise.name}
                  onChange={(e) =>
                    setNewExercise((p) => ({ ...p, name: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === 'Enter' && handleAddExercise()}
                />
                <Input
                  className="col-span-2"
                  type="number"
                  placeholder="Sets"
                  value={newExercise.sets || ''}
                  onChange={(e) =>
                    setNewExercise((p) => ({
                      ...p,
                      sets: parseInt(e.target.value) || 0,
                    }))
                  }
                />
                <Input
                  className="col-span-2"
                  type="number"
                  placeholder="Reps"
                  value={newExercise.reps || ''}
                  onChange={(e) =>
                    setNewExercise((p) => ({
                      ...p,
                      reps: parseInt(e.target.value) || 0,
                    }))
                  }
                />
                <Input
                  className="col-span-2"
                  type="number"
                  placeholder="kg"
                  value={newExercise.weight || ''}
                  onChange={(e) =>
                    setNewExercise((p) => ({
                      ...p,
                      weight: parseInt(e.target.value) || 0,
                    }))
                  }
                />
                <Button
                  size="icon"
                  variant="secondary"
                  className="col-span-1"
                  onClick={handleAddExercise}
                  disabled={!newExercise.name.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowWorkoutDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveWorkout}
              disabled={isSaving}
              className="bg-gradient-to-r from-emerald-500 to-teal-500"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Weight Dialog */}
      <Dialog open={showWeightDialog} onOpenChange={setShowWeightDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-cyan-500" />
              Log Weight
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                Date
              </label>
              <Input
                type="date"
                value={weightForm.date}
                max={getUTCDateString()}
                onChange={(e) =>
                  setWeightForm((p) => ({
                    ...p,
                    date: e.target.value,
                  }))
                }
                className="block w-full"
              />
              {weightForm.date !== getUTCDateString() && (
                <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                  <History className="h-3 w-3" />
                  Logging for a past date
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Weight ({goals?.weightUnit || 'kg'})
              </label>
              <Input
                type="number"
                step="0.1"
                value={weightForm.weight || ''}
                onChange={(e) =>
                  setWeightForm((p) => ({
                    ...p,
                    weight: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="70.5"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Body Fat % (optional)
              </label>
              <Input
                type="number"
                step="0.1"
                value={weightForm.bodyFat || ''}
                onChange={(e) =>
                  setWeightForm((p) => ({
                    ...p,
                    bodyFat: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="15"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowWeightDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveWeight}
              disabled={isSaving || !weightForm.weight}
              className="bg-gradient-to-r from-cyan-500 to-blue-500"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Goals Dialog */}
      <Dialog open={showGoalsDialog} onOpenChange={setShowGoalsDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-500" />
              Personalized Fitness Goals
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            {/* Fitness Goal Selection */}
            <div>
              <label className="text-sm font-medium mb-3 block">
                What&apos;s your fitness goal?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {FITNESS_GOALS.map((goal) => (
                  <button
                    key={goal.value}
                    onClick={() => setGoalsForm((p) => ({ ...p, fitnessGoal: goal.value }))}
                    className={cn(
                      'p-3 rounded-lg border-2 text-left transition-all',
                      goalsForm.fitnessGoal === goal.value
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-border hover:border-muted-foreground/50'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{goal.emoji}</span>
                      <span className="font-medium text-sm">{goal.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{goal.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Personal Info */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Gender</label>
                <Select
                  value={goalsForm.gender}
                  onValueChange={(v) => setGoalsForm((p) => ({ ...p, gender: v as Gender }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Age</label>
                <Input
                  type="number"
                  value={goalsForm.age || ''}
                  onChange={(e) => setGoalsForm((p) => ({ ...p, age: parseInt(e.target.value) || 0 }))}
                  placeholder="25"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Height (cm)</label>
                <Input
                  type="number"
                  value={goalsForm.height || ''}
                  onChange={(e) => setGoalsForm((p) => ({ ...p, height: parseInt(e.target.value) || 0 }))}
                  placeholder="170"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Current Weight</label>
                <Input
                  type="number"
                  step="0.1"
                  value={goalsForm.currentWeight || ''}
                  onChange={(e) => setGoalsForm((p) => ({ ...p, currentWeight: parseFloat(e.target.value) || 0 }))}
                  placeholder="70"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Target Weight</label>
                <Input
                  type="number"
                  step="0.1"
                  value={goalsForm.targetWeight || ''}
                  onChange={(e) => setGoalsForm((p) => ({ ...p, targetWeight: parseFloat(e.target.value) || 0 }))}
                  placeholder="65"
                />
              </div>
            </div>

            {/* Activity Level */}
            <div>
              <label className="text-sm font-medium mb-2 block">Activity Level</label>
              <Select
                value={goalsForm.activityLevel}
                onValueChange={(v) => setGoalsForm((p) => ({ ...p, activityLevel: v as ActivityLevel }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Calculate Button */}
            {goalsForm.currentWeight > 0 && goalsForm.height > 0 && goalsForm.age > 0 && (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  const recommended = calculateRecommendedMacros(
                    goalsForm.currentWeight,
                    goalsForm.height,
                    goalsForm.age,
                    goalsForm.gender,
                    goalsForm.activityLevel,
                    goalsForm.fitnessGoal
                  );
                  setGoalsForm((p) => ({
                    ...p,
                    caloriesIntake: recommended.calories,
                    protein: recommended.protein,
                    carbs: recommended.carbs,
                    fat: recommended.fat,
                    isCustomTargets: false,
                  }));
                  toast.success('Macros calculated based on your profile!');
                }}
              >
                <Sparkles className="h-4 w-4" />
                Calculate Recommended Macros
              </Button>
            )}

            {/* Macro Targets */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">Daily Targets</label>
                <Badge variant={goalsForm.isCustomTargets ? 'default' : 'secondary'} className="text-xs">
                  {goalsForm.isCustomTargets ? 'Custom' : 'Calculated'}
                </Badge>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Calories</label>
                  <Input
                    type="number"
                    value={goalsForm.caloriesIntake || ''}
                    onChange={(e) => setGoalsForm((p) => ({
                      ...p,
                      caloriesIntake: parseInt(e.target.value) || 0,
                      isCustomTargets: true,
                    }))}
                    className="text-center"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Protein</label>
                  <Input
                    type="number"
                    value={goalsForm.protein || ''}
                    onChange={(e) => setGoalsForm((p) => ({
                      ...p,
                      protein: parseInt(e.target.value) || 0,
                      isCustomTargets: true,
                    }))}
                    className="text-center"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Carbs</label>
                  <Input
                    type="number"
                    value={goalsForm.carbs || ''}
                    onChange={(e) => setGoalsForm((p) => ({
                      ...p,
                      carbs: parseInt(e.target.value) || 0,
                      isCustomTargets: true,
                    }))}
                    className="text-center"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Fat</label>
                  <Input
                    type="number"
                    value={goalsForm.fat || ''}
                    onChange={(e) => setGoalsForm((p) => ({
                      ...p,
                      fat: parseInt(e.target.value) || 0,
                      isCustomTargets: true,
                    }))}
                    className="text-center"
                  />
                </div>
              </div>
            </div>

            {/* Additional Settings */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Water (ml)</label>
                <Input
                  type="number"
                  value={goalsForm.water || ''}
                  onChange={(e) => setGoalsForm((p) => ({ ...p, water: parseInt(e.target.value) || 0 }))}
                  placeholder="2000"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Workouts/Week</label>
                <Input
                  type="number"
                  min="0"
                  max="7"
                  value={goalsForm.workoutsPerWeek || ''}
                  onChange={(e) => setGoalsForm((p) => ({ ...p, workoutsPerWeek: parseInt(e.target.value) || 0 }))}
                  placeholder="4"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Weight Unit</label>
              <Select
                value={goalsForm.weightUnit}
                onValueChange={(v) => setGoalsForm((p) => ({ ...p, weightUnit: v as 'kg' | 'lbs' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kilograms (kg)</SelectItem>
                  <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowGoalsDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveGoals}
              disabled={isSaving}
              className="bg-gradient-to-r from-emerald-500 to-teal-500"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Save Goals'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

