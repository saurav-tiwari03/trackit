'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  Inbox as InboxIcon,
  Plus,
  Calendar,
  MoreHorizontal,
  Loader2,
} from 'lucide-react';
import { Task, Project } from '@/types';
import { tasksAPI, projectsAPI } from '@/lib/api';
import { useProjectsStore } from '@/store/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';
import { TaskModal } from '@/components/task/task-modal';

const INBOX_PROJECT_NAME = 'Inbox';
const INBOX_PROJECT_COLOR = '#6b7280';

export default function InboxPage() {
  const { projects, fetchProjects } = useProjectsStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [inboxProject, setInboxProject] = useState<Project | null>(null);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const isCreatingRef = useRef(false);

  // Fetch projects on mount
  useEffect(() => {
    const loadProjects = async () => {
      await fetchProjects();
      setProjectsLoaded(true);
    };
    loadProjects();
  }, [fetchProjects]);

  // Find or create Inbox project - only after projects are loaded
  const getOrCreateInboxProject = useCallback(async () => {
    // Find existing Inbox project
    let inbox = projects.find(p => p.name === INBOX_PROJECT_NAME);

    if (inbox) {
      setInboxProject(inbox);
      return inbox;
    }

    // Prevent duplicate creation with ref
    if (isCreatingRef.current) {
      return null;
    }

    // Only create if projects are loaded and no Inbox exists
    if (projectsLoaded && !inbox) {
      isCreatingRef.current = true;
      try {
        const response = await projectsAPI.create({
          name: INBOX_PROJECT_NAME,
          description: 'Quick tasks and ideas',
          color: INBOX_PROJECT_COLOR,
        });
        inbox = response.data.data;
        await fetchProjects();
        setInboxProject(inbox || null);
        return inbox;
      } catch (error) {
        console.error('Failed to create Inbox project:', error);
        return null;
      } finally {
        isCreatingRef.current = false;
      }
    }

    return null;
  }, [projects, fetchProjects, projectsLoaded]);

  const fetchInboxTasks = useCallback(async () => {
    if (!projectsLoaded) return;

    setIsLoading(true);
    try {
      const inbox = await getOrCreateInboxProject();
      if (inbox) {
        const response = await tasksAPI.getAll({ project: inbox._id });
        setTasks(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch inbox tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getOrCreateInboxProject, projectsLoaded]);

  useEffect(() => {
    if (projectsLoaded) {
      fetchInboxTasks();
    }
  }, [fetchInboxTasks, projectsLoaded]);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !inboxProject) return;

    setIsAddingTask(true);
    try {
      const defaultSection = inboxProject.sections?.[0]?._id;
      if (!defaultSection) {
        console.error('No section found in Inbox project');
        return;
      }

      await tasksAPI.create({
        title: newTaskTitle,
        project: inboxProject._id,
        section: defaultSection,
        priority: 'P4',
      });

      setNewTaskTitle('');
      await fetchInboxTasks();
    } catch (error) {
      console.error('Failed to add task:', error);
    } finally {
      setIsAddingTask(false);
    }
  };

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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const pendingTasks = tasks.filter(t => !t.isCompleted);
  const completedTasks = tasks.filter(t => t.isCompleted);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
              <InboxIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold">Inbox</h1>
              <p className="text-sm text-muted-foreground">
                Quick tasks and ideas
              </p>
            </div>
          </div>
          <Badge variant="secondary">{pendingTasks.length} pending</Badge>
        </div>

        {/* Quick Add */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
            <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              placeholder="Add a task..."
              className="flex-1 border-0 bg-transparent h-8 focus-visible:ring-0 px-0"
            />
            {isAddingTask && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <Button
            onClick={handleAddTask}
            disabled={!newTaskTitle.trim() || isAddingTask}
            size="sm"
          >
            Add
          </Button>
        </div>
      </div>

      {/* Task List */}
      <div className="p-4 sm:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <InboxIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground mb-2">Your inbox is empty</p>
            <p className="text-sm text-muted-foreground">
              Add quick tasks and ideas here
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pending Tasks */}
            {pendingTasks.length > 0 && (
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {pendingTasks.map((task, index) => (
                    <motion.div
                      key={task._id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.02 }}
                      className="group p-3 sm:p-4 rounded-xl border bg-card cursor-pointer hover:shadow-md hover:border-border/80 transition-all"
                      onClick={() => setSelectedTask(task)}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleComplete(task);
                          }}
                          className="shrink-0 mt-0.5"
                        >
                          <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{task.title}</p>
                          {task.description && (
                            <p className="text-sm text-muted-foreground truncate mt-0.5">
                              {task.description.replace(/<[^>]*>/g, '')}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            {task.dueDate && (
                              <div
                                className={cn(
                                  'flex items-center gap-1 text-xs',
                                  new Date(task.dueDate) < new Date()
                                    ? 'text-destructive'
                                    : 'text-muted-foreground'
                                )}
                              >
                                <Calendar className="h-3 w-3" />
                                {formatDate(task.dueDate)}
                              </div>
                            )}
                            {task.subtasks && task.subtasks.length > 0 && (
                              <Badge variant="outline" className="text-xs h-5 px-1.5">
                                {task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
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
                              Mark as complete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground px-1">
                  Completed ({completedTasks.length})
                </h3>
                <AnimatePresence mode="popLayout">
                  {completedTasks.map((task) => (
                    <motion.div
                      key={task._id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group p-3 sm:p-4 rounded-xl border bg-card/50 cursor-pointer opacity-60 hover:opacity-100 transition-all"
                      onClick={() => setSelectedTask(task)}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleComplete(task);
                          }}
                          className="shrink-0 mt-0.5"
                        >
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium line-through text-muted-foreground">
                            {task.title}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Task Modal */}
      <TaskModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => {
          setSelectedTask(null);
          fetchInboxTasks();
        }}
      />
    </div>
  );
}
