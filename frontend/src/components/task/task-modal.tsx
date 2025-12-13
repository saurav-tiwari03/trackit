'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Send,
} from 'lucide-react';
import { Task, Comment, Subtask } from '@/types';
import { Modal, ModalHeader, ModalContent } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { TipTapEditor, TipTapViewer } from '@/components/ui/tiptap-editor';
import { cn } from '@/lib/utils';
import { useProjectsStore } from '@/store/projects';
import { tasksAPI, commentsAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface TaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

const priorityColors: Record<string, string> = {
  P1: 'bg-red-500',
  P2: 'bg-orange-500',
  P3: 'bg-yellow-500',
  P4: 'bg-gray-400',
};

export function TaskModal({ task, isOpen, onClose }: TaskModalProps) {
  const { user } = useAuthStore();
  const { updateTask, deleteTask, fetchProject } = useProjectsStore();
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [isDateOpen, setIsDateOpen] = useState(false);

  useEffect(() => {
    if (task) {
      setEditedTask({ 
        ...task,
        subtasks: task.subtasks || [],
        labels: task.labels || [],
      });
      setEditedDescription(task.description || '');
      setIsEditingDescription(false);
      setIsAddingSubtask(false);
      fetchComments();
    }
  }, [task]);

  const fetchComments = async () => {
    if (!task) return;
    try {
      const response = await commentsAPI.getForTask(task._id);
      setComments(response.data.data);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const handleToggleComplete = async () => {
    if (!editedTask) return;
    try {
      await updateTask(editedTask._id, { isCompleted: !editedTask.isCompleted });
      setEditedTask({ ...editedTask, isCompleted: !editedTask.isCompleted });
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleSaveDescription = async () => {
    if (!editedTask) return;
    try {
      await updateTask(editedTask._id, { description: editedDescription });
      setEditedTask({ ...editedTask, description: editedDescription });
      setIsEditingDescription(false);
    } catch (error) {
      console.error('Failed to update description:', error);
    }
  };

  const handleAddSubtask = async () => {
    if (!editedTask || !newSubtask.trim()) return;
    try {
      const response = await tasksAPI.addSubtask(editedTask._id, {
        title: newSubtask,
      });
      const updatedTask = response.data.data;
      setEditedTask({
        ...updatedTask,
        subtasks: updatedTask.subtasks || [],
        labels: updatedTask.labels || [],
      });
      setNewSubtask('');
      setIsAddingSubtask(false);
    } catch (error) {
      console.error('Failed to add subtask:', error);
    }
  };

  const handleToggleSubtask = async (subtask: Subtask) => {
    if (!editedTask) return;
    try {
      const response = await tasksAPI.updateSubtask(
        editedTask._id,
        subtask._id,
        { isCompleted: !subtask.isCompleted }
      );
      const updatedTask = response.data.data;
      setEditedTask({
        ...updatedTask,
        subtasks: updatedTask.subtasks || [],
        labels: updatedTask.labels || [],
      });
    } catch (error) {
      console.error('Failed to update subtask:', error);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!editedTask) return;
    try {
      const response = await tasksAPI.deleteSubtask(editedTask._id, subtaskId);
      const updatedTask = response.data.data;
      setEditedTask({
        ...updatedTask,
        subtasks: updatedTask.subtasks || [],
        labels: updatedTask.labels || [],
      });
    } catch (error) {
      console.error('Failed to delete subtask:', error);
    }
  };

  const handleAddComment = async () => {
    if (!editedTask || !newComment.trim()) return;
    try {
      const response = await commentsAPI.create({
        content: newComment,
        task: editedTask._id,
      });
      setComments([response.data.data, ...comments]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleDelete = async () => {
    if (!editedTask) return;
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(editedTask._id);
        onClose();
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  const handlePriorityChange = async (priority: 'P1' | 'P2' | 'P3' | 'P4') => {
    if (!editedTask) return;
    try {
      await updateTask(editedTask._id, { priority });
      setEditedTask({ ...editedTask, priority });
    } catch (error) {
      console.error('Failed to update priority:', error);
    }
  };

  const handleDateChange = async (date: Date | undefined) => {
    if (!editedTask) return;
    try {
      const dueDate = date ? date.toISOString() : undefined;
      await tasksAPI.update(editedTask._id, { dueDate: dueDate as any });
      setEditedTask({ ...editedTask, dueDate });
      setIsDateOpen(false);
    } catch (error) {
      console.error('Failed to update due date:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDateDisplay = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!editedTask) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="flex h-[70vh]">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ModalHeader onClose={onClose}>
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleComplete}
                className="cursor-pointer"
              >
                {editedTask.isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <Circle className="w-6 h-6 text-muted-foreground hover:text-foreground transition-colors" />
                )}
              </button>
              <span
                className={cn(
                  editedTask.isCompleted && 'line-through text-muted-foreground'
                )}
              >
                {editedTask.title}
              </span>
            </div>
          </ModalHeader>

          <ModalContent className="flex-1 overflow-y-auto">
            {/* Description */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Description
                </h3>
                {!isEditingDescription && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingDescription(true)}
                  >
                    Edit
                  </Button>
                )}
              </div>
              {isEditingDescription ? (
                <div className="space-y-3">
                  <TipTapEditor
                    content={editedDescription}
                    onChange={setEditedDescription}
                    placeholder="Add a description..."
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveDescription}>
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsEditingDescription(false);
                        setEditedDescription(editedTask.description || '');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : editedTask.description ? (
                <div
                  className="text-sm cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2"
                  onClick={() => setIsEditingDescription(true)}
                >
                  <TipTapViewer content={editedTask.description} />
                </div>
              ) : (
                <p
                  className="text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2"
                  onClick={() => setIsEditingDescription(true)}
                >
                  Click to add description...
                </p>
              )}
            </div>

            {/* Subtasks */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Subtasks ({(editedTask.subtasks || []).filter(s => s.isCompleted).length}/{(editedTask.subtasks || []).length})
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddingSubtask(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>

              <div className="space-y-2">
                {isAddingSubtask && (
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input
                      value={newSubtask}
                      onChange={e => setNewSubtask(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSubtask();
                        }
                        if (e.key === 'Escape') {
                          setIsAddingSubtask(false);
                          setNewSubtask('');
                        }
                      }}
                      placeholder="Enter subtask title and press Enter..."
                      className="flex-1 h-8 text-sm border-0 bg-transparent focus-visible:ring-0"
                      autoFocus
                    />
                    <Button size="sm" onClick={handleAddSubtask} disabled={!newSubtask.trim()}>
                      Add
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setIsAddingSubtask(false);
                        setNewSubtask('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                <AnimatePresence>
                  {(editedTask.subtasks || []).map(subtask => (
                    <motion.div
                      key={subtask._id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 group p-2 hover:bg-muted/30 rounded-lg"
                    >
                      <button
                        onClick={() => handleToggleSubtask(subtask)}
                        className="cursor-pointer shrink-0"
                      >
                        {subtask.isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <Circle className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        )}
                      </button>
                      <span
                        className={cn(
                          'text-sm flex-1',
                          subtask.isCompleted && 'line-through text-muted-foreground'
                        )}
                      >
                        {subtask.title}
                      </span>
                      <button
                        onClick={() => handleDeleteSubtask(subtask._id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 hover:bg-destructive/10 rounded"
                      >
                        <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {(editedTask.subtasks || []).length === 0 && !isAddingSubtask && (
                  <p className="text-sm text-muted-foreground py-2">No subtasks yet</p>
                )}
              </div>
            </div>

            {/* Comments */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Comments
              </h3>

              <div className="flex items-start gap-3 mb-4">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {user?.name ? getInitials(user.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                  <Input
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                    placeholder="Write a comment..."
                    className="flex-1 border-0 bg-transparent h-8 focus-visible:ring-0"
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {comments.map(comment => (
                  <motion.div
                    key={comment._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(comment.author.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {comment.author.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateDisplay(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </ModalContent>
        </div>

        {/* Sidebar */}
        <div className="w-64 border-l p-4 bg-muted/30 overflow-y-auto">
          <div className="space-y-4">
            {/* Priority */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">
                Priority
              </h4>
              <div className="flex gap-1">
                {(['P1', 'P2', 'P3', 'P4'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => handlePriorityChange(p)}
                    className={cn(
                      'px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer',
                      editedTask.priority === p
                        ? cn(priorityColors[p], 'text-white')
                        : 'bg-muted text-muted-foreground hover:bg-accent'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">
                Status
              </h4>
              <Badge
                variant={
                  editedTask.status === 'completed'
                    ? 'default'
                    : editedTask.status === 'in_progress'
                      ? 'secondary'
                      : 'outline'
                }
              >
                {editedTask.status === 'open'
                  ? 'To Do'
                  : editedTask.status === 'in_progress'
                    ? 'In Progress'
                    : 'Completed'}
              </Badge>
            </div>

            {/* Due Date */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">
                Due Date
              </h4>
              <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !editedTask.dueDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editedTask.dueDate
                      ? format(new Date(editedTask.dueDate), 'PPP')
                      : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editedTask.dueDate ? new Date(editedTask.dueDate) : undefined}
                    onSelect={handleDateChange}
                    initialFocus
                  />
                  {editedTask.dueDate && (
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => handleDateChange(undefined)}
                      >
                        Clear date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* Labels */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">
                Labels
              </h4>
              <div className="flex flex-wrap gap-1">
                {(editedTask.labels || []).map((label, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {label}
                  </Badge>
                ))}
                {(!editedTask.labels || editedTask.labels.length === 0) && (
                  <span className="text-xs text-muted-foreground">No labels</span>
                )}
              </div>
            </div>

            {/* Delete */}
            <div className="pt-4 border-t">
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Task
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
