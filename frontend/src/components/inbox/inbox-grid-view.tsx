'use client';

import { useMemo, useState, useRef } from 'react';
import { format } from 'date-fns';
import {
  CheckCircle2,
  Circle,
  MoreHorizontal,
  Plus,
  ChevronDown,
  Info,
  X,
  Pencil,
  Search,
  GripVertical,
  Clock,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Task, Section } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface InboxGridViewProps {
  tasks: Task[];
  sections: Section[];
  onTaskClick: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onAddTask: (data: {
    title: string;
    section?: string;
    startDate?: string;
    dueDate?: string;
  }) => Promise<string | undefined>;
  onUpdateTask: (taskId: string, data: Partial<Task>) => Promise<void>;
  onReorderTask?: (taskId: string, newOrder: number) => void;
}

const priorityConfig: Record<string, { color: string; label: string; dotColor: string }> = {
  P1: { color: 'text-red-500', label: 'Urgent', dotColor: 'bg-red-500' },
  P2: { color: 'text-orange-500', label: 'Important', dotColor: 'bg-orange-500' },
  P3: { color: 'text-yellow-500', label: 'Medium', dotColor: 'bg-yellow-500' },
  P4: { color: 'text-gray-400', label: 'Low', dotColor: 'bg-gray-400' },
};

const progressConfig: Record<string, { label: string; color: string }> = {
  not_started: { label: 'Not started', color: 'text-muted-foreground' },
  in_progress: { label: 'In Progress', color: 'text-blue-500' },
  completed: { label: 'Completed', color: 'text-green-500' },
  late: { label: 'Late', color: 'text-red-500' },
};

// Default labels with colors
const defaultLabels = [
  { name: 'Pink', color: 'bg-pink-200 text-pink-800' },
  { name: 'Red', color: 'bg-red-200 text-red-800' },
  { name: 'Yellow', color: 'bg-yellow-200 text-yellow-800' },
  { name: 'Green', color: 'bg-green-200 text-green-800' },
  { name: 'Blue', color: 'bg-blue-200 text-blue-800' },
  { name: 'Purple', color: 'bg-purple-200 text-purple-800' },
  { name: 'Bronze', color: 'bg-amber-200 text-amber-800' },
  { name: 'Lime', color: 'bg-lime-200 text-lime-800' },
  { name: 'Aqua', color: 'bg-cyan-200 text-cyan-800' },
];

