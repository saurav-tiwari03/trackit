'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { tasksAPI, calendarAPI } from '@/lib/api';
import { Task } from '@/types';
import { cn } from '@/lib/utils';
import { useProjectsStore } from '@/store/projects';
import { TaskModal } from '@/components/task/task-modal';
import { CreateTaskModal } from '@/components/task/create-task-modal';

// Google Calendar Event type
interface GoogleCalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  htmlLink?: string;
  isAllDay: boolean;
}

const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAYS_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

type ViewMode = 'day' | 'week' | 'month';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  tasks: Task[];
  googleEvents: GoogleCalendarEvent[];
}

const priorityColors: Record<string, { bg: string; text: string; dot: string }> = {
  P1: { bg: 'bg-red-500/10', text: 'text-red-500', dot: 'bg-red-500' },
  P2: { bg: 'bg-orange-500/10', text: 'text-orange-500', dot: 'bg-orange-500' },
  P3: { bg: 'bg-blue-500/10', text: 'text-blue-500', dot: 'bg-blue-500' },
  P4: { bg: 'bg-slate-500/10', text: 'text-slate-500', dot: 'bg-slate-500' },
};

// Helper to get initial view mode based on screen size
const getInitialViewMode = (): ViewMode => {
  if (typeof window === 'undefined') return 'month';
  const width = window.innerWidth;
  // Mobile (< 768px): day view
  // Tablet & Desktop (>= 768px): month view
  return width < 768 ? 'day' : 'month';
};

