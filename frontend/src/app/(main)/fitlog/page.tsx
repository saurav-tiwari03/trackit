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
  Camera,
  ImageIcon,
  Upload,
  Pencil,
  GlassWater,
  Coffee,
  HelpCircle,
  Minus,
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  const [showDrinkDialog, setShowDrinkDialog] = useState(false);
  const [drinkAmount, setDrinkAmount] = useState(250);
  const [isCalculatingGoals, setIsCalculatingGoals] = useState(false);

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
    description: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    time: string;
  }>({
    type: 'breakfast',
    name: '',
    description: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    time: '',
  });
  
  // AI Food Analysis states
  const [mealInputMode, setMealInputMode] = useState<'manual' | 'ai'>('manual');
  const [foodImage, setFoodImage] = useState<File | null>(null);
  const [foodImagePreview, setFoodImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
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

  const handleAnalyzeFood = async () => {
    if (!foodImage) {
      toast.error('Please select an image first');
      return;
    }

    try {
      setIsAnalyzing(true);
      const response = await fitlogAPI.analyzeFoodImage(foodImage, mealForm.description || undefined);
      
      if (response.data.success && response.data.data) {
        const macros = response.data.data;
        setMealForm((prev) => ({
          ...prev,
          name: macros.name || '',
          calories: macros.calories,
          protein: macros.protein,
          carbs: macros.carbs,
          fat: macros.fat,
        }));
        // Show serving info in toast for reference
        const servingInfo = `Serving: ${macros.servingSize || 'N/A'} | Confidence: ${macros.confidence}`;
        toast.success(`Food analyzed! ${servingInfo}`);
      } else {
        toast.error(response.data.message || 'Failed to analyze food');
      }
    } catch (error) {
      console.error('Failed to analyze food:', error);
      toast.error('Failed to analyze food image');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFoodImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFoodImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetMealForm = () => {
    setMealForm({
      type: 'breakfast',
      name: '',
      description: '',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      time: '',
    });
    setMealInputMode('manual');
    setFoodImage(null);
    setFoodImagePreview(null);
    setEditingMealId(null);
  };

  const handleEditMeal = (meal: FitLogMeal) => {
    setMealForm({
      type: meal.type,
      name: meal.name || '',
      description: meal.description || '',
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      time: meal.time || '',
    });
    setEditingMealId(meal._id || null);
    setMealInputMode('manual');
    setShowMealDialog(true);
  };

  const handleAddMeal = async () => {
    try {
      setIsSaving(true);
      const mealData = {
        type: mealForm.type,
        name: mealForm.name || undefined,
        description: mealForm.description || undefined,
        calories: mealForm.calories,
        protein: mealForm.protein,
        carbs: mealForm.carbs,
        fat: mealForm.fat,
        time: mealForm.time || undefined,
      };
      
      const mealLabel = MEAL_TYPES.find(m => m.value === mealForm.type)?.label || 'Meal';
      
      if (editingMealId) {
        // Update existing meal
        await fitlogAPI.updateMeal(selectedDate, editingMealId, mealData);
        toast.success(`${mealLabel} updated!`);
      } else {
        // Add new meal
        await fitlogAPI.addMeal(selectedDate, mealData);
        toast.success(`${mealLabel} added!`);
      }
      
      setShowMealDialog(false);
      resetMealForm();
      fetchData();
    } catch (error) {
      console.error('Failed to save meal:', error);
      toast.error(editingMealId ? 'Failed to update meal' : 'Failed to add meal');
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

  const handleUpdateWater = async (amount: number, isAdding: boolean = true, showToast: boolean = true) => {
    const currentWater = entry?.nutrition?.water || 0;
    const newWater = isAdding 
      ? currentWater + amount 
      : Math.max(0, currentWater - amount);
    
    // Optimistic update - update local state immediately
    setEntry((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        nutrition: {
          ...prev.nutrition,
          calories: prev.nutrition?.calories || 0,
          protein: prev.nutrition?.protein || 0,
          carbs: prev.nutrition?.carbs || 0,
          fat: prev.nutrition?.fat || 0,
          water: newWater,
        },
      };
    });
    
    if (showToast) {
      if (isAdding) {
        toast.success(`+${amount}ml`, { duration: 1500 });
      } else {
        toast.success(`-${amount}ml`, { duration: 1500 });
      }
    }
    setShowDrinkDialog(false);
    
    // Save to backend in background
    try {
      await fitlogAPI.updateEntry(selectedDate, {
        nutrition: {
          calories: entry?.nutrition?.calories || 0,
          protein: entry?.nutrition?.protein || 0,
          carbs: entry?.nutrition?.carbs || 0,
          fat: entry?.nutrition?.fat || 0,
          water: newWater,
        },
      });
    } catch (error) {
      console.error('Failed to update water:', error);
      // Revert on error
      setEntry((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          nutrition: {
            ...prev.nutrition,
            calories: prev.nutrition?.calories || 0,
            protein: prev.nutrition?.protein || 0,
            carbs: prev.nutrition?.carbs || 0,
            fat: prev.nutrition?.fat || 0,
            water: currentWater,
          },
        };
      });
      toast.error('Failed to save water intake');
    }
  };

  const handleToggleWaterGlass = (glassIndex: number) => {
    const waterPerGlass = (goals?.water || 2000) / 8;
    const currentWater = entry?.nutrition?.water || 0;
    const glassWaterAmount = waterPerGlass * (glassIndex + 1);
    
    // If this glass is filled, remove water down to previous glass level
    // If this glass is empty, add water up to this glass level
    const isFilled = currentWater >= glassWaterAmount;
    
    if (isFilled) {
      // Remove water - set to previous glass level
      const targetWater = waterPerGlass * glassIndex;
      const amountToRemove = currentWater - targetWater;
      if (amountToRemove > 0) {
        handleUpdateWater(amountToRemove, false, true);
      }
    } else {
      // Add water up to this glass
      const amountToAdd = glassWaterAmount - currentWater;
      if (amountToAdd > 0) {
        handleUpdateWater(amountToAdd, true, true);
      }
    }
  };

  const handleCalculateGoalsWithAI = async () => {
    if (!goalsForm.currentWeight || !goalsForm.height || !goalsForm.age) {
      toast.error('Please fill in your weight, height, and age first');
      return;
    }

    try {
      setIsCalculatingGoals(true);
      const response = await fitlogAPI.calculateGoalsWithAI({
        gender: goalsForm.gender,
        age: goalsForm.age,
        height: goalsForm.height,
        currentWeight: goalsForm.currentWeight,
        targetWeight: goalsForm.targetWeight,
        activityLevel: goalsForm.activityLevel,
        fitnessGoal: goalsForm.fitnessGoal,
      });

      if (response.data.success && response.data.data) {
        const aiGoals = response.data.data;
        setGoalsForm((p) => ({
          ...p,
          caloriesIntake: aiGoals.caloriesIntake,
          caloriesBurn: aiGoals.caloriesBurn,
          protein: aiGoals.protein,
          carbs: aiGoals.carbs,
          fat: aiGoals.fat,
          water: aiGoals.water,
          isCustomTargets: false,
        }));
        
        // Show tips in toast
        if (aiGoals.tips && aiGoals.tips.length > 0) {
          toast.success(aiGoals.explanation, {
            description: aiGoals.tips[0],
            duration: 5000,
          });
        } else {
          toast.success('AI calculated your personalized goals!');
        }
      } else {
        toast.error(response.data.message || 'Failed to calculate goals');
      }
    } catch (error) {
      console.error('Failed to calculate goals with AI:', error);
      toast.error('Failed to calculate goals with AI');
    } finally {
      setIsCalculatingGoals(false);
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
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMealDialog(true)}
                  className="gap-2"
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
                        <div className="flex items-center gap-2">
                          <div className="text-right text-xs">
                            <p className="font-medium">{meal.calories} kcal</p>
                            <p className="text-muted-foreground">
                              P:{meal.protein}g C:{meal.carbs}g F:{meal.fat}g
                            </p>
                          </div>
                          {meal._id && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => handleEditMeal(meal)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-destructive"
                                onClick={() => handleDeleteMeal(meal._id!)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
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
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Water</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="text-muted-foreground hover:text-foreground transition-colors">
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px]">
                        <p>Click empty glass to fill up to that point. Click filled glass to remove water from that point.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">
                      {nutrition?.water || 0}ml / {goals?.water || 2000}ml
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDrinkDialog(true)}
                      className="h-7 gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  </div>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: 8 }).map((_, i) => {
                    const waterPerGlass = (goals?.water || 2000) / 8;
                    const filled = (nutrition?.water || 0) >= waterPerGlass * (i + 1);
                    return (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              'h-8 flex-1 rounded-md transition-all cursor-pointer',
                              filled 
                                ? 'bg-blue-500 hover:bg-blue-400' 
                                : 'bg-muted/50 hover:bg-blue-200'
                            )}
                            onClick={() => handleToggleWaterGlass(i)}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {filled 
                            ? `Click to remove (${Math.round(waterPerGlass)}ml)` 
                            : `Click to add (${Math.round(waterPerGlass * (i + 1) - (nutrition?.water || 0))}ml)`
                          }
                        </TooltipContent>
                      </Tooltip>
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
                  variant="outline"
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
                  className="gap-2"
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
              variant="outline"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Meal Dialog */}
      <Dialog open={showMealDialog} onOpenChange={(open) => {
        setShowMealDialog(open);
        if (!open) resetMealForm();
      }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-purple-500" />
              {editingMealId ? 'Edit Meal' : 'Add Meal'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Mode Toggle - only show when adding new meal */}
            {!editingMealId && (
              <div className="flex gap-2 p-1 bg-muted rounded-lg">
                <button
                  onClick={() => setMealInputMode('manual')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
                    mealInputMode === 'manual'
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Utensils className="h-4 w-4" />
                  Manual
                </button>
                <button
                  onClick={() => setMealInputMode('ai')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
                    mealInputMode === 'ai'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Sparkles className="h-4 w-4" />
                  AI Scan
                </button>
              </div>
            )}

            {/* AI Mode - Image Upload */}
            {mealInputMode === 'ai' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Food Image</label>
                  <div className="relative">
                    {foodImagePreview ? (
                      <div className="relative rounded-lg overflow-hidden border border-border">
                        <img
                          src={foodImagePreview}
                          alt="Food preview"
                          className="w-full h-48 object-cover"
                        />
                        <button
                          onClick={() => {
                            setFoodImage(null);
                            setFoodImagePreview(null);
                          }}
                          className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                        >
                          <X className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-500/5 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-purple-500">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Description (helps AI understand better)</label>
                  <Input
                    value={mealForm.description}
                    onChange={(e) => setMealForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="e.g., khichdi 200g with curd 30g"
                  />
                </div>
                <Button
                  onClick={handleAnalyzeFood}
                  disabled={!foodImage || isAnalyzing}
                  variant="outline" className="w-full"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analyze Food
                    </>
                  )}
                </Button>
                {mealForm.calories > 0 && (
                  <div className="text-sm text-muted-foreground text-center">
                    ✓ Food analyzed! Review and edit the values below.
                  </div>
                )}
              </div>
            )}

            {/* Common Fields (shown in both modes, or after AI analysis, or when editing) */}
            {(mealInputMode === 'manual' || mealForm.calories > 0 || editingMealId) && (
              <>
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
                {(mealInputMode === 'manual' || editingMealId) && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Description (optional)</label>
                    <Input
                      value={mealForm.description}
                      onChange={(e) => setMealForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="e.g., khichdi 200g with curd 30g"
                    />
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setShowMealDialog(false);
              resetMealForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleAddMeal}
              disabled={isSaving || !mealForm.calories}
              variant="outline"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingMealId ? (
                'Update Meal'
              ) : (
                'Add Meal'
              )}
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
              variant="outline"
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
              variant="outline"
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
                onClick={handleCalculateGoalsWithAI}
                disabled={isCalculatingGoals}
              >
                {isCalculatingGoals ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Calculating with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Calculate with AI
                  </>
                )}
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
              variant="outline"
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

      {/* Drink Dialog */}
      <Dialog open={showDrinkDialog} onOpenChange={setShowDrinkDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GlassWater className="h-5 w-5 text-blue-500" />
              Manage Water Intake
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Current status */}
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-blue-500">{nutrition?.water || 0}ml</p>
              <p className="text-xs text-muted-foreground">of {goals?.water || 2000}ml daily goal</p>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-3 block">Quick Add</label>
              <div className="grid grid-cols-4 gap-2">
                {[150, 250, 350, 500].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    className="flex-col h-16 gap-1 hover:bg-blue-50 hover:border-blue-300"
                    onClick={() => handleUpdateWater(amount, true)}
                  >
                    <Plus className="h-4 w-4 text-blue-500" />
                    <span className="text-xs">{amount}ml</span>
                  </Button>
                ))}
              </div>
            </div>

            {(nutrition?.water || 0) > 0 && (
              <div>
                <label className="text-sm font-medium mb-3 block">Quick Remove</label>
                <div className="grid grid-cols-4 gap-2">
                  {[150, 250, 350, 500].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      className="flex-col h-16 gap-1 hover:bg-red-50 hover:border-red-300"
                      onClick={() => handleUpdateWater(amount, false)}
                      disabled={(nutrition?.water || 0) < amount}
                    >
                      <Minus className="h-4 w-4 text-red-500" />
                      <span className="text-xs">{amount}ml</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <label className="text-sm font-medium mb-2 block">Custom Amount (ml)</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={drinkAmount}
                  onChange={(e) => setDrinkAmount(parseInt(e.target.value) || 0)}
                  placeholder="250"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => handleUpdateWater(drinkAmount, true)}
                  disabled={!drinkAmount}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

