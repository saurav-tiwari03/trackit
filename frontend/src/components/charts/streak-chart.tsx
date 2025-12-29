'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { habitsAPI } from '@/lib/api';
import { Habit } from '@/types';
import { cn } from '@/lib/utils';

interface ChartDataPoint {
  date: string;
  displayDate: string;
  [key: string]: number | string;
}

export function StreakChart() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '60d' | '90d'>('30d');
  const [visibleHabits, setVisibleHabits] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchHabits = async () => {
      try {
        const response = await habitsAPI.getAll();
        const habitsData = response.data.data || [];
        setHabits(habitsData);
        // Show all habits by default
        setVisibleHabits(new Set(habitsData.map((h: Habit) => h._id)));
      } catch (error) {
        console.error('Failed to fetch habits:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHabits();
  }, []);

  const { chartData, habitStats, totalStats } = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '60d' ? 60 : 90;
    const today = startOfDay(new Date());
    const startDate = subDays(today, days - 1);
    const dateRange = eachDayOfInterval({ start: startDate, end: today });

    // Build raw completion data
    const rawData: { date: string; displayDate: string; completions: Record<string, boolean> }[] = dateRange.map((date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const completions: Record<string, boolean> = {};
      
      habits.forEach((habit) => {
        const completion = habit.completions?.find((c) => c.date === dateStr);
        completions[habit._id] = completion?.completed ?? false;
      });

      return {
        date: dateStr,
        displayDate: format(date, 'MMM d'),
        completions,
      };
    });

    // Calculate rolling streak count for each habit
    const data: ChartDataPoint[] = [];
    const currentStreaks: Record<string, number> = {};
    
    habits.forEach((habit) => {
      currentStreaks[habit._id] = 0;
    });

    rawData.forEach((day) => {
      const point: ChartDataPoint = {
        date: day.date,
        displayDate: day.displayDate,
      };

      habits.forEach((habit) => {
        if (day.completions[habit._id]) {
          currentStreaks[habit._id]++;
        } else {
          currentStreaks[habit._id] = Math.max(0, currentStreaks[habit._id] - 0.5);
        }
        point[habit._id] = currentStreaks[habit._id];
      });

      data.push(point);
    });

    // Calculate stats per habit
    const stats: Record<string, { currentStreak: number; totalCompletions: number; longestStreak: number }> = {};
    let totalCurrentStreak = 0;
    let totalLongestStreak = 0;
    let totalCompletionsAll = 0;
    
    habits.forEach((habit) => {
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      let totalCompletions = 0;
      let streakBroken = false;

      const reversedRawData = [...rawData].reverse();
      for (const day of reversedRawData) {
        if (day.completions[habit._id]) {
          totalCompletions++;
          if (!streakBroken) {
            currentStreak++;
          }
        } else {
          if (!streakBroken) {
            streakBroken = true;
          }
        }
      }

      for (const day of rawData) {
        if (day.completions[habit._id]) {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }

      stats[habit._id] = { currentStreak, totalCompletions, longestStreak };
      totalCurrentStreak = Math.max(totalCurrentStreak, currentStreak);
      totalLongestStreak = Math.max(totalLongestStreak, longestStreak);
      totalCompletionsAll += totalCompletions;
    });

    return { 
      chartData: data, 
      habitStats: stats,
      totalStats: {
        currentStreak: totalCurrentStreak,
        longestStreak: totalLongestStreak,
        totalCompletions: totalCompletionsAll,
      }
    };
  }, [habits, timeRange]);

  const displayStats = totalStats;

  const timeRangeOptions = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '60d', label: '60 days' },
    { value: '90d', label: '90 days' },
  ];

  const toggleHabitVisibility = (habitId: string) => {
    setVisibleHabits(prev => {
      const next = new Set(prev);
      if (next.has(habitId)) {
        next.delete(habitId);
      } else {
        next.add(habitId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur">
        <CardContent className="p-6">
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (habits.length === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur">
        <CardContent className="p-6">
          <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
            <Flame className="h-12 w-12 mb-3 opacity-50" />
            <p>No habits to track yet</p>
            <p className="text-sm">Create habits to see your streak chart</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getHabitColor = (habit: Habit) => habit.color || '#f97316';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur border border-border rounded-lg p-3 shadow-xl">
          <p className="text-sm font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            const habit = habits.find(h => h._id === entry.dataKey);
            if (!habit) return null;
            return (
              <div key={index} className="flex items-center gap-2 text-sm">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">{habit.name}:</span>
                <span className="font-medium">{Math.round(entry.value)} day streak</span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="bg-card/50 backdrop-blur overflow-hidden">
        <CardHeader className="pb-0">
          <div className="flex flex-col gap-4">
            {/* Title and Stats Row */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  Habit Streaks
                </CardTitle>
                <CardDescription className="mt-1">
                  Tracking {habits.length} habits for the last {timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : timeRange === '60d' ? '60' : '90'} days
                </CardDescription>
              </div>

              {/* Stats */}
              <div className="flex gap-3 flex-wrap">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20"
                >
                  <div className="text-xs text-muted-foreground mb-0.5">Best Current</div>
                  <div className="text-2xl font-bold text-orange-500">
                    {displayStats?.currentStreak || 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground">days</div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-center px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20"
                >
                  <div className="text-xs text-muted-foreground mb-0.5">Best Longest</div>
                  <div className="text-2xl font-bold text-purple-500">
                    {displayStats?.longestStreak || 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground">days</div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-center px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20"
                >
                  <div className="text-xs text-muted-foreground mb-0.5">Total</div>
                  <div className="text-2xl font-bold text-green-500">
                    {displayStats?.totalCompletions || 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground">completions</div>
                </motion.div>
              </div>
            </div>

            {/* Habit Toggle Pills - click to show/hide on chart */}
            <div className="flex flex-wrap gap-2">
              {habits.map((habit) => {
                const isVisible = visibleHabits.has(habit._id);
                const stats = habitStats[habit._id];
                return (
                  <button
                    key={habit._id}
                    onClick={() => toggleHabitVisibility(habit._id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all border',
                      isVisible
                        ? 'shadow-sm'
                        : 'bg-muted/30 border-transparent text-muted-foreground/50 hover:text-muted-foreground'
                    )}
                    style={isVisible ? {
                      backgroundColor: `${getHabitColor(habit)}15`,
                      borderColor: `${getHabitColor(habit)}40`,
                      color: getHabitColor(habit),
                    } : undefined}
                  >
                    <span
                      className={cn(
                        "w-2.5 h-2.5 rounded-full shrink-0 transition-opacity",
                        !isVisible && "opacity-30"
                      )}
                      style={{ backgroundColor: getHabitColor(habit) }}
                    />
                    <span className="truncate max-w-[120px]">{habit.name}</span>
                    {stats && (
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded-md',
                        isVisible ? 'bg-white/20' : 'bg-muted/50'
                      )}>
                        🔥 {stats.currentStreak}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Time Range Selector */}
            <div className="flex gap-1">
              {timeRangeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTimeRange(option.value as '7d' | '30d' | '60d' | '90d')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                    timeRange === option.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        {/* Chart with multiple lines */}
        <CardContent className="pt-4 pb-2 px-2 sm:px-6">
          <div className="h-[200px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis
                  dataKey="displayDate"
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                  tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.6)' }}
                  interval="preserveStartEnd"
                  tickMargin={10}
                  minTickGap={50}
                />
                <YAxis
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                  tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.6)' }}
                  width={35}
                  domain={[0, 'dataMax + 1']}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                {habits.map((habit) => (
                  visibleHabits.has(habit._id) && (
                    <Line
                      key={habit._id}
                      type="monotone"
                      dataKey={habit._id}
                      name={habit.name}
                      stroke={getHabitColor(habit)}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{
                        r: 5,
                        fill: getHabitColor(habit),
                        stroke: 'hsl(var(--background))',
                        strokeWidth: 2,
                      }}
                    />
                  )
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
