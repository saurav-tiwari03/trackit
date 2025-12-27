'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Calendar,
  Flame,
  Target,
  Star,
  Award,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { tasksAPI } from '@/lib/api';
import { Task, Project } from '@/types';
import { cn } from '@/lib/utils';
import { useProjectsStore } from '@/store/projects';

interface GroupedTasks {
  project: Project;
  tasks: Task[];
}

export default function AchievementsPage() {
  const { projects } = useProjectsStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCompletedTasks();
  }, []);

  const fetchCompletedTasks = async () => {
    setIsLoading(true);
    try {
      const response = await tasksAPI.getAll({ status: 'completed' });
      // Filter only completed tasks
      const completedTasks = response.data.data.filter((task: Task) => task.isCompleted);
      setTasks(completedTasks);
      // Expand all projects by default
      const projectIds = new Set(
        completedTasks.map((task: Task) =>
          typeof task.project === 'string' ? task.project : task.project._id
        )
      );
      setExpandedProjects(projectIds);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Group tasks by project
  const groupedTasks = useMemo(() => {
    const groups: Map<string, GroupedTasks> = new Map();

    tasks.forEach((task) => {
      const projectId = typeof task.project === 'string' ? task.project : task.project._id;
      const project =
        typeof task.project === 'string'
          ? projects.find((p) => p._id === task.project)
          : task.project;

      if (!project) return;

      if (!groups.has(projectId)) {
        groups.set(projectId, {
          project: project as Project,
          tasks: [],
        });
      }

      groups.get(projectId)!.tasks.push(task);
    });

    // Sort tasks within each group by completedAt date (most recent first)
    groups.forEach((group) => {
      group.tasks.sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return dateB - dateA;
      });
    });

    return Array.from(groups.values());
  }, [tasks, projects]);

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;
    let subtasksCount = 0;

    tasks.forEach((task) => {
      const completedDate = task.completedAt ? new Date(task.completedAt) : null;
      if (completedDate) {
        completedDate.setHours(0, 0, 0, 0);
        if (completedDate.getTime() === today.getTime()) todayCount++;
        if (completedDate >= thisWeekStart) weekCount++;
        if (completedDate >= thisMonthStart) monthCount++;
      }
      subtasksCount += task.subtasks?.filter((s) => s.isCompleted).length || 0;
    });

    return {
      total: tasks.length,
      today: todayCount,
      week: weekCount,
      month: monthCount,
      subtasks: subtasksCount,
    };
  }, [tasks]);

  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const toggleTask = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const statCards = [
    {
      icon: Trophy,
      label: 'Total Completed',
      value: stats.total,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
    },
    {
      icon: Flame,
      label: 'Completed Today',
      value: stats.today,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
    },
    {
      icon: Target,
      label: 'This Week',
      value: stats.week,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      icon: Star,
      label: 'This Month',
      value: stats.month,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/10">
            <Trophy className="w-6 h-6 text-yellow-500" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Achievements</h1>
            <p className="text-sm text-muted-foreground">
              Your completed tasks and accomplishments
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg', stat.bg)}>
                      <stat.icon className={cn('w-5 h-5', stat.color)} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Achievements List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Completed Tasks by Project
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Loading achievements...</p>
                  </div>
                </div>
              ) : groupedTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Trophy className="w-16 h-16 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No completed tasks yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Complete your first task to see it appear here as an achievement!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedTasks.map((group) => (
                    <div
                      key={group.project._id}
                      className="border rounded-lg overflow-hidden"
                    >
                      {/* Project Header */}
                      <button
                        onClick={() => toggleProject(group.project._id)}
                        className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: group.project.color }}
                        />
                        <span className="font-semibold flex-1 text-left">
                          {group.project.name}
                        </span>
                        <Badge variant="secondary" className="mr-2">
                          {group.tasks.length} task{group.tasks.length !== 1 ? 's' : ''}
                        </Badge>
                        {expandedProjects.has(group.project._id) ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>

                      {/* Tasks List */}
                      <AnimatePresence>
                        {expandedProjects.has(group.project._id) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t bg-muted/20">
                              {group.tasks.map((task, taskIndex) => {
                                const hasSubtasks =
                                  task.subtasks && task.subtasks.length > 0;
                                const completedSubtasks =
                                  task.subtasks?.filter((s) => s.isCompleted) || [];
                                const isExpanded = expandedTasks.has(task._id);

                                return (
                                  <div
                                    key={task._id}
                                    className={cn(
                                      'border-b last:border-b-0',
                                      taskIndex % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                                    )}
                                  >
                                    {/* Task Row */}
                                    <div
                                      className={cn(
                                        'flex items-center gap-3 px-4 py-3',
                                        hasSubtasks && 'cursor-pointer hover:bg-muted/30'
                                      )}
                                      onClick={() => hasSubtasks && toggleTask(task._id)}
                                    >
                                      <div className="w-6 flex justify-center">
                                        {hasSubtasks ? (
                                          isExpanded ? (
                                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                          ) : (
                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                          )
                                        ) : (
                                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{task.title}</p>
                                        {hasSubtasks && (
                                          <p className="text-xs text-muted-foreground">
                                            {completedSubtasks.length} of {task.subtasks.length}{' '}
                                            subtasks completed
                                          </p>
                                        )}
                                      </div>
                                      {task.completedAt && (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                          <Calendar className="w-3 h-3" />
                                          {formatDate(task.completedAt)}
                                        </div>
                                      )}
                                    </div>

                                    {/* Subtasks */}
                                    <AnimatePresence>
                                      {isExpanded && hasSubtasks && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.15 }}
                                          className="overflow-hidden"
                                        >
                                          <div className="pl-10 pr-4 pb-3 space-y-1">
                                            {task.subtasks.map((subtask) => (
                                              <div
                                                key={subtask._id}
                                                className={cn(
                                                  'flex items-center gap-2 py-1.5 px-3 rounded-md',
                                                  subtask.isCompleted
                                                    ? 'bg-green-500/5'
                                                    : 'bg-muted/30'
                                                )}
                                              >
                                                <CheckCircle2
                                                  className={cn(
                                                    'w-3.5 h-3.5 shrink-0',
                                                    subtask.isCompleted
                                                      ? 'text-green-500'
                                                      : 'text-muted-foreground'
                                                  )}
                                                />
                                                <span
                                                  className={cn(
                                                    'text-sm',
                                                    subtask.isCompleted
                                                      ? 'text-foreground'
                                                      : 'text-muted-foreground'
                                                  )}
                                                >
                                                  {subtask.title}
                                                </span>
                                                {subtask.isCompleted && (
                                                  <Badge
                                                    variant="secondary"
                                                    className="ml-auto text-[10px] bg-green-500/10 text-green-600"
                                                  >
                                                    Done
                                                  </Badge>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Summary */}
        {stats.subtasks > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-linear-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="font-semibold text-green-700 dark:text-green-400">
                      {stats.subtasks} subtasks completed!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Across all your projects
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
