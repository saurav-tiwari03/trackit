'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  Search,
  Calendar,
  MoreHorizontal,
  Loader2,
} from 'lucide-react';
import { Task } from '@/types';
import { tasksAPI } from '@/lib/api';
import { useProjectsStore } from '@/store/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { TaskModal } from '@/components/task/task-modal';

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'open', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const priorityColors: Record<string, string> = {
  P1: 'bg-red-500',
  P2: 'bg-orange-500',
  P3: 'bg-yellow-500',
  P4: 'bg-gray-400',
};

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function TasksPage() {
  const { projects } = useProjectsStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  // Debounce search to avoid excessive API calls
  const debouncedSearch = useDebounce(search, 300);

  const fetchTasks = useCallback(async () => {
    if (search) setIsSearching(true);
    else setIsLoading(true);

    try {
      const params: { status?: string; project?: string; search?: string } = {};
      
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (projectFilter !== 'all') {
        params.project = projectFilter;
      }
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      const response = await tasksAPI.getAll(params);
      setTasks(response.data.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  }, [statusFilter, projectFilter, debouncedSearch]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const toggleComplete = async (task: Task) => {
    try {
      await tasksAPI.update(task._id, { isCompleted: !task.isCompleted });
      setTasks((prev) =>
        prev.map((t) =>
          t._id === task._id
            ? {
                ...t,
                isCompleted: !t.isCompleted,
                status: !t.isCompleted ? 'completed' : 'open',
              }
            : t
        )
      );
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const getProjectName = (task: Task) => {
    if (typeof task.project === 'string') {
      const project = projects.find((p) => p._id === task.project);
      return project?.name || 'Unknown';
    }
    return task.project.name;
  };

  const getProjectColor = (task: Task) => {
    if (typeof task.project === 'string') {
      const project = projects.find((p) => p._id === task.project);
      return project?.color || '#6366f1';
    }
    return task.project.color;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setProjectFilter('all');
  };

  const hasActiveFilters = statusFilter !== 'all' || projectFilter !== 'all' || search;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">All Tasks</h1>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{tasks.length} tasks</Badge>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
            )}
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project._id} value={project._id}>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    {project.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {hasActiveFilters
                ? 'No tasks match your filters'
                : 'No tasks found'}
            </p>
            {hasActiveFilters && (
              <Button variant="link" onClick={clearFilters} className="mt-2">
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {tasks.map((task, index) => (
                <motion.div
                  key={task._id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.02 }}
                  className={cn(
                    'group flex items-center gap-3 p-4 rounded-lg border bg-card cursor-pointer',
                    'hover:shadow-sm transition-all duration-200',
                    task.isCompleted && 'opacity-60'
                  )}
                  onClick={() => setSelectedTask(task)}
                >
                  {/* Checkbox */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleComplete(task);
                    }}
                    className="shrink-0 cursor-pointer"
                  >
                    {task.isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
                    )}
                  </button>

                  {/* Priority */}
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full shrink-0',
                      priorityColors[task.priority]
                    )}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'font-medium truncate',
                        task.isCompleted && 'line-through text-muted-foreground'
                      )}
                    >
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {task.description.replace(/<[^>]*>/g, '')}
                      </p>
                    )}
                  </div>

                  {/* Subtasks count */}
                  {task.subtasks && task.subtasks.length > 0 && (
                    <Badge variant="outline" className="shrink-0">
                      {task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length}
                    </Badge>
                  )}

                  {/* Project */}
                  <Badge
                    variant="outline"
                    className="shrink-0"
                    style={{
                      borderColor: getProjectColor(task),
                      color: getProjectColor(task),
                    }}
                  >
                    {getProjectName(task)}
                  </Badge>

                  {/* Due Date */}
                  {task.dueDate && (
                    <div
                      className={cn(
                        'flex items-center gap-1 text-sm shrink-0',
                        new Date(task.dueDate) < new Date() && !task.isCompleted
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      )}
                    >
                      <Calendar className="h-3 w-3" />
                      {formatDate(task.dueDate)}
                    </div>
                  )}

                  {/* Status Badge */}
                  <Badge
                    variant={
                      task.status === 'completed'
                        ? 'default'
                        : task.status === 'in_progress'
                          ? 'secondary'
                          : 'outline'
                    }
                    className="shrink-0"
                  >
                    {task.status === 'open'
                      ? 'To Do'
                      : task.status === 'in_progress'
                        ? 'In Progress'
                        : 'Completed'}
                  </Badge>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTask(task);
                        }}
                      >
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleComplete(task);
                        }}
                      >
                        {task.isCompleted
                          ? 'Mark as incomplete'
                          : 'Mark as complete'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
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
    </div>
  );
}
