'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Plus,
  Trophy,
  Target,
  Zap,
  MoreHorizontal,
  Trash2,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Sparkles,
  Calendar,
  CalendarDays,
} from 'lucide-react';
import { Habit } from '@/types';
import { habitsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';

const HABIT_COLORS = [
  '#22c55e', // Green
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#f59e0b', // Amber
  '#f97316', // Orange
  '#ef4444', // Red
  '#ec4899', // Pink
  '#8b5cf6', // Violet
];

type ViewMode = 'week' | 'month';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Get week number of the month (1-4/5) using UTC
const getWeekOfMonth = (date: Date) => {
  const firstDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const dayOfMonth = date.getUTCDate();
  const firstDayOfWeek = firstDay.getUTCDay();
  return Math.ceil((dayOfMonth + firstDayOfWeek) / 7);
};

// Get days in a month
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

// Helper to get UTC date string in YYYY-MM-DD format
const getUTCDateString = (date: Date): string => {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
};

// Generate dates for the board (week view - shows Mon to Sun)
const generateWeekDates = (weekOffset: number = 0) => {
  const dates: string[] = [];
  const today = new Date();
  
  // Find the Monday of the current week using UTC
  const dayOfWeek = today.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, so go back 6 days
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - daysToMonday - (weekOffset * 7));
  
  // Generate Mon to Sun
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + i);
    dates.push(getUTCDateString(date));
  }

  return dates;
};

// Generate dates for month view
const generateMonthDates = (year: number, month: number) => {
  const dates: string[] = [];
  const daysInMonth = getDaysInMonth(year, month);

  for (let day = 1; day <= daysInMonth; day++) {
    // Use UTC date to avoid timezone issues
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    dates.push(dateStr);
  }

  return dates;
};

const formatDateHeader = (dateStr: string, isMobile: boolean, isMonthView: boolean = false) => {
  // Parse the date string (YYYY-MM-DD) to get components
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  
  // Get today's date in UTC
  const now = new Date();
  const todayStr = getUTCDateString(now);
  
  const yesterday = new Date(now);
  yesterday.setUTCDate(now.getUTCDate() - 1);
  const yesterdayStr = getUTCDateString(yesterday);

  const isToday = dateStr === todayStr;
  const isYesterday = dateStr === yesterdayStr;

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNameShort = isMobile || isMonthView ? dayNames[date.getUTCDay()].charAt(0) : dayNames[date.getUTCDay()];

  if (isToday) return { day: isMonthView ? dayNameShort : 'Today', date: day, isToday: true };
  if (isYesterday && !isMonthView) return { day: 'Yest', date: day, isToday: false };

  return {
    day: dayNameShort,
    date: day,
    isToday: false,
  };
};

