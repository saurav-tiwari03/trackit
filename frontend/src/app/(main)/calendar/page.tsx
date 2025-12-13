'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tasksAPI } from '@/lib/api';
import { Task } from '@/types';
import { cn } from '@/lib/utils';
import { useProjectsStore } from '@/store/projects';
import { TaskModal } from '@/components/task/task-modal';
import { CreateTaskModal } from '@/components/task/create-task-modal';

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
}

export default function CalendarPage() {
  const { projects } = useProjectsStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

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
      });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        tasks: getTasksForDate(date),
      });
    }
    
    for (let i = 1; i <= nextMonthDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        tasks: getTasksForDate(date),
      });
    }
    
    return days;
  }, [currentDate, tasks]);

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
      });
    }
    
    return days;
  }, [currentDate, tasks]);

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
    };
  }, [currentDate, tasks]);

  // Mini calendar for day view
  const miniCalendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay();
    
    const days: { date: Date; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean }[] = [];
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
      });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        isSelected: date.getTime() === selected.getTime(),
      });
    }
    
    for (let i = 1; i <= nextMonthDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        isSelected: date.getTime() === selected.getTime(),
      });
    }
    
    return days;
  }, [currentDate]);

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
    fetchTasks();
  };

  // Hours for day/week view
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon-sm"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        
        {/* View Mode Tabs - Pill Style */}
        <div className="flex items-center bg-muted/50 rounded-full p-0.5">
          {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={cn(
                'px-5 py-1.5 text-sm font-medium rounded-full transition-all capitalize cursor-pointer',
                viewMode === mode
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="w-10" />
      </div>

      {/* Title and Navigation */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold">{getHeaderTitle()}</h1>
          {getSubtitle() && (
            <p className="text-muted-foreground">{getSubtitle()}</p>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate('prev')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={goToToday}
            className="rounded-full px-4"
          >
            Today
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => navigate('next')}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 px-6 pb-4 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <motion.div
            key={viewMode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full flex flex-col"
          >
            {/* DAY VIEW */}
            {viewMode === 'day' && (
              <div className="flex h-full gap-6">
                {/* Mini Calendar */}
                <div className="w-64 shrink-0">
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {DAYS_SHORT.map((day, i) => (
                      <div key={i} className="text-center text-xs text-muted-foreground py-1">
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
                          'aspect-square flex items-center justify-center text-sm rounded-full cursor-pointer transition-colors',
                          !day.isCurrentMonth && 'text-muted-foreground',
                          day.isToday && 'bg-red-500 text-white',
                          day.isSelected && !day.isToday && 'bg-primary/20 text-primary',
                          !day.isToday && !day.isSelected && 'hover:bg-muted'
                        )}
                      >
                        {day.date.getDate()}
                      </button>
                    ))}
                  </div>
                  
                  {/* Event Details */}
                  <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                    {dayData.tasks.length > 0 ? (
                      <div className="space-y-2">
                        {dayData.tasks.map((task) => (
                          <div
                            key={task._id}
                            onClick={() => setSelectedTask(task)}
                            className="p-2 bg-card rounded cursor-pointer hover:bg-accent transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: getProjectColor(task) }}
                              />
                              <span className="text-sm truncate">{task.title}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center">No Event Selected</p>
                    )}
                  </div>
                </div>
                
                {/* Day Timeline */}
                <div className="flex-1 overflow-y-auto border-l border-border">
                  <div className="relative">
                    {/* All day section */}
                    <div className="flex border-b border-border">
                      <div className="w-16 shrink-0 text-xs text-muted-foreground px-2 py-2">
                        all-day
                      </div>
                      <div className="flex-1 min-h-[40px] border-l border-border"></div>
                    </div>
                    
                    {/* Hours */}
                    {hours.map((hour) => (
                      <div key={hour} className="flex border-b border-border">
                        <div className="w-16 shrink-0 text-xs text-muted-foreground px-2 py-2">
                          {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                        </div>
                        <div className="flex-1 h-16 border-l border-border relative">
                          {/* Current time indicator */}
                          {dayData.isToday && new Date().getHours() === hour && (
                            <div 
                              className="absolute left-0 right-0 flex items-center"
                              style={{ top: `${(new Date().getMinutes() / 60) * 100}%` }}
                            >
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                              <div className="flex-1 h-0.5 bg-red-500" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* WEEK VIEW */}
            {viewMode === 'week' && (
              <div className="flex flex-col h-full">
                {/* Week Header */}
                <div className="grid grid-cols-8 border-b border-border shrink-0">
                  <div className="w-16" />
                  {weekDays.map((day, index) => (
                    <div
                      key={index}
                      className="text-center py-2 border-l border-border"
                    >
                      <div className="text-sm text-muted-foreground">
                        {DAYS_FULL[day.date.getDay()]} {day.date.getDate()}
                      </div>
                      {day.isToday && (
                        <div className="w-8 h-8 mx-auto rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-medium">
                          {day.date.getDate()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Week Grid */}
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-8">
                    {/* All day row */}
                    <div className="w-16 text-xs text-muted-foreground px-2 py-2 border-b border-border">
                      all-day
                    </div>
                    {weekDays.map((day, index) => (
                      <div key={index} className="min-h-[40px] border-l border-b border-border">
                        {day.tasks.slice(0, 2).map((task) => (
                          <div
                            key={task._id}
                            onClick={() => setSelectedTask(task)}
                            className="text-xs px-1 py-0.5 m-0.5 rounded truncate cursor-pointer"
                            style={{ backgroundColor: `${getProjectColor(task)}30`, color: getProjectColor(task) }}
                          >
                            {task.title}
                          </div>
                        ))}
                      </div>
                    ))}
                    
                    {/* Hour rows */}
                    {hours.map((hour) => (
                      <>
                        <div key={`label-${hour}`} className="w-16 text-xs text-muted-foreground px-2 py-2 border-b border-border">
                          {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                        </div>
                        {weekDays.map((day, index) => (
                          <div 
                            key={`${hour}-${index}`} 
                            className="h-12 border-l border-b border-border relative"
                          >
                            {/* Current time indicator */}
                            {day.isToday && new Date().getHours() === hour && (
                              <div 
                                className="absolute left-0 right-0 flex items-center z-10"
                                style={{ top: `${(new Date().getMinutes() / 60) * 100}%` }}
                              >
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                <div className="flex-1 h-0.5 bg-red-500" />
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* MONTH VIEW */}
            {viewMode === 'month' && (
              <>
                {/* Day Headers */}
                <div className="grid grid-cols-7 border-b border-border shrink-0">
                  {DAYS_FULL.map(day => (
                    <div
                      key={day}
                      className="text-center text-sm font-medium text-muted-foreground py-3"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid - 6 rows */}
                <div className="grid grid-cols-7 grid-rows-6 flex-1 border-l border-border">
                  {calendarDays.map((day, index) => (
                    <div
                      key={index}
                      className={cn(
                        'relative border-r border-b border-border min-h-0 overflow-hidden',
                        !day.isCurrentMonth && 'bg-muted/20'
                      )}
                    >
                      {/* Date Number */}
                      <div className="flex justify-end p-2">
                        <span
                          className={cn(
                            'text-sm font-medium',
                            !day.isCurrentMonth && 'text-muted-foreground',
                            day.isToday && 'flex items-center justify-center w-7 h-7 rounded-full bg-red-500 text-white'
                          )}
                        >
                          {formatDayLabel(day)}
                        </span>
                      </div>

                      {/* Tasks */}
                      <div className="px-1 space-y-0.5 overflow-hidden">
                        {day.tasks.slice(0, 4).map((task) => (
                          <div
                            key={task._id}
                            onClick={() => setSelectedTask(task)}
                            className={cn(
                              'flex items-center gap-1.5 px-2 py-0.5 rounded text-xs cursor-pointer truncate',
                              'hover:opacity-80 transition-opacity'
                            )}
                            style={{
                              backgroundColor: `${getProjectColor(task)}20`,
                            }}
                          >
                            <div
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: getProjectColor(task) }}
                            />
                            <span className="truncate text-foreground">
                              {task.title}
                            </span>
                          </div>
                        ))}
                        {day.tasks.length > 4 && (
                          <div className="text-xs text-muted-foreground px-2 py-0.5">
                            +{day.tasks.length - 4} more
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </div>

      {/* Task Modal */}
      <TaskModal
        task={selectedTask}
        isOpen={!!selectedTask}
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
      />
    </div>
  );
}
