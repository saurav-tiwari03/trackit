'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  CheckCircle2,
  Circle,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Tag,
  Copy,
  ChevronRight,
  Flag,
  Activity,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Task, Section, User } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';

interface AddTaskFormState {
  title: string;
  dueDate?: Date;
  dueTime?: string; // HH:mm format
}

interface InboxBoardViewProps {
  tasks: Task[];
  sections: Section[];
  onTaskClick: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onMoveTask: (taskId: string, sectionId: string, order: number) => void;
  onAddTask: (sectionId: string, data: { title: string; dueDate?: string }) => Promise<void>;
  onAddBucket: () => void;
  onRenameBucket: (sectionId: string, newName: string) => Promise<void>;
  onDeleteBucket?: (sectionId: string) => Promise<void>;
  onMoveBucket?: (sectionId: string, direction: 'left' | 'right') => Promise<void>;
  onDeleteTask?: (taskId: string) => Promise<void>;
  onDuplicateTask?: (task: Task) => Promise<void>;
  onUpdateTask?: (taskId: string, data: Partial<Task>) => Promise<void>;
}

// Label options
const labelOptions = [
  { name: 'Pink', color: 'bg-pink-500' },
  { name: 'Red', color: 'bg-red-500' },
  { name: 'Yellow', color: 'bg-yellow-500' },
  { name: 'Green', color: 'bg-green-500' },
  { name: 'Blue', color: 'bg-blue-500' },
  { name: 'Purple', color: 'bg-purple-500' },
];

