'use client';

import { useMemo, useState } from 'react';
import {
  Plus,
  CheckCircle2,
  Circle,
  ChevronUp,
  ChevronDown,
  Calendar,
} from 'lucide-react';
import { Task, Section, InboxStats } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface InboxChartsViewProps {
  tasks: Task[];
  sections: Section[];
  stats: InboxStats | null;
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

// Simple Donut Chart component
function DonutChart({
  total,
  completed,
  label,
}: {
  total: number;
  completed: number;
  label: string;
}) {
  const remaining = total - completed;
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-40">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-muted/30"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            className="text-primary"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold">{remaining}</span>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
      </div>
    </div>
  );
}

// Simple Bar Chart component
function BarChart({
  data,
  title,
}: {
  data: Array<{
    label: string;
    notStarted: number;
    inProgress: number;
    late: number;
    completed: number;
    total: number;
  }>;
  title: string;
}) {
  const maxValue = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">{title}</h3>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground truncate max-w-[120px]">
                {item.label.length > 10 ? `${item.label.slice(0, 10)}...` : item.label}
              </span>
              <span className="font-medium">{item.total}</span>
            </div>
            <div className="h-6 bg-muted/30 rounded-sm flex overflow-hidden">
              {item.notStarted > 0 && (
                <div
                  className="bg-muted-foreground/40 h-full"
                  style={{ width: `${(item.notStarted / maxValue) * 100}%` }}
                />
              )}
              {item.inProgress > 0 && (
                <div
                  className="bg-blue-500 h-full"
                  style={{ width: `${(item.inProgress / maxValue) * 100}%` }}
                />
              )}
              {item.late > 0 && (
                <div
                  className="bg-red-500 h-full"
                  style={{ width: `${(item.late / maxValue) * 100}%` }}
                />
              )}
              {item.completed > 0 && (
                <div
                  className="bg-green-500 h-full"
                  style={{ width: `${(item.completed / maxValue) * 100}%` }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-muted-foreground/40 rounded-sm" />
          <span>Not Started</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded-sm" />
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded-sm" />
          <span>Late</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded-sm" />
          <span>Completed</span>
        </div>
      </div>
    </div>
  );
}

// Members Chart
function MembersChart({
  data,
}: {
  data: Array<{
    name: string;
    avatar?: string;
    total: number;
  }>;
}) {
  const maxValue = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Members</h3>
      <div className="space-y-3">
        {data.map((member, index) => (
          <div key={index} className="flex items-center gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={member.avatar} />
              <AvatarFallback className="text-xs">
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="truncate">{member.name}</span>
                <span className="font-medium">{member.total}</span>
              </div>
              <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(member.total / maxValue) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <p className="text-sm text-muted-foreground">No assigned tasks</p>
        )}
      </div>
    </div>
  );
}

export function InboxChartsView({
  tasks,
  sections,
  stats,
  onTaskClick,
  onToggleComplete,
  onAddTask,
}: InboxChartsViewProps) {
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

  // Prepare chart data
  const bucketData = useMemo(() => {
    if (!stats) return [];
    return stats.buckets.map((b) => ({
      label: b.bucket,
      notStarted: b.notStarted,
      inProgress: b.inProgress,
      late: b.late,
      completed: b.completed,
      total: b.total,
    }));
  }, [stats]);

  const priorityData = useMemo(() => {
    if (!stats) return [];
    return stats.priorities.map((p) => ({
      label: p.label,
      notStarted: p.notStarted,
      inProgress: p.inProgress,
      late: p.late,
      completed: p.completed,
      total: p.total,
    }));
  }, [stats]);

  const membersData = useMemo(() => {
    if (!stats) return [];
    return stats.members.map((m) => ({
      name: m.name,
      avatar: m.avatar,
      total: m.total,
    }));
  }, [stats]);

  return (
    <div className="flex h-full">
      {/* Charts Area */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Status Donut Chart */}
          <div className="bg-card border rounded-xl p-6">
            <h3 className="font-semibold mb-4">Status</h3>
            <DonutChart
              total={stats?.summary.total || 0}
              completed={stats?.summary.completed || 0}
              label="Tasks left"
            />
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Not start...</span>
                <span className="font-medium">{stats?.summary.notStarted || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">In progress</span>
                <span className="font-medium">{stats?.summary.inProgress || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Late</span>
                <span className="font-medium">{stats?.summary.late || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium">{stats?.summary.completed || 0}</span>
              </div>
            </div>
          </div>

          {/* Bucket Bar Chart */}
          <div className="bg-card border rounded-xl p-6">
            <BarChart data={bucketData} title="Bucket" />
          </div>

          {/* Priority Bar Chart */}
          <div className="bg-card border rounded-xl p-6">
            <BarChart data={priorityData} title="Priority" />
          </div>
        </div>

        {/* Members Section */}
        <div className="bg-card border rounded-xl p-6 max-w-2xl">
          <MembersChart data={membersData} />
        </div>
      </div>

      {/* Sidebar - Tasks by Section */}
      <div className="w-[320px] border-l flex flex-col overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Tasks</h3>
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
            const sectionTasks = tasksBySection.get(section._id) || [];
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
                      No tasks
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