export default function CalendarPage() {
  const { projects } = useProjectsStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedGoogleEvent, setSelectedGoogleEvent] = useState<GoogleCalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createInitialDueDate, setCreateInitialDueDate] = useState<string | undefined>(undefined);

  // Set initial view mode based on screen size
  useEffect(() => {
    setViewMode(getInitialViewMode());
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch Google Calendar events when month changes
  useEffect(() => {
    if (isGoogleConnected) {
      fetchGoogleEvents();
    }
  }, [currentDate, isGoogleConnected]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch tasks and Google Calendar status in parallel
      const [tasksResponse, statusResponse] = await Promise.all([
        tasksAPI.getAll(),
        calendarAPI.getGoogleStatus().catch(() => ({ data: { data: { connected: false } } })),
      ]);

      setTasks(tasksResponse.data.data);
      setIsGoogleConnected(statusResponse.data.data.connected);

      // If Google is connected, fetch events
      if (statusResponse.data.data.connected) {
        await fetchGoogleEvents();
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGoogleEvents = async () => {
    try {
      // Get events for the current month (with some buffer)
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);

      const response = await calendarAPI.getGoogleEvents({
        timeMin: startOfMonth.toISOString(),
        timeMax: endOfMonth.toISOString(),
      });

      setGoogleEvents(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch Google Calendar events:', error);
    }
  };

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const response = await tasksAPI.getAll();
      setTasks(response.data.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get tasks for a specific date
  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Helper function to get Google events for a specific date
  const getGoogleEventsForDate = (date: Date) => {
    return googleEvents.filter(event => {
      const eventStart = new Date(event.start);
      return (
        eventStart.getDate() === date.getDate() &&
        eventStart.getMonth() === date.getMonth() &&
        eventStart.getFullYear() === date.getFullYear()
      );
    });
  };

  // Format time for Google events
  const formatEventTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay();

    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const prevMonthDays = startDayOfWeek;
    const totalDays = 42;
    const nextMonthDays = totalDays - daysInMonth - prevMonthDays;

    const prevMonth = new Date(year, month, 0);
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonth.getDate() - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        tasks: getTasksForDate(date),
        googleEvents: getGoogleEventsForDate(date),
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        tasks: getTasksForDate(date),
        googleEvents: getGoogleEventsForDate(date),
      });
    }

    for (let i = 1; i <= nextMonthDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        tasks: getTasksForDate(date),
        googleEvents: getGoogleEventsForDate(date),
      });
    }

    return days;
  }, [currentDate, tasks, googleEvents]);

  // Get week days for the current week
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push({
        date,
        isCurrentMonth: date.getMonth() === currentDate.getMonth(),
        isToday: date.getTime() === today.getTime(),
        tasks: getTasksForDate(date),
        googleEvents: getGoogleEventsForDate(date),
      });
    }

    return days;
  }, [currentDate, tasks, googleEvents]);

  // Get current day for day view
  const dayData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const current = new Date(currentDate);
    current.setHours(0, 0, 0, 0);

    return {
      date: currentDate,
      isToday: current.getTime() === today.getTime(),
      tasks: getTasksForDate(currentDate),
      googleEvents: getGoogleEventsForDate(currentDate),
    };
  }, [currentDate, tasks, googleEvents]);

  // Mini calendar for day view
  const miniCalendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay();

    const days: { date: Date; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean; hasTasks: boolean; hasGoogleEvents: boolean }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(currentDate);
    selected.setHours(0, 0, 0, 0);

    const prevMonthDays = startDayOfWeek;
    const totalDays = 42;
    const nextMonthDays = totalDays - daysInMonth - prevMonthDays;

    const prevMonth = new Date(year, month, 0);
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonth.getDate() - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        isSelected: date.getTime() === selected.getTime(),
        hasTasks: getTasksForDate(date).length > 0,
        hasGoogleEvents: getGoogleEventsForDate(date).length > 0,
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        isSelected: date.getTime() === selected.getTime(),
        hasTasks: getTasksForDate(date).length > 0,
        hasGoogleEvents: getGoogleEventsForDate(date).length > 0,
      });
    }

    for (let i = 1; i <= nextMonthDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        isSelected: date.getTime() === selected.getTime(),
        hasTasks: getTasksForDate(date).length > 0,
        hasGoogleEvents: getGoogleEventsForDate(date).length > 0,
      });
    }

    return days;
  }, [currentDate, tasks, googleEvents]);

  const navigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getProjectColor = (task: Task) => {
    if (typeof task.project === 'string') {
      const project = projects.find(p => p._id === task.project);
      return project?.color || '#6366f1';
    }
    return task.project.color || '#6366f1';
  };

  const formatDayLabel = (day: CalendarDay) => {
    const date = day.date.getDate();
    if (date === 1) {
      return `${date} ${MONTHS[day.date.getMonth()].slice(0, 3)}`;
    }
    return date.toString();
  };

  const getHeaderTitle = () => {
    if (viewMode === 'day') {
      return `${currentDate.getDate()} ${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  const getSubtitle = () => {
    if (viewMode === 'day') {
      return DAYS_FULL[currentDate.getDay()];
    }
    return '';
  };

  const handleCreateModalClose = () => {
    setIsCreateModalOpen(false);
    setCreateInitialDueDate(undefined);
    fetchTasks();
  };

  const openCreateModalForCurrentView = () => {
    if (viewMode === 'day') {
      const d = new Date(currentDate);
      d.setHours(9, 0, 0, 0);
      setCreateInitialDueDate(d.toISOString());
    } else {
      setCreateInitialDueDate(undefined);
    }
    setIsCreateModalOpen(true);
  };

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.isCompleted) return false;
    return new Date(task.dueDate) < new Date();
  };

  // Hours for day/week view
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 gap-4">
          {/* Title and Navigation */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('prev')}
                className="rounded-full hover:bg-muted"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="rounded-full px-4 font-medium"
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('next')}
                className="rounded-full hover:bg-muted"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{getHeaderTitle()}</h1>
              {getSubtitle() && (
                <p className="text-sm text-muted-foreground">{getSubtitle()}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Google Calendar Connected Indicator */}
            {isGoogleConnected && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                <svg viewBox="0 0 24 24" className="w-4 h-4">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="text-xs font-medium text-blue-600">Synced</span>
              </div>
            )}

            {/* View Mode Tabs */}
            <div className="flex items-center bg-muted/50 rounded-xl p-1">
              {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'px-4 py-1.5 text-sm font-medium rounded-lg transition-all capitalize',
                    viewMode === mode
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Add Task Button */}
            <Button
              onClick={openCreateModalForCurrentView}
              size="sm"
              className="rounded-xl gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Task</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 px-4 sm:px-6 py-4 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
              <p className="text-sm text-muted-foreground">Loading calendar...</p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col"
            >
              {/* DAY VIEW */}
              {viewMode === 'day' && (
                <div className="flex flex-col lg:flex-row h-full gap-6">
                  {/* Sidebar with Mini Calendar & Tasks */}
                  <Card className="lg:w-80 shrink-0 p-4 bg-card/50 backdrop-blur">
                    {/* Mini Calendar */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                      </div>
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {DAYS_SHORT.map((day, i) => (
                          <div key={i} className="text-center text-xs text-muted-foreground font-medium py-1">
                            {day}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {miniCalendarDays.map((day, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setCurrentDate(day.date)}
                            className={cn(
                              'aspect-square flex flex-col items-center justify-center text-sm rounded-lg transition-all relative',
                              !day.isCurrentMonth && 'text-muted-foreground/50',
                              day.isToday && 'bg-primary text-primary-foreground font-semibold',
                              day.isSelected && !day.isToday && 'bg-primary/20 text-primary font-medium',
                              !day.isToday && !day.isSelected && 'hover:bg-muted'
                            )}
                          >
                            {day.date.getDate()}
                            {(day.hasTasks || day.hasGoogleEvents) && !day.isToday && (
                              <div className="absolute bottom-1 flex gap-0.5">
                                {day.hasTasks && <div className="w-1 h-1 rounded-full bg-primary" />}
                                {day.hasGoogleEvents && <div className="w-1 h-1 rounded-full bg-blue-500" />}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tasks for Selected Day */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold text-sm">Tasks</h3>
                        <Badge variant="secondary" className="ml-auto">
                          {dayData.tasks.length}
                        </Badge>
                      </div>

                      {dayData.tasks.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                          {dayData.tasks.map((task) => (
                            <motion.div
                              key={task._id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              onClick={() => setSelectedTask(task)}
                              className={cn(
                                'p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.02]',
                                'bg-linear-to-r from-muted/50 to-transparent',
                                'border border-border/50 hover:border-border'
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className="w-3 h-3 rounded-full shrink-0 mt-0.5 ring-2 ring-offset-2 ring-offset-background"
                                  style={{ backgroundColor: getProjectColor(task), boxShadow: `0 0 8px ${getProjectColor(task)}40` }}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className={cn(
                                    'text-sm font-medium truncate',
                                    task.isCompleted && 'line-through text-muted-foreground'
                                  )}>
                                    {task.title}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge
                                      variant="secondary"
                                      className={cn('text-xs', priorityColors[task.priority]?.bg, priorityColors[task.priority]?.text)}
                                    >
                                      {task.priority}
                                    </Badge>
                                    {isOverdue(task) && (
                                      <span className="text-xs text-red-500 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        Overdue
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          <p className="text-sm">No tasks scheduled</p>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={openCreateModalForCurrentView}
                            className="mt-1"
                          >
                            Add a task
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Google Calendar Events */}
                    {isGoogleConnected && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center gap-2 mb-3">
                          <svg viewBox="0 0 24 24" className="w-4 h-4">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                          </svg>
                          <h3 className="font-semibold text-sm">Google Calendar</h3>
                          <Badge variant="secondary" className="ml-auto bg-blue-500/10 text-blue-600">
                            {dayData.googleEvents.length}
                          </Badge>
                        </div>

                        {dayData.googleEvents.length > 0 ? (
                          <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                            {dayData.googleEvents.map((event) => (
                              <motion.div
                                key={event.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                onClick={() => event.htmlLink && window.open(event.htmlLink, '_blank')}
                                className={cn(
                                  'p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.02]',
                                  'bg-blue-500/5 border border-blue-500/20 hover:border-blue-500/40'
                                )}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="w-3 h-3 rounded-full shrink-0 mt-0.5 bg-blue-500 ring-2 ring-offset-2 ring-offset-background ring-blue-500/30" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{event.title}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Clock className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">
                                        {event.isAllDay ? 'All day' : formatEventTime(event.start)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            <p className="text-sm">No events scheduled</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>

                  {/* Day Timeline */}
                  <Card className="flex-1 overflow-hidden bg-card/50 backdrop-blur">
                    <div className="h-full overflow-y-auto">
                      {/* All day section */}
                      <div className="flex border-b sticky top-0 bg-card z-10">
                        <div className="w-20 shrink-0 text-xs text-muted-foreground px-3 py-3 font-medium">
                          All day
                        </div>
                        <div className="flex-1 min-h-[48px] border-l bg-muted/20"></div>
                      </div>

                      {/* Hours */}
                      {hours.map((hour) => (
                        <div key={hour} className="flex border-b border-border/50 group">
                          <div className="w-20 shrink-0 text-xs text-muted-foreground px-3 py-2 font-medium">
                            {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                          </div>
                          <div className="flex-1 h-16 border-l relative group-hover:bg-muted/20 transition-colors">
                            {/* Current time indicator */}
                            {dayData.isToday && new Date().getHours() === hour && (
                              <div
                                className="absolute left-0 right-0 flex items-center z-10"
                                style={{ top: `${(new Date().getMinutes() / 60) * 100}%` }}
                              >
                                <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50 -ml-1.5" />
                                <div className="flex-1 h-0.5 bg-red-500" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}

              {/* WEEK VIEW */}
              {viewMode === 'week' && (
                <Card className="flex flex-col h-full overflow-hidden bg-card/50 backdrop-blur">
                  {/* Week Header */}
                  <div className="grid grid-cols-8 border-b shrink-0 bg-muted/30">
                    <div className="w-20" />
                    {weekDays.map((day, index) => (
                      <div
                        key={index}
                        className={cn(
                          'text-center py-3 border-l transition-colors',
                          day.isToday && 'bg-primary/5'
                        )}
                      >
                        <div className="text-xs text-muted-foreground font-medium mb-1">
                          {DAYS_FULL[day.date.getDay()]}
                        </div>
                        <div className={cn(
                          'w-10 h-10 mx-auto rounded-full flex items-center justify-center text-lg font-semibold transition-all',
                          day.isToday
                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                            : 'hover:bg-muted'
                        )}>
                          {day.date.getDate()}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Week Grid */}
                  <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-8">
                      {/* All day row */}
                      <div className="w-20 text-xs text-muted-foreground px-3 py-3 border-b font-medium sticky left-0 bg-card">
                        All day
                      </div>
                      {weekDays.map((day, index) => (
                        <div key={index} className={cn(
                          'min-h-[60px] border-l border-b p-1',
                          day.isToday && 'bg-primary/5'
                        )}>
                          {/* Google Calendar Events */}
                          {day.googleEvents.slice(0, 2).map((event) => (
                            <div
                              key={event.id}
                              onClick={() => event.htmlLink && window.open(event.htmlLink, '_blank')}
                              className="text-xs px-2 py-1 mb-1 rounded-lg truncate cursor-pointer transition-all hover:scale-[1.02] bg-blue-500/20 text-blue-600 border-l-[3px] border-blue-500"
                            >
                              {event.title}
                            </div>
                          ))}
                          {/* Tasks */}
                          {day.tasks.slice(0, day.googleEvents.length > 0 ? 1 : 3).map((task) => (
                            <div
                              key={task._id}
                              onClick={() => setSelectedTask(task)}
                              className="text-xs px-2 py-1 mb-1 rounded-lg truncate cursor-pointer transition-all hover:scale-[1.02]"
                              style={{
                                backgroundColor: `${getProjectColor(task)}20`,
                                color: getProjectColor(task),
                                borderLeft: `3px solid ${getProjectColor(task)}`
                              }}
                            >
                              {task.title}
                            </div>
                          ))}
                          {(day.tasks.length + day.googleEvents.length) > 3 && (
                            <div className="text-xs text-muted-foreground px-2">
                              +{(day.tasks.length + day.googleEvents.length) - 3} more
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Hour rows */}
                      {hours.map((hour) => (
                        <div key={`hour-row-${hour}`} className="contents">
                          <div className="w-20 text-xs text-muted-foreground px-3 py-2 border-b font-medium sticky left-0 bg-card">
                            {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                          </div>
                          {weekDays.map((day, index) => (
                            <div
                              key={`${hour}-${index}`}
                              className={cn(
                                'h-14 border-l border-b border-border/50 relative transition-colors',
                                day.isToday && 'bg-primary/5',
                                'hover:bg-muted/30'
                              )}
                            >
                              {/* Current time indicator */}
                              {day.isToday && new Date().getHours() === hour && (
                                <div
                                  className="absolute left-0 right-0 flex items-center z-10"
                                  style={{ top: `${(new Date().getMinutes() / 60) * 100}%` }}
                                >
                                  <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50 -ml-1.5" />
                                  <div className="flex-1 h-0.5 bg-red-500" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}

              {/* MONTH VIEW */}
              {viewMode === 'month' && (
                <Card className="flex flex-col h-full overflow-hidden bg-card/50 backdrop-blur">
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 border-b shrink-0 bg-muted/30">
                    {DAYS_FULL.map(day => (
                      <div
                        key={day}
                        className="text-center text-sm font-semibold text-muted-foreground py-3"
                      >
                        <span className="hidden sm:inline">{day}</span>
                        <span className="sm:hidden">{day.charAt(0)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid - 6 rows */}
                  <div className="grid grid-cols-7 grid-rows-6 flex-1 overflow-hidden">
                    {calendarDays.map((day, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.01 }}
                        className={cn(
                          'relative border-r border-b min-h-0 overflow-hidden transition-colors',
                          !day.isCurrentMonth && 'bg-muted/30',
                          day.isToday && 'bg-primary/5 ring-1 ring-inset ring-primary/20'
                        )}
                      >
                        {/* Date Number */}
                        <div className="flex justify-between items-start p-1 sm:p-2">
                          <span
                            className={cn(
                              'text-xs sm:text-sm font-medium w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full transition-all',
                              !day.isCurrentMonth && 'text-muted-foreground/50',
                              day.isToday && 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                            )}
                          >
                            {day.date.getDate()}
                          </span>
                          {(day.tasks.length > 0 || day.googleEvents.length > 0) && (
                            <div className="hidden sm:flex gap-1">
                              {day.tasks.length > 0 && (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                  {day.tasks.length}
                                </Badge>
                              )}
                              {day.googleEvents.length > 0 && (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-blue-500/10 text-blue-600">
                                  {day.googleEvents.length}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Tasks & Google Events */}
                        <div className="px-1 space-y-0.5 overflow-hidden pb-1">
                          {/* Google Calendar Events */}
                          {day.googleEvents.slice(0, 2).map((event) => (
                            <div
                              key={event.id}
                              onClick={() => event.htmlLink && window.open(event.htmlLink, '_blank')}
                              className={cn(
                                'flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs cursor-pointer truncate',
                                'hover:scale-[1.02] transition-all bg-blue-500/10 border-l-2 border-blue-500'
                              )}
                            >
                              <span className="truncate text-blue-700 dark:text-blue-400 font-medium">
                                {event.title}
                              </span>
                            </div>
                          ))}
                          {/* Tasks */}
                          {day.tasks.slice(0, day.googleEvents.length > 0 ? 1 : 3).map((task) => (
                            <div
                              key={task._id}
                              onClick={() => setSelectedTask(task)}
                              className={cn(
                                'flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs cursor-pointer truncate',
                                'hover:scale-[1.02] transition-all',
                                task.isCompleted && 'opacity-50'
                              )}
                              style={{
                                backgroundColor: `${getProjectColor(task)}15`,
                                borderLeft: `2px solid ${getProjectColor(task)}`,
                              }}
                            >
                              <span className="truncate text-foreground font-medium">
                                {task.title}
                              </span>
                            </div>
                          ))}
                          {(day.tasks.length + day.googleEvents.length) > 3 && (
                            <div className="text-[10px] text-muted-foreground px-1.5 sm:px-2 font-medium">
                              +{(day.tasks.length + day.googleEvents.length) - 3} more
                            </div>
                          )}
                        </div>

                        {/* Mobile task/event indicator dots */}
                        {(day.tasks.length > 0 || day.googleEvents.length > 0) && (
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 sm:hidden">
                            {day.googleEvents.slice(0, 2).map((_, i) => (
                              <div
                                key={`g-${i}`}
                                className="w-1.5 h-1.5 rounded-full bg-blue-500"
                              />
                            ))}
                            {day.tasks.slice(0, 3 - day.googleEvents.length).map((task, i) => (
                              <div
                                key={`t-${i}`}
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: getProjectColor(task) }}
                              />
                            ))}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Task Modal */}
      <TaskModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onOpenTask={setSelectedTask}
        onClose={() => {
          setSelectedTask(null);
          fetchTasks();
        }}
      />

      {/* Create Task Modal with Project Selector */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={handleCreateModalClose}
        showProjectSelector={true}
        initialDueDate={createInitialDueDate}
      />
    </div>
  );
}