export function InboxGridView({
  tasks,
  sections,
  onTaskClick,
  onToggleComplete,
  onAddTask,
  onUpdateTask,
  onReorderTask,
}: InboxGridViewProps) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Use ref for pending task ID to avoid closure issues with async operations
  const pendingTaskIdRef = useRef<string | null>(null);
  const newTaskTitleRef = useRef<string>('');
  // Track pending task ID in state for filtering
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);

  // Editing state for inline edits
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const newTaskInputRef = useRef<HTMLInputElement>(null);

  // Label popover state
  const [labelSearch, setLabelSearch] = useState('');
  const [editingLabelIndex, setEditingLabelIndex] = useState<number | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState('');

  const sectionMap = useMemo(() => {
    return new Map(sections.map((s) => [s._id, s]));
  }, [sections]);

  // Set default section when sections are loaded
  const defaultSection = useMemo(() => {
    const backlog = sections.find((s) => s.name === 'Backlog');
    return backlog?._id || sections[0]?._id || '';
  }, [sections]);

  // Sort tasks by createdAt oldest first, excluding pending task
  const sortedTasks = useMemo(() => {
    return [...tasks]
      .filter((t) => t._id !== pendingTaskId) // Hide pending task while editing
      .sort((a, b) => {
        // First by order if defined
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        // Then by createdAt oldest first
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateA - dateB;
      });
  }, [tasks, pendingTaskId]);

  const handleStartAddTask = () => {
    setIsAddingTask(true);
    setNewTaskTitle('');
  };

  const handleCancelAddTask = () => {
    setIsAddingTask(false);
    setNewTaskTitle('');
    newTaskTitleRef.current = '';
    pendingTaskIdRef.current = null;
    setPendingTaskId(null);
  };

  // Create task immediately on first character typed
  const handleNewTaskChange = async (value: string) => {
    setNewTaskTitle(value);
    newTaskTitleRef.current = value; // Keep ref in sync
    
    // Create task immediately when user types first character
    if (value.length === 1 && !pendingTaskIdRef.current && !isSubmitting) {
      setIsSubmitting(true);
      try {
        const taskId = await onAddTask({
          title: value,
          section: defaultSection,
        });
        if (taskId) {
          pendingTaskIdRef.current = taskId; // Store the actual task ID in ref
          setPendingTaskId(taskId); // Also store in state for filtering
        }
      } catch (error) {
        console.error('Failed to create task:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
    // Don't update on every keystroke - wait for blur
  };

  // Handle blur to update the task title with final value
  const handleNewTaskBlur = async () => {
    const taskId = pendingTaskIdRef.current;
    const title = newTaskTitleRef.current.trim();
    
    if (taskId && title) {
      // Update the task with the final title
      await onUpdateTask(taskId, { title });
    }
    // Reset state for next task - this makes the task visible in the list
    setNewTaskTitle('');
    newTaskTitleRef.current = '';
    pendingTaskIdRef.current = null;
    setPendingTaskId(null); // Clear state to show task in list
  };

  // Handle Enter key to confirm and start new task
  const handleNewTaskKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const taskId = pendingTaskIdRef.current;
      const title = newTaskTitleRef.current.trim();
      
      if (taskId && title) {
        // Update the task with the final title
        await onUpdateTask(taskId, { title });
      }
      // Reset for next task - this makes the task visible in the list
      setNewTaskTitle('');
      newTaskTitleRef.current = '';
      pendingTaskIdRef.current = null;
      setPendingTaskId(null); // Clear state to show task in list
      newTaskInputRef.current?.focus();
    }
    if (e.key === 'Escape') {
      handleCancelAddTask();
    }
  };

  // Inline edit handlers
  const handleStartEditTitle = (task: Task) => {
    setEditingTitle(task._id);
    setEditingTitleValue(task.title);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  };

  const handleSaveTitle = async (taskId: string) => {
    if (editingTitleValue.trim() && editingTitleValue !== tasks.find(t => t._id === taskId)?.title) {
      await onUpdateTask(taskId, { title: editingTitleValue.trim() });
    }
    setEditingTitle(null);
    setEditingTitleValue('');
  };

  const handleUpdateSection = async (taskId: string, sectionId: string) => {
    await onUpdateTask(taskId, { section: sectionId });
  };

  const handleUpdateStartDate = async (taskId: string, date: Date | undefined, currentDueDate?: string, currentStartDate?: string) => {
    if (!date) {
      await onUpdateTask(taskId, { startDate: undefined });
      return;
    }
    // Preserve existing time if updating date only
    if (currentStartDate) {
      const existingDate = new Date(currentStartDate);
      date.setHours(existingDate.getHours(), existingDate.getMinutes(), 0, 0);
    }
    // Validate: start date cannot be after due date
    if (currentDueDate) {
      const dueDate = new Date(currentDueDate);
      if (date > dueDate) {
        return; // Don't update if start date is after due date
      }
    }
    await onUpdateTask(taskId, { startDate: date.toISOString() });
  };

  const handleUpdateStartTime = async (taskId: string, time: string, currentStartDate?: string) => {
    const date = currentStartDate ? new Date(currentStartDate) : new Date();
    const [hours, minutes] = time.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
    await onUpdateTask(taskId, { startDate: date.toISOString() });
  };

  const handleUpdateDueDate = async (taskId: string, date: Date | undefined, currentStartDate?: string, currentDueDate?: string) => {
    if (!date) {
      await onUpdateTask(taskId, { dueDate: undefined });
      return;
    }
    // Preserve existing time if updating date only, or default to end of day
    if (currentDueDate) {
      const existingDate = new Date(currentDueDate);
      date.setHours(existingDate.getHours(), existingDate.getMinutes(), 0, 0);
    } else {
      date.setHours(23, 59, 0, 0);
    }
    // Validate: due date cannot be before start date
    if (currentStartDate) {
      const startDate = new Date(currentStartDate);
      if (date < startDate) {
        return; // Don't update if due date is before start date
      }
    }
    await onUpdateTask(taskId, { dueDate: date.toISOString() });
  };

  const handleUpdateDueTime = async (taskId: string, time: string, currentDueDate?: string) => {
    const date = currentDueDate ? new Date(currentDueDate) : new Date();
    const [hours, minutes] = time.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
    await onUpdateTask(taskId, { dueDate: date.toISOString() });
  };

  const handleUpdateProgress = async (taskId: string, progress: string) => {
    await onUpdateTask(taskId, { progress: progress as Task['progress'] });
  };

  const handleUpdatePriority = async (taskId: string, priority: string) => {
    await onUpdateTask(taskId, { priority: priority as Task['priority'] });
  };

  const handleToggleLabel = async (taskId: string, labelName: string, currentLabels: string[]) => {
    const hasLabel = currentLabels.includes(labelName);
    const newLabels = hasLabel
      ? currentLabels.filter(l => l !== labelName)
      : [...currentLabels, labelName];
    await onUpdateTask(taskId, { labels: newLabels });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !onReorderTask) return;
    const taskId = result.draggableId;
    const newOrder = result.destination.index;
    onReorderTask(taskId, newOrder);
  };

  const filteredLabels = defaultLabels.filter(l => 
    l.name.toLowerCase().includes(labelSearch.toLowerCase())
  );

  const columns = [
    { key: 'drag', label: '', width: 'w-6' },
    { key: 'checkbox', label: '', width: 'w-8' },
    { key: 'title', label: 'Task Name', width: 'flex-1 min-w-[200px]' },
    { key: 'startDate', label: 'Start date', width: 'w-[110px]' },
    { key: 'dueDate', label: 'Due date', width: 'w-[110px]' },
    { key: 'bucket', label: 'Bucket', width: 'w-[130px]' },
    { key: 'progress', label: 'Progress', width: 'w-[130px]' },
    { key: 'priority', label: 'Priority', width: 'w-[110px]' },
    { key: 'labels', label: 'Labels', width: 'w-[130px]' },
    { key: 'quickLook', label: 'Subtasks', width: 'w-[80px]' },
    { key: 'actions', label: '', width: 'w-[50px]' },
  ];

  return (
    <div className="overflow-x-auto">
      {/* Header Row */}
      <div className="flex items-center gap-0 px-4 py-3 border-b bg-background/50 backdrop-blur-sm min-w-max">
        {columns.map((col) => (
          <div
            key={col.key}
            className={cn(
              'flex items-center gap-1 text-sm font-medium text-muted-foreground shrink-0 px-1',
              col.width
            )}
          >
            {col.label}
            {col.label && (
              <ChevronDown className="h-3 w-3 opacity-50" />
            )}
          </div>
        ))}
      </div>

      {/* Task Rows with Drag and Drop */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="grid-tasks">
          {(provided, droppableSnapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                "divide-y",
                droppableSnapshot.isDraggingOver && "bg-muted/10"
              )}
              style={{
                transition: 'background-color 0.2s ease',
              }}
            >
              {sortedTasks.map((task, index) => {
                const section = sectionMap.get(task.section);
                const completedSubtasks = task.subtaskCompletedCount ?? 0;
                const totalSubtasks = task.subtaskCount ?? 0;

                return (
                  <Draggable key={task._id} draggableId={task._id} index={index}>
                    {(dragProvided, dragSnapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        style={{
                          ...dragProvided.draggableProps.style,
                          // Add smooth transition when not dragging (for reordering animation)
                          transition: dragSnapshot.isDragging 
                            ? dragProvided.draggableProps.style?.transition
                            : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1), background-color 0.15s ease',
                        }}
                        className={cn(
                          "flex items-center gap-0 px-4 py-2.5 hover:bg-muted/20 min-w-max group",
                          dragSnapshot.isDragging && "bg-background shadow-xl ring-1 ring-border/50 z-50",
                          !dragSnapshot.isDragging && "transition-colors"
                        )}
                      >
                        {/* Drag Handle */}
                        <div
                          {...dragProvided.dragHandleProps}
                          className={cn(
                            "w-6 shrink-0 flex items-center justify-center transition-all duration-150",
                            dragSnapshot.isDragging 
                              ? "cursor-grabbing opacity-100" 
                              : "cursor-grab opacity-0 group-hover:opacity-100"
                          )}
                        >
                          <GripVertical className={cn(
                            "h-4 w-4 transition-colors",
                            dragSnapshot.isDragging ? "text-primary" : "text-muted-foreground"
                          )} />
                        </div>

                        {/* Checkbox */}
                        <div className="w-8 shrink-0 px-1">
                          <button
                            onClick={() => onToggleComplete(task)}
                            className="cursor-pointer"
                          >
                            {task.isCompleted ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
                            )}
                          </button>
                        </div>

                        {/* Title - Editable inline */}
                        <div className={cn('flex-1 min-w-[200px] shrink-0 px-1', task.isCompleted && 'text-muted-foreground line-through')}>
                          {editingTitle === task._id ? (
                            <Input
                              ref={titleInputRef}
                              value={editingTitleValue}
                              onChange={(e) => setEditingTitleValue(e.target.value)}
                              onBlur={() => handleSaveTitle(task._id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveTitle(task._id);
                                }
                                if (e.key === 'Escape') {
                                  setEditingTitle(null);
                                  setEditingTitleValue('');
                                }
                              }}
                              className="h-7 border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-primary px-0"
                            />
                          ) : (
                            <span
                              className="font-medium cursor-text hover:bg-muted/50 px-1 py-0.5 rounded"
                              onClick={() => handleStartEditTitle(task)}
                            >
                              {task.title}
                            </span>
                          )}
                        </div>

                        {/* Start Date */}
                        <div className="w-[110px] shrink-0 px-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="flex items-center text-sm text-muted-foreground hover:text-foreground py-1 rounded border border-transparent hover:border-border transition-colors w-full text-left group/btn">
                                <span className="flex-1">{task.startDate ? format(new Date(task.startDate), 'MMM d') : '—'}</span>
                                <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={task.startDate ? new Date(task.startDate) : undefined}
                                onSelect={(date) => handleUpdateStartDate(task._id, date, task.dueDate, task.startDate)}
                                disabled={task.dueDate ? { after: new Date(task.dueDate) } : undefined}
                                initialFocus
                              />
                              <div className="border-t p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <Input
                                    type="time"
                                    value={task.startDate ? format(new Date(task.startDate), 'HH:mm') : ''}
                                    onChange={(e) => handleUpdateStartTime(task._id, e.target.value, task.startDate)}
                                    className="flex-1 h-8"
                                  />
                                </div>
                              </div>
                              {task.dueDate && (
                                <p className="text-xs text-muted-foreground px-3 pb-2">
                                  Must be on or before {format(new Date(task.dueDate), 'MMM d, yyyy')}
                                </p>
                              )}
                              {task.startDate && (
                                <div className="p-2 border-t">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full text-destructive"
                                    onClick={() => handleUpdateStartDate(task._id, undefined, task.dueDate, task.startDate)}
                                  >
                                    Clear date
                                  </Button>
                                </div>
                              )}
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Due Date */}
                        <div className="w-[110px] shrink-0 px-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="flex items-center text-sm text-muted-foreground hover:text-foreground py-1 rounded border border-transparent hover:border-border transition-colors w-full text-left group/btn">
                                <span className="flex-1">{task.dueDate ? format(new Date(task.dueDate), 'MMM d') : '—'}</span>
                                <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={task.dueDate ? new Date(task.dueDate) : undefined}
                                onSelect={(date) => handleUpdateDueDate(task._id, date, task.startDate, task.dueDate)}
                                disabled={task.startDate ? { before: new Date(task.startDate) } : undefined}
                                initialFocus
                              />
                              <div className="border-t p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <Input
                                    type="time"
                                    value={task.dueDate ? format(new Date(task.dueDate), 'HH:mm') : ''}
                                    onChange={(e) => handleUpdateDueTime(task._id, e.target.value, task.dueDate)}
                                    className="flex-1 h-8"
                                  />
                                </div>
                              </div>
                              {task.startDate && (
                                <p className="text-xs text-muted-foreground px-3 pb-2">
                                  Must be on or after {format(new Date(task.startDate), 'MMM d, yyyy')}
                                </p>
                              )}
                              {task.dueDate && (
                                <div className="p-2 border-t">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full text-destructive"
                                    onClick={() => handleUpdateDueDate(task._id, undefined, task.startDate, task.dueDate)}
                                  >
                                    Clear date
                                  </Button>
                                </div>
                              )}
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Bucket */}
                        <div className="w-[130px] shrink-0 px-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="flex items-center py-1 rounded border border-transparent hover:border-border transition-colors group/btn">
                                {section ? (
                                  <Badge variant="outline" className="font-normal text-xs">
                                    {section.name}
                                  </Badge>
                                ) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                                <ChevronDown className="h-3 w-3 text-muted-foreground ml-1 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              {sections.map((s) => (
                                <DropdownMenuItem
                                  key={s._id}
                                  onClick={() => handleUpdateSection(task._id, s._id)}
                                >
                                  <div className="flex items-center gap-2">
                                    {task.section === s._id && (
                                      <CheckCircle2 className="h-4 w-4 text-primary" />
                                    )}
                                    <span className={task.section === s._id ? 'font-medium' : ''}>
                                      {s.name}
                                    </span>
                                  </div>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Progress */}
                        <div className="w-[130px] shrink-0 px-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="flex items-center gap-1.5 py-1 rounded border border-transparent hover:border-border transition-colors group/btn">
                                <Circle className={cn('h-2.5 w-2.5', progressConfig[task.progress || 'not_started']?.color)} />
                                <span className="text-sm">
                                  {progressConfig[task.progress || 'not_started']?.label}
                                </span>
                                <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              {Object.entries(progressConfig).map(([key, config]) => (
                                <DropdownMenuItem
                                  key={key}
                                  onClick={() => handleUpdateProgress(task._id, key)}
                                >
                                  <div className="flex items-center gap-2">
                                    <Circle className={cn('h-2.5 w-2.5', config.color)} />
                                    <span className={task.progress === key ? 'font-medium' : ''}>
                                      {config.label}
                                    </span>
                                  </div>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Priority */}
                        <div className="w-[110px] shrink-0 px-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="flex items-center gap-1.5 py-1 rounded border border-transparent hover:border-border transition-colors group/btn">
                                <span className={cn('h-2 w-2 rounded-full', priorityConfig[task.priority]?.dotColor)} />
                                <span className="text-sm">{priorityConfig[task.priority]?.label}</span>
                                <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              {Object.entries(priorityConfig).map(([key, config]) => (
                                <DropdownMenuItem
                                  key={key}
                                  onClick={() => handleUpdatePriority(task._id, key)}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={cn('h-2 w-2 rounded-full', config.dotColor)} />
                                    <span className={task.priority === key ? 'font-medium' : ''}>
                                      {config.label}
                                    </span>
                                  </div>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Labels */}
                        <div className="w-[130px] shrink-0 px-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="flex items-center py-1 rounded border border-transparent hover:border-border transition-colors w-full text-left group/btn">
                                {task.labels && task.labels.length > 0 ? (
                                  <div className="flex gap-1 flex-wrap flex-1">
                                    {task.labels.slice(0, 2).map((label) => {
                                      const labelConfig = defaultLabels.find(l => l.name === label);
                                      return (
                                        <Badge 
                                          key={label} 
                                          className={cn("text-xs border-0 px-1.5 py-0", labelConfig?.color || 'bg-gray-200 text-gray-800')}
                                        >
                                          {label}
                                        </Badge>
                                      );
                                    })}
                                    {task.labels.length > 2 && (
                                      <span className="text-xs text-muted-foreground">+{task.labels.length - 2}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-sm text-primary flex-1">Add label</span>
                                )}
                                <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[220px] p-0" align="start">
                              <div className="p-2 border-b">
                                <div className="relative">
                                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    value={labelSearch}
                                    onChange={(e) => setLabelSearch(e.target.value)}
                                    placeholder="Search for label"
                                    className="h-8 pl-8 text-sm"
                                  />
                                </div>
                              </div>
                              <div className="max-h-[280px] overflow-y-auto py-1">
                                {filteredLabels.map((label, idx) => {
                                  const isSelected = task.labels?.includes(label.name);
                                  return (
                                    <div
                                      key={label.name}
                                      className="flex items-center justify-between px-2 py-1.5 hover:bg-muted/50 cursor-pointer group/label"
                                    >
                                      {editingLabelIndex === idx ? (
                                        <Input
                                          value={editingLabelValue}
                                          onChange={(e) => setEditingLabelValue(e.target.value)}
                                          onBlur={() => {
                                            setEditingLabelIndex(null);
                                            setEditingLabelValue('');
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === 'Escape') {
                                              setEditingLabelIndex(null);
                                              setEditingLabelValue('');
                                            }
                                          }}
                                          className="h-6 text-xs flex-1"
                                          autoFocus
                                        />
                                      ) : (
                                        <>
                                          <button
                                            onClick={() => handleToggleLabel(task._id, label.name, task.labels || [])}
                                            className="flex items-center gap-2 flex-1"
                                          >
                                            <Badge className={cn("text-xs border-0", label.color)}>
                                              {label.name}
                                            </Badge>
                                            {isSelected && (
                                              <CheckCircle2 className="h-3.5 w-3.5 text-primary ml-auto" />
                                            )}
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingLabelIndex(idx);
                                              setEditingLabelValue(label.name);
                                            }}
                                            className="p-1 opacity-0 group-hover/label:opacity-100 hover:bg-muted rounded transition-opacity"
                                          >
                                            <Pencil className="h-3 w-3 text-muted-foreground" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Subtasks */}
                        <div className="w-[80px] shrink-0 px-1">
                          <button
                            onClick={() => onTaskClick(task)}
                            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground py-1 rounded transition-colors"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            <span>{completedSubtasks}/{totalSubtasks}</span>
                          </button>
                        </div>

                        {/* Actions */}
                        <div className="w-[50px] shrink-0 flex items-center justify-end gap-0.5 px-1">
                          <button
                            onClick={() => onTaskClick(task)}
                            className="p-1 rounded hover:bg-muted/50 transition-colors opacity-0 group-hover:opacity-100"
                            title="Open details"
                          >
                            <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 rounded hover:bg-muted/50 transition-colors opacity-0 group-hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onTaskClick(task)}>
                                Open details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onToggleComplete(task)}>
                                {task.isCompleted ? 'Mark incomplete' : 'Mark complete'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add Task Row */}
      {isAddingTask ? (
        <div className="flex items-center gap-0 px-4 py-2.5 hover:bg-muted/20 min-w-max border-t">
          <div className="w-6 shrink-0" />
          <div className="w-8 shrink-0 px-1">
            <Circle className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-[200px] shrink-0 px-1">
            <Input
              ref={newTaskInputRef}
              value={newTaskTitle}
              onChange={(e) => handleNewTaskChange(e.target.value)}
              onKeyDown={handleNewTaskKeyDown}
              onBlur={handleNewTaskBlur}
              placeholder="Start typing to create a task..."
              className="h-7 border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-primary"
              autoFocus
            />
          </div>
          <div className="w-[110px] shrink-0 px-1 text-sm text-muted-foreground">—</div>
          <div className="w-[110px] shrink-0 px-1 text-sm text-muted-foreground">—</div>
          <div className="w-[130px] shrink-0 px-1">
            <Badge variant="outline" className="font-normal text-xs">
              {sectionMap.get(defaultSection)?.name || 'Backlog'}
            </Badge>
          </div>
          <div className="w-[130px] shrink-0 px-1 text-sm text-muted-foreground">Not started</div>
          <div className="w-[110px] shrink-0 px-1">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-gray-400" />
              <span className="text-sm">Low</span>
            </div>
          </div>
          <div className="w-[130px] shrink-0 px-1 text-sm text-muted-foreground">—</div>
          <div className="w-[80px] shrink-0 px-1 text-sm text-muted-foreground">0/0</div>
          <div className="w-[50px] shrink-0 flex items-center justify-end px-1">
            <button
              onClick={handleCancelAddTask}
              className="p-1 rounded hover:bg-muted/50 transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleStartAddTask}
          className="flex items-center gap-2 px-4 py-2.5 w-full text-sm text-primary hover:bg-muted/20 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add new task</span>
        </button>
      )}
    </div>
  );
}
