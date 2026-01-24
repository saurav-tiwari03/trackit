'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Inbox as InboxIcon,
  Loader2,
  Plus,
} from 'lucide-react';
import { Task, Project, InboxStats, Section } from '@/types';
import { tasksAPI, projectsAPI } from '@/lib/api';
import { useProjectsStore } from '@/store/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import {
  InboxHeader,
  InboxViewMode,
  InboxFilter,
  InboxGridView,
  InboxBoardView,
  InboxScheduleView,
  InboxChartsView,
  InboxTaskModal,
} from '@/components/inbox';

const INBOX_PROJECT_NAME = 'Inbox';
const INBOX_PROJECT_COLOR = '#6b7280';
const INBOX_VIEW_MODE_KEY = 'inbox-view-mode';
const INBOX_THEME_KEY = 'inbox-theme';

// Helper to get initial view mode from localStorage
const getInitialViewMode = (): InboxViewMode => {
  if (typeof window === 'undefined') return 'grid';
  const stored = localStorage.getItem(INBOX_VIEW_MODE_KEY);
  if (stored && ['grid', 'board', 'schedule', 'charts'].includes(stored)) {
    return stored as InboxViewMode;
  }
  return 'grid';
};

// Helper to get initial theme from localStorage
const getInitialTheme = (): string => {
  if (typeof window === 'undefined') return 'dark';
  return localStorage.getItem(INBOX_THEME_KEY) || 'dark';
};

