'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  Plus,
  Film,
  Star,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DotBackgroundDemo from '@/components/ui/dot-background-demo';
import { StreakChart } from '@/components/charts/streak-chart';
import { RecentNotes } from '@/components/dashboard/recent-notes';
import { useProjectsStore } from '@/store/projects';
import { tasksAPI, moviesAPI } from '@/lib/api';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const statsConfig = [
  {
    label: 'Open Tasks',
    key: 'open',
    icon: Clock,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    label: 'Overdue',
    key: 'overdue',
    icon: AlertCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  {
    label: 'In Progress',
    key: 'inProgress',
    icon: TrendingUp,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    label: 'Completed',
    key: 'completed',
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
];

interface ProjectProgress {
  projectId: string;
  totalTasks: number;
  completedTasks: number;
  totalItems: number; // Tasks + Subtasks
  completedItems: number; // Completed Tasks + Completed Subtasks
  inProgress: number;
}

interface MovieStats {
  total: number;
  watched: number;
  watching: number;
  watchlist: number;
  thisMonth: number;
}

export default function DashboardPage() {
  const { stats, projects, fetchStats } = useProjectsStore();
  const [projectProgress, setProjectProgress] = useState<Record<string, ProjectProgress>>({});
  const [movieStats, setMovieStats] = useState<MovieStats | null>(null);

  const fetchProjectProgress = useCallback(async () => {
    try {
      const response = await tasksAPI.getAll();
      const tasks = response.data.data;

      const progress: Record<string, ProjectProgress> = {};
      tasks.forEach((task: any) => {
        const projectId = typeof task.project === 'string' ? task.project : task.project._id;
        if (!progress[projectId]) {
          progress[projectId] = {
            projectId,
            totalTasks: 0,
            completedTasks: 0,
            totalItems: 0,
            completedItems: 0,
            inProgress: 0
          };
        }

        // Count the task
        progress[projectId].totalTasks++;

        if (task.isCompleted) {
          progress[projectId].completedTasks++;
        } else if (task.status === 'in_progress') {
          progress[projectId].inProgress++;
        }

        const subtasks = task.subtasks || [];
        
        // If task has subtasks, count only subtasks as units
        // If task has no subtasks, count the task itself as 1 unit
        if (subtasks.length > 0) {
          subtasks.forEach((subtask: any) => {
            progress[projectId].totalItems++;
            if (subtask.isCompleted) {
              progress[projectId].completedItems++;
            }
          });
        } else {
          // No subtasks - count task as 1 unit
          progress[projectId].totalItems++;
          if (task.isCompleted) {
            progress[projectId].completedItems++;
          }
        }
      });
      setProjectProgress(progress);
    } catch (error) {
      console.error('Failed to fetch project progress:', error);
    }
  }, []);

  const fetchMovieStats = useCallback(async () => {
    try {
      const response = await moviesAPI.getStats();
      setMovieStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch movie stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    void fetchProjectProgress();
    void fetchMovieStats();
  }, [fetchStats, fetchProjectProgress, fetchMovieStats]);

  const getProgressPercentage = (projectId: string) => {
    const progress = projectProgress[projectId];
    if (!progress || progress.totalItems === 0) return 0;
    return Math.round((progress.completedItems / progress.totalItems) * 100);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="relative z-0 overflow-hidden border-b">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-80">
          <div className="h-full w-full translate-y-32">
            <DotBackgroundDemo />
          </div>
        </div>
        <div className="relative z-10 px-6 py-4 bg-background/40 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome back! Here's your overview.</p>
            </div>
            <Button asChild>
              <Link href="/projects/new">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {statsConfig.map((stat, index) => {
            const value = stats?.[stat.key as keyof typeof stats] || 0;
            return (
              <motion.div
                key={stat.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className={cn('p-1.5 rounded-lg', stat.bgColor)}>
                            <stat.icon className={cn('w-4 h-4', stat.color)} />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {stat.label}
                          </span>
                        </div>
                        <p className="text-3xl font-bold">
                          {value.toString().padStart(2, '0')}
                        </p>
                      </div>
                      <div className="w-16 h-12">
                        <svg viewBox="0 0 60 30" className={stat.color}>
                          <path
                            d="M0 25 Q 15 10, 30 20 T 60 15"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            opacity="0.5"
                          />
                        </svg>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Streak Chart */}
        <div className="mb-8">
          <StreakChart />
        </div>

        {/* Recent Notes */}
        <div className="mb-8">
          <RecentNotes />
        </div>

        {/* Movies Card */}
        {movieStats && movieStats.total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Film className="w-5 h-5 text-rose-500" />
                Movies
              </h2>
              <Link
                href="/movies"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-rose-500/10">
                      <Film className="w-5 h-5 text-rose-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{movieStats.total}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{movieStats.watched}</p>
                      <p className="text-xs text-muted-foreground">Watched</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <Clock className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{movieStats.watchlist}</p>
                      <p className="text-xs text-muted-foreground">Watchlist</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-violet-500/10">
                      <Star className="w-5 h-5 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{movieStats.thisMonth}</p>
                      <p className="text-xs text-muted-foreground">This Month</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Projects Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Your Projects</h2>
            <Link
              href="/tasks"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              View all tasks <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 6).map((project, index) => {
              const progress = getProgressPercentage(project._id);
              const projectData = projectProgress[project._id];
              return (
                <motion.div
                  key={project._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                >
                  <Link href={`/projects/${project._id}`}>
                    <Card className="cursor-pointer hover:shadow-md transition-all h-full">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                            style={{ backgroundColor: project.color + '20' }}
                          >
                            {project.icon || '📋'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">
                              {project.name}
                            </h3>
                            <p className="text-sm text-muted-foreground truncate">
                              {project.description || 'No description'}
                            </p>
                          </div>
                        </div>

                        {/* Progress Section */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 0.5, delay: 0.6 + index * 0.05 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: project.color }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {projectData?.completedItems || 0} of {projectData?.totalItems || 0} items
                            </span>
                            <div className="flex gap-2">
                              {projectData?.inProgress ? (
                                <Badge variant="secondary" className="text-xs">
                                  {projectData.inProgress} in progress
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}

            {projects.length === 0 && (
              <div className="col-span-full">
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground mb-4">
                      No projects yet. Create your first project to get started.
                    </p>
                    <Button asChild>
                      <Link href="/projects/new">
                        <Plus className="w-4 h-4 mr-2" />
                        Create project
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