// Progress options
const progressOptions: Array<{ value: Task['progress']; label: string; color: string }> = [
  { value: 'not_started', label: 'Not started', color: 'bg-gray-400' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { value: 'completed', label: 'Completed', color: 'bg-green-500' },
  { value: 'late', label: 'Late', color: 'bg-red-500' },
];

// Priority options
const priorityOptions: Array<{ value: Task['priority']; label: string; color: string }> = [
  { value: 'P1', label: 'Urgent', color: 'bg-red-500' },
  { value: 'P2', label: 'High', color: 'bg-orange-500' },
  { value: 'P3', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'P4', label: 'Low', color: 'bg-gray-400' },
];

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function InboxBoardView({
  tasks,
  sections,
  onTaskClick,
  onToggleComplete,
  onMoveTask,
  onAddTask,
  onAddBucket,
  onDeleteTask,
  onDuplicateTask,
  onUpdateTask,
  onRenameBucket,
  onDeleteBucket,
  onMoveBucket,
}: InboxBoardViewProps) {
  const [openAddTask, setOpenAddTask] = useState<string | null>(null);
  const [addTaskForm, setAddTaskForm] = useState<AddTaskFormState>({ title: '' });
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [editingBucket, setEditingBucket] = useState<string | null>(null);
  const [editingBucketName, setEditingBucketName] = useState('');

  const handleStartEditBucket = (section: Section) => {
    setEditingBucket(section._id);
    setEditingBucketName(section.name);
  };

  const handleSaveBucketName = async (sectionId: string) => {
    if (editingBucketName.trim()) {
      await onRenameBucket(sectionId, editingBucketName.trim());
    }
    setEditingBucket(null);
    setEditingBucketName('');
  };

  // Group tasks by section - sort by createdAt oldest first
  const tasksBySection = useMemo(() => {
    const grouped = new Map<string, Task[]>();
    sections.forEach((s) => grouped.set(s._id, []));
    
    tasks.forEach((task) => {
      const sectionTasks = grouped.get(task.section) || [];
      sectionTasks.push(task);
      grouped.set(task.section, sectionTasks);
    });

    // Sort tasks within each section by order first, then by createdAt (oldest first)
    grouped.forEach((sectionTasks, sectionId) => {
      grouped.set(
        sectionId,
        sectionTasks.sort((a, b) => {
          // First sort by order if defined
          if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
          }
          // Then by createdAt oldest first
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateA - dateB;
        })
      );
    });

    return grouped;
  }, [tasks, sections]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const taskId = result.draggableId;
    const newSectionId = result.destination.droppableId;
    const newOrder = result.destination.index;

    // Call the handler - parent does optimistic update
    onMoveTask(taskId, newSectionId, newOrder);
  };

  const handleAddTaskSubmit = async (sectionId: string) => {
    if (!addTaskForm.title.trim()) return;
    setIsAddingTask(true);
    try {
      let dueDate: string | undefined;
      if (addTaskForm.dueDate) {
        const date = new Date(addTaskForm.dueDate);
        if (addTaskForm.dueTime) {
          const [hours, minutes] = addTaskForm.dueTime.split(':').map(Number);
          date.setHours(hours, minutes, 0, 0);
        }
        dueDate = date.toISOString();
      }
      
      await onAddTask(sectionId, {
        title: addTaskForm.title,
        dueDate,
      });
      setAddTaskForm({ title: '' });
      setOpenAddTask(null);
    } finally {
      setIsAddingTask(false);
    }
  };

  const resetAddTaskForm = () => {
    setAddTaskForm({ title: '' });
    setOpenAddTask(null);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto px-4 pt-4 h-full">
        {sections.map((section, sectionIndex) => {
          const sectionTasks = tasksBySection.get(section._id) || [];
          const isAddingToThisSection = openAddTask === section._id;
          const isFirst = sectionIndex === 0;
          const isLast = sectionIndex === sections.length - 1;

          return (
            <div
              key={section._id}
              className="flex-shrink-0 w-[280px] flex flex-col h-full"
            >
              {/* Section Header */}
              <div className="flex items-center justify-between mb-3">
                {editingBucket === section._id ? (
                  <Input
                    value={editingBucketName}
                    onChange={(e) => setEditingBucketName(e.target.value)}
                    onBlur={() => handleSaveBucketName(section._id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveBucketName(section._id);
                      }
                      if (e.key === 'Escape') {
                        setEditingBucket(null);
                        setEditingBucketName('');
                      }
                    }}
                    className="h-7 text-sm font-semibold w-[180px]"
                    autoFocus
                  />
                ) : (
                  <h3
                    className="font-semibold text-sm cursor-pointer hover:bg-muted/30 px-2 py-1 -mx-2 rounded transition-colors"
                    onClick={() => handleStartEditBucket(section)}
                    title="Click to rename"
                  >
                    {section.name}
                  </h3>
                )}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground mr-1">
                    {sectionTasks.length}
                  </span>
                  {/* Bucket Options Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 rounded hover:bg-muted/50 transition-colors">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px]">
                      <DropdownMenuItem onClick={() => handleStartEditBucket(section)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      {onDeleteBucket && (
                        <DropdownMenuItem
                          onClick={() => onDeleteBucket(section._id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      )}
                      {onMoveBucket && (!isFirst || !isLast) && <DropdownMenuSeparator />}
                      {onMoveBucket && !isFirst && (
                        <DropdownMenuItem onClick={() => onMoveBucket(section._id, 'left')}>
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Move left
                        </DropdownMenuItem>
                      )}
                      {onMoveBucket && !isLast && (
                        <DropdownMenuItem onClick={() => onMoveBucket(section._id, 'right')}>
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Move right
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Add Task Button / Form */}
              {isAddingToThisSection ? (
                <div className="bg-card border rounded p-3 mb-2 space-y-3">
                  <div className="flex items-center gap-2">
                    <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                    <Input
                      value={addTaskForm.title}
                      onChange={(e) => setAddTaskForm({ ...addTaskForm, title: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTaskSubmit(section._id);
                        }
                        if (e.key === 'Escape') {
                          resetAddTaskForm();
                        }
                      }}
                      placeholder="Enter a task name * (required)"
                      className="flex-1 border-0 bg-transparent h-8 p-0 focus-visible:ring-0 text-sm"
                      autoFocus
                    />
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                      <PopoverTrigger asChild>
                        <button className="flex items-center gap-2 hover:text-foreground transition-colors">
                          <CalendarIcon className="h-4 w-4" />
                          <span>
                            {addTaskForm.dueDate 
                              ? `${format(addTaskForm.dueDate, 'MMM d')}${addTaskForm.dueTime ? ` at ${addTaskForm.dueTime}` : ''}`
                              : 'Set due date'}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={addTaskForm.dueDate}
                          onSelect={(date) => {
                            setAddTaskForm({ ...addTaskForm, dueDate: date });
                          }}
                          initialFocus
                        />
                        <div className="border-t p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <Input
                              type="time"
                              value={addTaskForm.dueTime || ''}
                              onChange={(e) => setAddTaskForm({ ...addTaskForm, dueTime: e.target.value })}
                              className="flex-1 h-8"
                            />
                          </div>
                          <Button 
                            size="sm" 
                            className="w-full"
                            onClick={() => setDueDateOpen(false)}
                          >
                            Done
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <Button
                    onClick={() => handleAddTaskSubmit(section._id)}
                    disabled={!addTaskForm.title.trim() || isAddingTask}
                    className="w-full"
                  >
                    {isAddingTask ? 'Adding...' : 'Add task'}
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setOpenAddTask(section._id)}
                  className="flex items-center gap-2 px-3 py-2 mb-2 text-sm text-primary hover:bg-muted/30 rounded transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add task</span>
                </button>
              )}

              {/* Tasks */}
              <Droppable droppableId={section._id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'flex-1 space-y-2 min-h-[100px] rounded-lg p-1 transition-colors overflow-y-auto pb-4',
                      snapshot.isDraggingOver && 'bg-muted/30'
                    )}
                  >
                    {sectionTasks.map((task, index) => {
                      const completedSubtasks = task.subtaskCompletedCount ?? 0;
                      const totalSubtasks = task.subtaskCount ?? 0;

                      return (
                        <Draggable key={task._id} draggableId={task._id} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              onClick={() => onTaskClick(task)}
                              className={cn(
                                'bg-card/90 backdrop-blur-sm border rounded p-3 cursor-pointer hover:shadow-md transition-shadow group/card relative',
                                dragSnapshot.isDragging && 'shadow-lg'
                              )}
                              style={{
                                ...dragProvided.draggableProps.style,
                                // Remove any transform rotation
                              }}
                            >
                              {/* Three-dot menu on hover */}
                              <div className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-1 rounded hover:bg-muted transition-colors"
                                    >
                                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    {/* Add Date */}
                                    <DropdownMenuSub>
                                      <DropdownMenuSubTrigger className="cursor-pointer">
                                        <CalendarIcon className="h-4 w-4 mr-2" />
                                        Add Date
                                      </DropdownMenuSubTrigger>
                                      <DropdownMenuSubContent className="p-0">
                                        <Calendar
                                          mode="single"
                                          selected={task.dueDate ? new Date(task.dueDate) : undefined}
                                          onSelect={(date) => {
                                            if (date) {
                                              date.setHours(23, 59, 0, 0);
                                              onUpdateTask?.(task._id, { dueDate: date.toISOString() });
                                            }
                                          }}
                                          initialFocus
                                        />
                                      </DropdownMenuSubContent>
                                    </DropdownMenuSub>

                                    {/* Label */}
                                    <DropdownMenuSub>
                                      <DropdownMenuSubTrigger className="cursor-pointer">
                                        <Tag className="h-4 w-4 mr-2" />
                                        Label
                                      </DropdownMenuSubTrigger>
                                      <DropdownMenuSubContent className="w-36">
                                        {labelOptions.map((label) => (
                                          <DropdownMenuItem
                                            key={label.name}
                                            className="cursor-pointer flex items-center gap-2"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const currentLabels = task.labels || [];
                                              const hasLabel = currentLabels.includes(label.name);
                                              const newLabels = hasLabel
                                                ? currentLabels.filter((l) => l !== label.name)
                                                : [...currentLabels, label.name];
                                              onUpdateTask?.(task._id, { labels: newLabels });
                                            }}
                                          >
                                            <span className={cn('h-3 w-3 rounded-full', label.color)} />
                                            {label.name}
                                            {task.labels?.includes(label.name) && (
                                              <CheckCircle2 className="h-3 w-3 ml-auto" />
                                            )}
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuSubContent>
                                    </DropdownMenuSub>

                                    {/* Progress */}
                                    <DropdownMenuSub>
                                      <DropdownMenuSubTrigger className="cursor-pointer">
                                        <Activity className="h-4 w-4 mr-2" />
                                        Progress
                                      </DropdownMenuSubTrigger>
                                      <DropdownMenuSubContent className="w-36">
                                        {progressOptions.map((option) => (
                                          <DropdownMenuItem
                                            key={option.value}
                                            className="cursor-pointer flex items-center gap-2"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onUpdateTask?.(task._id, { 
                                                progress: option.value,
                                                isCompleted: option.value === 'completed'
                                              });
                                            }}
                                          >
                                            <span className={cn('h-2 w-2 rounded-full', option.color)} />
                                            {option.label}
                                            {task.progress === option.value && (
                                              <CheckCircle2 className="h-3 w-3 ml-auto" />
                                            )}
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuSubContent>
                                    </DropdownMenuSub>

                                    {/* Priority */}
                                    <DropdownMenuSub>
                                      <DropdownMenuSubTrigger className="cursor-pointer">
                                        <Flag className="h-4 w-4 mr-2" />
                                        Priority
                                      </DropdownMenuSubTrigger>
                                      <DropdownMenuSubContent className="w-32">
                                        {priorityOptions.map((option) => (
                                          <DropdownMenuItem
                                            key={option.value}
                                            className="cursor-pointer flex items-center gap-2"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onUpdateTask?.(task._id, { priority: option.value });
                                            }}
                                          >
                                            <span className={cn('h-2 w-2 rounded-full', option.color)} />
                                            {option.label}
                                            {task.priority === option.value && (
                                              <CheckCircle2 className="h-3 w-3 ml-auto" />
                                            )}
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuSubContent>
                                    </DropdownMenuSub>

                                    <DropdownMenuSeparator />

                                    {/* Duplicate Task */}
                                    <DropdownMenuItem 
                                      className="cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDuplicateTask?.(task);
                                      }}
                                    >
                                      <Copy className="h-4 w-4 mr-2" />
                                      Duplicate
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />

                                    {/* Delete */}
                                    <DropdownMenuItem 
                                      className="cursor-pointer text-destructive focus:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteTask?.(task._id);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

                              {/* Task Title Row */}
                              <div className="flex items-start gap-2 mb-2 pr-6">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleComplete(task);
                                  }}
                                  className="mt-0.5 shrink-0"
                                >
                                  {task.isCompleted ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                  ) : (
                                    <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
                                  )}
                                </button>
                                <span
                                  className={cn(
                                    'font-medium text-sm flex-1',
                                    task.isCompleted && 'line-through text-muted-foreground'
                                  )}
                                >
                                  {task.title}
                                </span>
                              </div>

                              {/* Notes on Card */}
                              {task.showNotesOnCard && task.description && (
                                <div className="mb-2 pl-7">
                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                    {task.description.replace(/<[^>]*>/g, '')}
                                  </p>
                                </div>
                              )}

                              {/* Meta Row */}
                              <div className="flex items-center justify-between pl-7">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {totalSubtasks > 0 && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      <span>{completedSubtasks}/{totalSubtasks}</span>
                                    </div>
                                  )}
                                  {task.dueDate && (
                                    <div className="flex items-center gap-1">
                                      <CalendarIcon className="h-3.5 w-3.5" />
                                      <span>{format(new Date(task.dueDate), 'MMM d')}</span>
                                    </div>
                                  )}
                                </div>

                                {task.assignee && (
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={task.assignee.avatar} />
                                    <AvatarFallback className="text-[10px]">
                                      {getInitials(task.assignee.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
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
            </div>
          );
        })}

        {/* Add New Bucket */}
        <button
          onClick={onAddBucket}
          className="flex-shrink-0 w-[200px] flex items-center justify-center gap-2 h-12 text-sm text-primary hover:bg-muted/30 rounded border border-dashed transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add a new bucket</span>
        </button>
      </div>
    </DragDropContext>
  );
}
