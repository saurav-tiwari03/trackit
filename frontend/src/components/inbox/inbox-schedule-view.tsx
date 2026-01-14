'use client';

import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
} from 'lucide-react';
import { Task, Section } from '@/types';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface InboxScheduleViewProps {
  tasks: Task[];
  sections: Section[];
  onTaskClick: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onAddTask: () => void;
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function InboxScheduleView({
  tasks,
  sections,
  onTaskClick,
  onToggleComplete,
  onAddTask,
}: InboxScheduleViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [hideFutureRecurring, setHideFutureRecurring] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map((s) => s._id))
  );

  // Group tasks by section for the sidebar
  const tasksBySection = useMemo(() => {
    const grouped = new Map<string, Task[]>();
    sections.forEach((s) => grouped.set(s._id, []));

    tasks.forEach((task) => {
      const sectionTasks = grouped.get(task.section) || [];
      sectionTasks.push(task);
      grouped.set(task.section, sectionTasks);
    });

    return grouped;
  }, [tasks, sections]);

  // Get unscheduled tasks (no start or due date)
  const unscheduledTasks = useMemo(() => {
    return tasks.filter((t) => !t.startDate && !t.dueDate);
  }, [tasks]);

  // Get tasks with dates for the calendar
  const scheduledTasks = useMemo(() => {
    return tasks.filter((t) => t.startDate || t.dueDate);
  }, [tasks]);

  // Get tasks for a specific day
  const getTasksForDay = (day: Date) => {
    return scheduledTasks.filter((task) => {
      const startDate = task.startDate ? new Date(task.startDate) : null;
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;

      if (startDate && dueDate) {
        // Task spans multiple days
        return day >= startDate && day <= dueDate;
      }

      if (startDate) {
        return isSameDay(startDate, day);
      }

      if (dueDate) {
        return isSameDay(dueDate, day);
      }

      return false;
    });
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  return (
    <div className="flex h-full">
      {/* Calendar Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Calendar Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <button className="flex items-center gap-1 px-2 py-1 text-sm font-medium hover:bg-muted/30 rounded">
              {format(currentDate, 'MMMM yyyy')}
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Hide future recurring tasks</span>
              <Switch
                checked={hideFutureRecurring}
                onCheckedChange={setHideFutureRecurring}
              />
            </div>
            <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
              <Button
                variant={viewMode === 'week' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('week')}
              >
                Week
              </Button>
              <Button
                variant={viewMode === 'month' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
              >
                Month
              </Button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto p-4">
          {/* Week Day Headers */}
          <div className="grid grid-cols-7 gap-px mb-1">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-xs font-medium text-muted-foreground text-center py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-px border rounded-lg overflow-hidden">
            {calendarDays.map((day) => {
              const dayTasks = getTasksForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'min-h-[100px] p-2 border-b border-r',
                    !isCurrentMonth && 'bg-muted/20 text-muted-foreground',
                    isCurrentDay && 'bg-primary/5'
                  )}
                >
                  <div
                    className={cn(
                      'text-sm font-medium mb-1',
                      isCurrentDay &&
                        'inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground'
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((task) => (
                      <div
                        key={task._id}
                        onClick={() => onTaskClick(task)}
                        className="text-xs p-1 bg-primary/20 text-primary rounded truncate cursor-pointer hover:bg-primary/30 transition-colors"
                      >
                        {task.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sidebar - Unscheduled Tasks */}
      <div className="w-[320px] border-l flex flex-col overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Unscheduled tasks</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Add Task Button */}
          <button
            onClick={onAddTask}
            className="flex items-center gap-2 w-full px-3 py-2 mb-4 text-sm text-primary hover:bg-muted/30 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add task</span>
          </button>

          {/* Sections with Tasks */}
          {sections.map((section) => {
            const sectionTasks = (tasksBySection.get(section._id) || []).filter(
              (t) => !t.startDate && !t.dueDate
            );
            const isExpanded = expandedSections.has(section._id);

            return (
              <Collapsible
                key={section._id}
                open={isExpanded}
                onOpenChange={() => toggleSection(section._id)}
                className="mb-2"
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/30 rounded px-2">
                  <span>{section.name}</span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-1">
                  {sectionTasks.map((task) => {
                    const completedSubtasks = task.subtaskCompletedCount ?? 0;
                    const totalSubtasks = task.subtaskCount ?? 0;

                    return (
                      <div
                        key={task._id}
                        onClick={() => onTaskClick(task)}
                        className="bg-card border rounded-lg p-3 cursor-pointer hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleComplete(task);
                            }}
                            className="mt-0.5 shrink-0"
                          >
                            {task.isCompleted ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                          <span
                            className={cn(
                              'text-sm font-medium flex-1',
                              task.isCompleted && 'line-through text-muted-foreground'
                            )}
                          >
                            {task.title}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pl-6 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>
                              {completedSubtasks} / {totalSubtasks}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Due</span>
                          </div>
                          {task.assignee && (
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={task.assignee.avatar} />
                              <AvatarFallback className="text-[8px]">
                                {getInitials(task.assignee.name)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {sectionTasks.length === 0 && (
                    <p className="text-xs text-muted-foreground px-2 py-1">
                      No unscheduled tasks
                    </p>
                  )}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </div>
    </div>
  );
}