export default function StreakBoardPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitColor, setNewHabitColor] = useState(HABIT_COLORS[0]);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [togglingCells, setTogglingCells] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Detect mobile for compact styling
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate current dates based on view mode
  const today = new Date();
  const currentMonth = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
  const currentMonthName = MONTH_NAMES_FULL[currentMonth.getMonth()];
  const currentYear = currentMonth.getFullYear();
  
  // For week view, calculate the Monday of the displayed week
  const weekDates = generateWeekDates(weekOffset);
  // Parse the Monday date string (YYYY-MM-DD)
  const [weekYearNum, weekMonthNum] = weekDates[0].split('-').map(Number);
  const weekStartDate = new Date(Date.UTC(weekYearNum, weekMonthNum - 1, parseInt(weekDates[0].split('-')[2])));
  const weekNumber = getWeekOfMonth(weekStartDate);
  const weekMonthName = MONTH_NAMES[weekMonthNum - 1];
  const weekYear = weekYearNum;

  const dates = viewMode === 'week'
    ? weekDates
    : generateMonthDates(currentMonth.getFullYear(), currentMonth.getMonth());

  const fetchHabits = useCallback(async () => {
    try {
      const response = await habitsAPI.getAll();
      setHabits(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch habits:', error);
      toast.error('Failed to load habits');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const handleAddHabit = async () => {
    if (!newHabitName.trim()) return;

    try {
      const response = await habitsAPI.create({
        name: newHabitName.trim(),
        color: newHabitColor,
      });
      setHabits((prev) => [...prev, response.data.data]);
      setNewHabitName('');
      setNewHabitColor(HABIT_COLORS[0]);
      setIsAddingHabit(false);
      toast.success('Habit created!');
    } catch (error) {
      console.error('Failed to create habit:', error);
      toast.error('Failed to create habit');
    }
  };

  const handleToggle = async (habitId: string, date: string) => {
    const cellKey = `${habitId}-${date}`;
    if (togglingCells.has(cellKey)) return;

    setTogglingCells((prev) => new Set(prev).add(cellKey));

    // Optimistic update
    setHabits((prev) =>
      prev.map((h) => {
        if (h._id !== habitId) return h;
        const existingIdx = h.completions.findIndex((c) => c.date === date);
        let newCompletions = [...h.completions];
        if (existingIdx >= 0) {
          newCompletions[existingIdx] = {
            ...newCompletions[existingIdx],
            completed: !newCompletions[existingIdx].completed,
          };
        } else {
          newCompletions.push({ date, completed: true });
        }
        return { ...h, completions: newCompletions };
      })
    );

    try {
      const response = await habitsAPI.toggle(habitId, date);
      // Update with server response for accurate streaks
      setHabits((prev) =>
        prev.map((h) => (h._id === habitId ? response.data.data : h))
      );
    } catch (error) {
      console.error('Failed to toggle habit:', error);
      // Revert on error
      fetchHabits();
      toast.error('Failed to update');
    } finally {
      setTogglingCells((prev) => {
        const next = new Set(prev);
        next.delete(cellKey);
        return next;
      });
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    try {
      await habitsAPI.delete(habitId);
      setHabits((prev) => prev.filter((h) => h._id !== habitId));
      toast.success('Habit deleted');
    } catch (error) {
      console.error('Failed to delete habit:', error);
      toast.error('Failed to delete habit');
    }
  };

  const handleUpdateHabit = async () => {
    if (!editingHabit) return;

    try {
      const response = await habitsAPI.update(editingHabit._id, {
        name: editingHabit.name,
        color: editingHabit.color,
      });
      setHabits((prev) =>
        prev.map((h) => (h._id === editingHabit._id ? response.data.data : h))
      );
      setEditingHabit(null);
      toast.success('Habit updated');
    } catch (error) {
      console.error('Failed to update habit:', error);
      toast.error('Failed to update habit');
    }
  };

  const isCompleted = (habit: Habit, date: string) => {
    const completion = habit.completions.find((c) => c.date === date);
    return completion?.completed ?? false;
  };

  const totalCompletionsToday = habits.reduce((sum, h) => {
    const todayStr = getUTCDateString(new Date());
    return sum + (isCompleted(h, todayStr) ? 1 : 0);
  }, 0);

  const bestStreak = Math.max(...habits.map((h) => h.longestStreak), 0);
  const activeStreaks = habits.filter((h) => h.currentStreak > 0).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Streak Board</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Track your daily habits
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsAddingHabit(true)}
            size="sm"
            className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg shadow-orange-500/20"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Habit</span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Today</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-emerald-600">
              {totalCompletionsToday}/{habits.length}
            </p>
          </div>
          <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Best</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-amber-600">
              {bestStreak} days
            </p>
          </div>
          <div className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border border-violet-500/20 rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-violet-500" />
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-violet-600">
              {activeStreaks} streaks
            </p>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="p-4 sm:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : habits.length === 0 ? (
          <div className="text-center py-20">
            <div className="h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center mb-4">
              <Sparkles className="h-10 w-10 text-orange-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Start your streak journey</h3>
            <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
              Add habits you want to track daily and build powerful streaks
            </p>
            <Button
              onClick={() => setIsAddingHabit(true)}
              className="gap-2 bg-gradient-to-r from-orange-500 to-red-500"
            >
              <Plus className="h-4 w-4" />
              Add Your First Habit
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* View Toggle & Date Navigation */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-muted/50 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('week')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                    viewMode === 'week'
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <CalendarDays className="h-4 w-4" />
                  <span>Week</span>
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                    viewMode === 'month'
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Calendar className="h-4 w-4" />
                  <span>Month</span>
                </button>
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-2 flex-1 justify-center sm:justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => viewMode === 'week' ? setWeekOffset((p) => p + 1) : setMonthOffset((p) => p + 1)}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="min-w-[140px] text-center">
                  {viewMode === 'week' ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm font-medium">
                        Week {weekNumber}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">
                        {weekMonthName} {weekYear}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm font-medium">
                      {currentMonthName} {currentYear}
                    </span>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => viewMode === 'week' ? setWeekOffset((p) => Math.max(0, p - 1)) : setMonthOffset((p) => Math.max(0, p - 1))}
                  disabled={viewMode === 'week' ? weekOffset === 0 : monthOffset === 0}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                {(viewMode === 'week' ? weekOffset : monthOffset) > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewMode === 'week' ? setWeekOffset(0) : setMonthOffset(0)}
                    className="text-xs h-7"
                  >
                    Today
                  </Button>
                )}
              </div>
            </div>

            {/* Streak Grid */}
            <div
              ref={scrollContainerRef}
              className="overflow-x-auto -mx-4 sm:mx-0"
            >
              <div className="min-w-fit">
                {/* Date Headers */}
                <div className={cn(
                  "flex items-center mb-3",
                  viewMode === 'month' ? 'gap-0.5' : 'gap-1 sm:gap-2'
                )}>
                  <div className="w-32 sm:w-48 shrink-0 sticky left-0 z-10 pl-4 sm:pl-0 pr-3 bg-background/80 backdrop-blur-md before:absolute before:inset-0 before:-z-10 before:bg-background/50">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Habits
                    </span>
                  </div>
                  {dates.map((date) => {
                    const { day, date: dayNum, isToday } = formatDateHeader(
                      date,
                      isMobile,
                      viewMode === 'month'
                    );
                    return (
                      <div
                        key={date}
                        className={cn(
                          'flex flex-col items-center justify-center rounded-lg transition-all',
                          viewMode === 'month'
                            ? 'w-7 h-10 sm:w-8 sm:h-11'
                            : 'w-10 h-14 sm:w-12 sm:h-16',
                          isToday
                            ? 'bg-gradient-to-b from-orange-500/20 to-red-500/10 border border-orange-500/30'
                            : 'bg-muted/30'
                        )}
                      >
                        {viewMode === 'week' && (
                          <span
                            className={cn(
                              'text-[10px] sm:text-xs font-medium',
                              isToday ? 'text-orange-600' : 'text-muted-foreground'
                            )}
                          >
                            {day}
                          </span>
                        )}
                        <span
                          className={cn(
                            viewMode === 'month' ? 'text-xs font-semibold' : 'text-sm sm:text-base font-bold',
                            isToday ? 'text-orange-600' : 'text-foreground'
                          )}
                        >
                          {dayNum}
                        </span>
                      </div>
                    );
                  })}
                  <div className="w-16 sm:w-20 shrink-0 text-center">
                    <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                      Streak
                    </span>
                  </div>
                </div>

                {/* Habit Rows */}
                <AnimatePresence mode="popLayout">
                  {habits.map((habit, index) => (
                    <motion.div
                      key={habit._id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "flex items-center mb-2",
                        viewMode === 'month' ? 'gap-0.5' : 'gap-1 sm:gap-2'
                      )}
                    >
                      {/* Habit Name */}
                      <div className="w-32 sm:w-48 shrink-0 flex items-center gap-2 group sticky left-0 z-10 pl-4 sm:pl-0 pr-3 bg-background/80 backdrop-blur-md">
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: habit.color }}
                        />
                        <span className="text-sm font-medium truncate flex-1">
                          {habit.name}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            >
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem
                              onClick={() => setEditingHabit(habit)}
                            >
                              <Edit3 className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteHabit(habit._id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Checkboxes */}
                      {dates.map((date) => {
                        const completed = isCompleted(habit, date);
                        const cellKey = `${habit._id}-${date}`;
                        const isToggling = togglingCells.has(cellKey);
                        
                        // Check if date is in the future (compare date strings)
                        const todayStr = getUTCDateString(new Date());
                        const isFutureDate = date > todayStr;

                        return (
                          <motion.button
                            key={date}
                            onClick={() => !isFutureDate && handleToggle(habit._id, date)}
                            disabled={isToggling || isFutureDate}
                            className={cn(
                              'rounded-lg border-2 flex items-center justify-center transition-all',
                              viewMode === 'month'
                                ? 'w-7 h-7 sm:w-8 sm:h-8 rounded-md'
                                : 'w-10 h-10 sm:w-12 sm:h-12',
                              completed
                                ? 'border-transparent shadow-md'
                                : 'border-border/50 hover:border-border bg-background hover:bg-muted/50',
                              isFutureDate && 'opacity-30 cursor-not-allowed hover:bg-background hover:border-border/50'
                            )}
                            style={{
                              backgroundColor: completed ? habit.color : undefined,
                              boxShadow: completed
                                ? `0 4px 14px ${habit.color}40`
                                : undefined,
                            }}
                            whileTap={{ scale: 0.9 }}
                            whileHover={{ scale: 1.05 }}
                          >
                            <AnimatePresence mode="wait">
                              {isToggling ? (
                                <motion.div
                                  key="loading"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                >
                                  <Loader2 className={cn(
                                    "animate-spin text-muted-foreground",
                                    viewMode === 'month' ? 'h-3 w-3' : 'h-4 w-4'
                                  )} />
                                </motion.div>
                              ) : completed ? (
                                <motion.div
                                  key="check"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                >
                                  <Check className={cn(
                                    "text-white",
                                    viewMode === 'month' ? 'h-3.5 w-3.5' : 'h-5 w-5'
                                  )} />
                                </motion.div>
                              ) : null}
                            </AnimatePresence>
                          </motion.button>
                        );
                      })}

                      {/* Streak Count */}
                      <div className="w-16 sm:w-20 shrink-0 flex items-center justify-center gap-1">
                        {habit.currentStreak > 0 && (
                          <Flame className="h-4 w-4 text-orange-500" />
                        )}
                        <span
                          className={cn(
                            'text-sm font-bold',
                            habit.currentStreak > 0
                              ? 'text-orange-500'
                              : 'text-muted-foreground'
                          )}
                        >
                          {habit.currentStreak}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Add Habit Row */}
                <button
                  onClick={() => setIsAddingHabit(true)}
                  className={cn(
                    "flex items-center mt-3 group",
                    viewMode === 'month' ? 'gap-0.5' : 'gap-1 sm:gap-2'
                  )}
                >
                  <div className="w-32 sm:w-48 shrink-0 flex items-center gap-2 pl-4 sm:pl-0 pr-3 text-muted-foreground hover:text-foreground transition-colors">
                    <div className="h-3 w-3 rounded-full shrink-0 border-2 border-dashed border-muted-foreground/50 group-hover:border-foreground/50 transition-colors" />
                    <span className="text-sm font-medium flex items-center gap-1">
                      <Plus className="h-3.5 w-3.5" />
                      Add Habit
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Habit Dialog */}
      <Dialog open={isAddingHabit} onOpenChange={setIsAddingHabit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Add New Habit
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Habit Name
              </label>
              <Input
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                placeholder="e.g., Exercise, Read, Meditate..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddHabit()}
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Color</label>
              <div className="flex flex-wrap gap-2">
                {HABIT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewHabitColor(color)}
                    className={cn(
                      'h-8 w-8 rounded-full transition-all',
                      newHabitColor === color
                        ? 'ring-2 ring-offset-2 ring-offset-background scale-110'
                        : 'hover:scale-105'
                    )}
                    style={{
                      backgroundColor: color,
                      '--tw-ring-color': color,
                    } as React.CSSProperties}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddingHabit(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddHabit}
              disabled={!newHabitName.trim()}
              className="bg-gradient-to-r from-orange-500 to-red-500"
            >
              Add Habit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Habit Dialog */}
      <Dialog open={!!editingHabit} onOpenChange={() => setEditingHabit(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Edit Habit
            </DialogTitle>
          </DialogHeader>
          {editingHabit && (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Habit Name
                </label>
                <Input
                  value={editingHabit.name}
                  onChange={(e) =>
                    setEditingHabit({ ...editingHabit, name: e.target.value })
                  }
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateHabit()}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Color</label>
                <div className="flex flex-wrap gap-2">
                  {HABIT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() =>
                        setEditingHabit({ ...editingHabit, color })
                      }
                      className={cn(
                        'h-8 w-8 rounded-full transition-all',
                        editingHabit.color === color
                          ? 'ring-2 ring-offset-2 ring-offset-background scale-110'
                          : 'hover:scale-105'
                      )}
                      style={{
                        backgroundColor: color,
                        '--tw-ring-color': color,
                      } as React.CSSProperties}
                    />
                  ))}
                </div>
              </div>
              <div className="pt-2">
                <p className="text-sm text-muted-foreground">
                  Current streak:{' '}
                  <span className="font-bold text-orange-500">
                    {editingHabit.currentStreak} days
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Longest streak:{' '}
                  <span className="font-bold text-amber-500">
                    {editingHabit.longestStreak} days
                  </span>
                </p>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingHabit(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateHabit}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