export default function InboxPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { projects, fetchProjects } = useProjectsStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [inboxProject, setInboxProject] = useState<Project | null>(null);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [stats, setStats] = useState<InboxStats | null>(null);
  const isCreatingRef = useRef(false);
  const hasCheckedUrlTask = useRef(false);

  // View state - initialize from localStorage
  const [viewMode, setViewMode] = useState<InboxViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [groupBy, setGroupBy] = useState('bucket');
  const [currentTheme, setCurrentTheme] = useState('dark');
  const [themeData, setThemeData] = useState<Array<{
    id: string;
    name: string;
    preview?: string | null;
    color?: string;
    gradient?: string;
  }>>([]);

  // Load view mode, theme, and theme data from localStorage on mount
  useEffect(() => {
    const storedViewMode = localStorage.getItem(INBOX_VIEW_MODE_KEY);
    if (storedViewMode && ['grid', 'board', 'schedule', 'charts'].includes(storedViewMode)) {
      setViewMode(storedViewMode as InboxViewMode);
    }
    const storedTheme = localStorage.getItem(INBOX_THEME_KEY);
    if (storedTheme) {
      setCurrentTheme(storedTheme);
    }

    // Fetch theme data
    fetch('/themes.json')
      .then((res) => res.json())
      .then((data) => setThemeData(data.themes || []))
      .catch(console.error);
  }, []);

  // Get current theme style for background
  const themeStyle = useMemo(() => {
    // Handle custom color themes
    if (currentTheme.startsWith('custom:')) {
      const customColor = currentTheme.replace('custom:', '');
      return { backgroundColor: customColor };
    }

    const theme = themeData.find((t) => t.id === currentTheme);
    if (!theme) return {};
    
    if (theme.preview) {
      return {
        backgroundImage: `url(${theme.preview})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    if (theme.gradient) {
      return { background: theme.gradient };
    }
    if (theme.color) {
      return { backgroundColor: theme.color };
    }
    return {};
  }, [currentTheme, themeData]);

  // Check if current theme is an image theme
  const isImageTheme = useMemo(() => {
    if (currentTheme.startsWith('custom:')) return false;
    const theme = themeData.find((t) => t.id === currentTheme);
    return theme?.preview ? true : false;
  }, [currentTheme, themeData]);

  // Persist view mode to localStorage
  const handleViewModeChange = (mode: InboxViewMode) => {
    setViewMode(mode);
    localStorage.setItem(INBOX_VIEW_MODE_KEY, mode);
  };

  // Persist theme to localStorage
  const handleThemeChange = (themeId: string) => {
    setCurrentTheme(themeId);
    localStorage.setItem(INBOX_THEME_KEY, themeId);
  };

  // Add task dialog
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSection, setNewTaskSection] = useState<string>('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Add bucket dialog
  const [isAddBucketOpen, setIsAddBucketOpen] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');
  const [isAddingBucket, setIsAddingBucket] = useState(false);

  // Get sections from inbox project
  const sections: Section[] = useMemo(() => {
    return inboxProject?.sections || [];
  }, [inboxProject]);

  // Fetch projects on mount
  useEffect(() => {
    const loadProjects = async () => {
      await fetchProjects();
      setProjectsLoaded(true);
    };
    loadProjects();
  }, [fetchProjects]);

  // Find or create Inbox project
  const getOrCreateInboxProject = useCallback(async () => {
    let inbox = projects.find((p) => p.name === INBOX_PROJECT_NAME);

    if (inbox) {
      setInboxProject(inbox);
      return inbox;
    }

    if (isCreatingRef.current) {
      return null;
    }

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
        const [tasksResponse, statsResponse] = await Promise.all([
          tasksAPI.getAll({ project: inbox._id }),
          tasksAPI.getInboxStats(inbox._id),
        ]);
        setTasks(tasksResponse.data.data);
        setStats(statsResponse.data.data);
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

  // Handle URL query param to open task modal
  useEffect(() => {
    if (hasCheckedUrlTask.current || isLoading || tasks.length === 0) return;
    
    const taskId = searchParams.get('task');
    if (taskId) {
      const task = tasks.find((t) => t._id === taskId);
      if (task) {
        setSelectedTask(task);
      }
      hasCheckedUrlTask.current = true;
    }
  }, [searchParams, tasks, isLoading]);

  // Update URL when task modal is opened/closed
  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
    // Update URL with task ID
    const url = new URL(window.location.href);
    url.searchParams.set('task', task._id);
    router.replace(url.pathname + url.search, { scroll: false });
  }, [router]);

  const handleCloseTaskModal = useCallback(() => {
    setSelectedTask(null);
    // Remove task ID from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('task');
    router.replace(url.pathname + url.search, { scroll: false });
  }, [router]);

  // Set default section when sections are loaded
  useEffect(() => {
    if (sections.length > 0 && !newTaskSection) {
      // Default to "Up next" or first section
      const upNext = sections.find((s) => s.name === 'Up next');
      setNewTaskSection(upNext?._id || sections[0]._id);
    }
  }, [sections, newTaskSection]);

  // Generic add task for dialogs (schedule/charts views) - uses optimistic updates
  const handleAddTaskDialog = async (sectionId?: string) => {
    if (!newTaskTitle.trim() || !inboxProject) return;

    setIsAddingTask(true);
    try {
      const targetSection = sectionId || newTaskSection || sections[0]?._id;
      if (!targetSection) {
        toast.error('No section found');
        return;
      }

      const response = await tasksAPI.create({
        title: newTaskTitle,
        project: inboxProject._id,
        section: targetSection,
        priority: 'P4',
        progress: 'not_started',
      });

      // Optimistic update - append new task to the list without re-fetching
      const newTask = response.data.data as Task;
      setTasks((prev) => [...prev, newTask]);

      setNewTaskTitle('');
      setIsAddTaskOpen(false);
      toast.success('Task added');
    } catch (error) {
      console.error('Failed to add task:', error);
      toast.error('Failed to add task');
    } finally {
      setIsAddingTask(false);
    }
  };

  // Board view add task handler - uses optimistic updates
  const handleBoardAddTask = async (
    sectionId: string,
    data: { title: string; dueDate?: string }
  ) => {
    if (!data.title.trim() || !inboxProject) return;

    try {
      const response = await tasksAPI.create({
        title: data.title,
        project: inboxProject._id,
        section: sectionId,
        priority: 'P4',
        progress: 'not_started',
        dueDate: data.dueDate,
      });

      // Optimistic update - append new task to the list without re-fetching
      const newTask = response.data.data as Task;
      setTasks((prev) => [...prev, newTask]);

      toast.success('Task added');
    } catch (error) {
      console.error('Failed to add task:', error);
      toast.error('Failed to add task');
      throw error;
    }
  };

  // Grid view add task handler - uses optimistic updates to keep order stable
  // Returns the created task ID so the grid can track it for subsequent updates
  const handleGridAddTask = async (data: {
    title: string;
    section?: string;
    startDate?: string;
    dueDate?: string;
  }): Promise<string | undefined> => {
    if (!data.title.trim() || !inboxProject) return;

    try {
      const targetSection = data.section || sections[0]?._id;
      if (!targetSection) {
        toast.error('No section found');
        return;
      }

      const response = await tasksAPI.create({
        title: data.title,
        project: inboxProject._id,
        section: targetSection,
        priority: 'P4',
        progress: 'not_started',
        startDate: data.startDate,
        dueDate: data.dueDate,
      });

      // Optimistic update - append new task to the list without re-fetching
      const newTask = response.data.data as Task;
      setTasks((prev) => [...prev, newTask]);
      
      return newTask._id; // Return the task ID for tracking
    } catch (error) {
      console.error('Failed to add task:', error);
      toast.error('Failed to add task');
      throw error;
    }
  };

  // Update task handler - uses optimistic updates
  const handleUpdateTask = async (taskId: string, data: Partial<Task>) => {
    // Sync isCompleted with progress status
    const syncedData = { ...data };
    if (data.progress) {
      syncedData.isCompleted = data.progress === 'completed';
    }

    // Optimistic update first
    setTasks((prev) =>
      prev.map((t) =>
        t._id === taskId ? { ...t, ...syncedData } : t
      )
    );

    try {
      await tasksAPI.update(taskId, syncedData);
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Failed to update task');
      // Revert on error by re-fetching
      fetchInboxTasks();
    }
  };

  // Delete task handler
  const handleDeleteTask = async (taskId: string) => {
    // Optimistic update
    setTasks((prev) => prev.filter((t) => t._id !== taskId));

    try {
      await tasksAPI.delete(taskId);
      toast.success('Task deleted');
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('Failed to delete task');
      // Revert on error by re-fetching
      fetchInboxTasks();
    }
  };

  // Bulk complete handler
  const handleBulkComplete = async (taskIds: string[]) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        taskIds.includes(t._id)
          ? { ...t, isCompleted: true, progress: 'completed' as Task['progress'] }
          : t
      )
    );

    try {
      await Promise.all(
        taskIds.map((id) =>
          tasksAPI.update(id, { isCompleted: true, progress: 'completed' })
        )
      );
      toast.success(`${taskIds.length} task${taskIds.length > 1 ? 's' : ''} completed`);
    } catch (error) {
      console.error('Failed to complete tasks:', error);
      toast.error('Failed to complete tasks');
      fetchInboxTasks();
    }
  };

  // Bulk delete handler
  const handleBulkDelete = async (taskIds: string[]) => {
    // Optimistic update
    setTasks((prev) => prev.filter((t) => !taskIds.includes(t._id)));

    try {
      await Promise.all(taskIds.map((id) => tasksAPI.delete(id)));
      toast.success(`${taskIds.length} task${taskIds.length > 1 ? 's' : ''} deleted`);
    } catch (error) {
      console.error('Failed to delete tasks:', error);
      toast.error('Failed to delete tasks');
      fetchInboxTasks();
    }
  };

  // Duplicate task handler
  const handleDuplicateTask = async (task: Task) => {
    if (!inboxProject) return;

    try {
      const response = await tasksAPI.create({
        title: `${task.title} - dup`,
        description: task.description,
        project: inboxProject._id,
        section: task.section,
        priority: task.priority,
        labels: task.labels,
        dueDate: task.dueDate,
        startDate: task.startDate,
        progress: 'not_started',
      });

      const newTask = response.data.data;
      setTasks((prev) => [...prev, newTask]);
      toast.success('Task duplicated');
    } catch (error) {
      console.error('Failed to duplicate task:', error);
      toast.error('Failed to duplicate task');
    }
  };

  const handleOpenAddTask = (sectionId?: string) => {
    if (sectionId) {
      setNewTaskSection(sectionId);
    }
    setIsAddTaskOpen(true);
  };

  const handleAddBucket = async () => {
    if (!newBucketName.trim() || !inboxProject) return;

    setIsAddingBucket(true);
    try {
      const response = await projectsAPI.addSection(inboxProject._id, {
        name: newBucketName,
      });

      // Update inbox project with new sections immediately
      const updatedProject = response.data.data as Project;
      setInboxProject(updatedProject);

      setNewBucketName('');
      setIsAddBucketOpen(false);
      
      toast.success('Bucket added');
    } catch (error) {
      console.error('Failed to add bucket:', error);
      toast.error('Failed to add bucket');
    } finally {
      setIsAddingBucket(false);
    }
  };

  const handleRenameBucket = async (sectionId: string, newName: string) => {
    if (!inboxProject) return;

    try {
      // Update sections with the new name
      const updatedSections = sections.map((s) =>
        s._id === sectionId ? { ...s, name: newName } : s
      );

      const response = await projectsAPI.updateSections(inboxProject._id, updatedSections);
      
      // Update inbox project with new sections immediately
      const updatedProject = response.data.data as Project;
      setInboxProject(updatedProject);
      
      toast.success('Bucket renamed');
    } catch (error) {
      console.error('Failed to rename bucket:', error);
      toast.error('Failed to rename bucket');
    }
  };

  const handleDeleteBucket = async (sectionId: string) => {
    if (!inboxProject) return;

    // Check if bucket has tasks
    const bucketTasks = tasks.filter((t) => t.section === sectionId);
    if (bucketTasks.length > 0) {
      toast.error('Cannot delete bucket with tasks. Move or delete tasks first.');
      return;
    }

    try {
      const updatedSections = sections.filter((s) => s._id !== sectionId);
      const response = await projectsAPI.updateSections(inboxProject._id, updatedSections);
      
      const updatedProject = response.data.data as Project;
      setInboxProject(updatedProject);
      
      toast.success('Bucket deleted');
    } catch (error) {
      console.error('Failed to delete bucket:', error);
      toast.error('Failed to delete bucket');
    }
  };

  const handleMoveBucket = async (sectionId: string, direction: 'left' | 'right') => {
    if (!inboxProject) return;

    const currentIndex = sections.findIndex((s) => s._id === sectionId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;

    // Swap sections
    const updatedSections = [...sections];
    [updatedSections[currentIndex], updatedSections[newIndex]] = 
      [updatedSections[newIndex], updatedSections[currentIndex]];

    // Optimistic update
    setInboxProject((prev) => prev ? { ...prev, sections: updatedSections } : null);

    try {
      const response = await projectsAPI.updateSections(inboxProject._id, updatedSections);
      const updatedProject = response.data.data as Project;
      setInboxProject(updatedProject);
    } catch (error) {
      console.error('Failed to move bucket:', error);
      toast.error('Failed to move bucket');
      // Revert
      setInboxProject((prev) => prev ? { ...prev, sections } : null);
    }
  };

  const toggleComplete = async (task: Task) => {
    try {
      const newProgress = task.isCompleted ? 'not_started' : 'completed';
      await tasksAPI.update(task._id, {
        isCompleted: !task.isCompleted,
        progress: newProgress,
      });
      setTasks((prev) =>
        prev.map((t) =>
          t._id === task._id
            ? {
              ...t,
              isCompleted: !t.isCompleted,
              status: !t.isCompleted ? 'completed' : 'open',
                progress: newProgress as Task['progress'],
            }
            : t
        )
      );
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleMoveTask = async (taskId: string, sectionId: string, order: number) => {
    // Store previous state for rollback
    const previousTasks = [...tasks];
    
    // Optimistic update FIRST - before API call to avoid visual glitch
    setTasks((prev) =>
      prev.map((t) =>
        t._id === taskId ? { ...t, section: sectionId, order } : t
      )
    );

    try {
      await tasksAPI.move(taskId, { section: sectionId, order });
    } catch (error) {
      console.error('Failed to move task:', error);
      toast.error('Failed to move task');
      // Rollback on error
      setTasks(previousTasks);
    }
  };

  const handleReorderTask = async (taskId: string, newOrder: number) => {
    // Store previous state for rollback
    const previousTasks = [...tasks];
    
    // Find the task and update order optimistically
    const taskIndex = tasks.findIndex(t => t._id === taskId);
    if (taskIndex === -1) return;
    
    const reorderedTasks = [...tasks];
    const [removed] = reorderedTasks.splice(taskIndex, 1);
    reorderedTasks.splice(newOrder, 0, removed);
    
    // Update orders for all tasks
    const updatedTasks = reorderedTasks.map((t, idx) => ({ ...t, order: idx }));
    setTasks(updatedTasks);

    try {
      await tasksAPI.update(taskId, { order: newOrder });
    } catch (error) {
      console.error('Failed to reorder task:', error);
      toast.error('Failed to reorder task');
      // Rollback on error
      setTasks(previousTasks);
    }
  };

  // Filter tasks based on search and filter
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Apply progress/status filter
    if (filter !== 'all') {
      result = result.filter((t) => {
        if (filter === 'completed') return t.isCompleted || t.progress === 'completed';
        if (filter === 'not_started') return t.progress === 'not_started' && !t.isCompleted;
        if (filter === 'in_progress') return t.progress === 'in_progress' && !t.isCompleted;
        if (filter === 'late') {
          // Late = past due date and not completed
          if (t.isCompleted) return false;
          if (!t.dueDate) return false;
          return new Date(t.dueDate) < new Date();
        }
        return true;
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [tasks, searchQuery, filter]);

  const pendingTasks = filteredTasks.filter((t) => !t.isCompleted);

  // Check if we're using a custom theme (needs transparency)
  const isCustomTheme = currentTheme.startsWith('custom:') || !['dark', 'light', ''].includes(currentTheme);

  return (
    <div className="h-full min-h-screen flex flex-col relative" style={themeStyle}>
      {/* Overlay for readability when using image backgrounds */}
      {isImageTheme && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-0" />
      )}
      {/* Header with View Controls */}
      <div className="relative z-10 flex flex-col h-full">
      <InboxHeader
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filter={filter}
        onFilterChange={setFilter}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        currentTheme={currentTheme}
        onThemeChange={handleThemeChange}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading inbox...</span>
            </div>
          </div>
        ) : !inboxProject ? (
          <div className="flex flex-col items-center justify-center h-full">
            <InboxIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Your inbox is empty</h2>
            <p className="text-muted-foreground mb-6">
              Add quick tasks and ideas here
            </p>
            <Button onClick={() => setIsAddTaskOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add your first task
            </Button>
          </div>
        ) : (
          <div 
            key={viewMode}
            className="h-full animate-in slide-in-from-right-2 fade-in duration-200"
          >
            {viewMode === 'grid' && (
              <InboxGridView
                tasks={filteredTasks}
                sections={sections}
                onTaskClick={handleTaskClick}
                onToggleComplete={toggleComplete}
                onAddTask={handleGridAddTask}
                onUpdateTask={handleUpdateTask}
                onReorderTask={handleReorderTask}
                onDeleteTask={handleDeleteTask}
                onBulkComplete={handleBulkComplete}
                onBulkDelete={handleBulkDelete}
              />
            )}

            {viewMode === 'board' && (
              <InboxBoardView
                tasks={filteredTasks}
                sections={sections}
                onTaskClick={handleTaskClick}
                onToggleComplete={toggleComplete}
                onMoveTask={handleMoveTask}
                onAddTask={handleBoardAddTask}
                onAddBucket={() => setIsAddBucketOpen(true)}
                onRenameBucket={handleRenameBucket}
                onDeleteBucket={handleDeleteBucket}
                onMoveBucket={handleMoveBucket}
                onDeleteTask={handleDeleteTask}
                onDuplicateTask={handleDuplicateTask}
                onUpdateTask={handleUpdateTask}
              />
            )}

            {viewMode === 'schedule' && (
              <InboxScheduleView
                tasks={filteredTasks}
                sections={sections}
                onTaskClick={handleTaskClick}
                onToggleComplete={toggleComplete}
                onAddTask={() => handleOpenAddTask()}
              />
            )}

            {viewMode === 'charts' && (
              <InboxChartsView
                tasks={filteredTasks}
                sections={sections}
                stats={stats}
                onTaskClick={handleTaskClick}
                onToggleComplete={toggleComplete}
                onAddTask={() => handleOpenAddTask()}
              />
            )}
          </div>
        )}
      </div>

      {/* Task Modal */}
      <InboxTaskModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={handleCloseTaskModal}
        sections={sections}
        projectName={INBOX_PROJECT_NAME}
        onTaskUpdated={fetchInboxTasks}
      />

      {/* Add Task Dialog */}
      <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add new task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTaskDialog();
                  }
                }}
                placeholder="Task name"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Bucket</label>
              <div className="flex flex-wrap gap-2">
                {sections.map((section) => (
                  <Button
                    key={section._id}
                    variant={newTaskSection === section._id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewTaskSection(section._id)}
                  >
                    {section.name}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsAddTaskOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => handleAddTaskDialog()}
                disabled={!newTaskTitle.trim() || isAddingTask}
              >
                {isAddingTask ? 'Adding...' : 'Add task'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Bucket Dialog */}
      <Dialog open={isAddBucketOpen} onOpenChange={setIsAddBucketOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add new bucket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                value={newBucketName}
                onChange={(e) => setNewBucketName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddBucket();
                  }
                }}
                placeholder="Bucket name"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsAddBucketOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddBucket}
                disabled={!newBucketName.trim() || isAddingBucket}
              >
                {isAddingBucket ? 'Adding...' : 'Add bucket'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
