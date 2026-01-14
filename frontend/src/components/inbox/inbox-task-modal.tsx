'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  MoreHorizontal,
  ChevronDown,
  Tag,
  Users,
  RefreshCw,
  X as XIcon,
  Paperclip,
  FileText,
  ImagePlus,
} from 'lucide-react';
import { Task, Section, User, RepeatConfig } from '@/types';
import { Modal, ModalHeader, ModalContent } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/sonner';
import { TipTapEditor, TipTapViewer } from '@/components/ui/tiptap-editor';
import { cn } from '@/lib/utils';
import { tasksAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface InboxTaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  sections: Section[];
  projectName: string;
  onTaskUpdated: () => void;
}

const priorityConfig: Record<string, { color: string; bg: string; label: string }> = {
  P1: { color: 'text-red-500', bg: 'bg-red-500', label: 'Urgent' },
  P2: { color: 'text-orange-500', bg: 'bg-orange-500', label: 'Important' },
  P3: { color: 'text-yellow-500', bg: 'bg-yellow-500', label: 'Medium' },
  P4: { color: 'text-gray-400', bg: 'bg-gray-400', label: 'Low' },
};

const progressOptions = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const repeatOptions = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function InboxTaskModal({
  task,
  isOpen,
  onClose,
  sections,
  projectName,
  onTaskUpdated,
}: InboxTaskModalProps) {
  const { user } = useAuthStore();
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [showNotesOnCard, setShowNotesOnCard] = useState(false);
  const [showChecklistOnCard, setShowChecklistOnCard] = useState(true);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [isLoadingSubtasks, setIsLoadingSubtasks] = useState(false);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});

  // Fetch signed URLs for attachments
  const fetchAttachmentUrls = useCallback(async (taskId: string, attachments: Task['attachments']) => {
    if (!attachments || attachments.length === 0) return;
    
    const urlMap: Record<string, string> = {};
    await Promise.all(
      attachments.map(async (att) => {
        try {
          const response = await tasksAPI.getAttachmentUrl(taskId, att._id);
          urlMap[att._id] = response.data.data.url;
        } catch (e) {
          console.error('Failed to get attachment URL:', e);
          // Fallback to direct URL for local storage
          const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';
          urlMap[att._id] = att.storage === 's3' ? att.url : `${baseUrl}${att.url}`;
        }
      })
    );
    setAttachmentUrls(urlMap);
  }, []);

  useEffect(() => {
    if (task) {
      setEditedTask({ ...task });
      setNotes(task.description || '');
      setShowNotesOnCard(task.showNotesOnCard || false);
      setShowChecklistOnCard(task.showChecklistOnCard !== false);
      
      // Fetch subtasks
      void (async () => {
        try {
          setIsLoadingSubtasks(true);
          const response = await tasksAPI.getSubtasks(task._id);
          setSubtasks(response.data.data || []);
        } catch (e) {
          console.error('Failed to fetch subtasks:', e);
          setSubtasks([]);
        } finally {
          setIsLoadingSubtasks(false);
        }
      })();

      // Fetch attachment URLs
      fetchAttachmentUrls(task._id, task.attachments);
    }
  }, [task, fetchAttachmentUrls]);

  const handleToggleComplete = async () => {
    if (!editedTask) return;
    try {
      await tasksAPI.update(editedTask._id, { isCompleted: !editedTask.isCompleted });
      setEditedTask({
        ...editedTask,
        isCompleted: !editedTask.isCompleted,
        status: !editedTask.isCompleted ? 'completed' : 'open',
        progress: !editedTask.isCompleted ? 'completed' : 'not_started',
      });
      onTaskUpdated();
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleFieldUpdate = async (field: string, value: unknown) => {
    if (!editedTask) return;
    try {
      // Sync isCompleted with progress status
      let updateData: Record<string, unknown> = { [field]: value };
      if (field === 'progress') {
        if (value === 'completed') {
          updateData.isCompleted = true;
        } else {
          updateData.isCompleted = false;
        }
      }
      
      await tasksAPI.update(editedTask._id, updateData);
      setEditedTask({ ...editedTask, ...updateData });
      onTaskUpdated();
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleNotesUpdate = async () => {
    if (!editedTask) return;
    try {
      await tasksAPI.update(editedTask._id, { description: notes });
      setEditedTask({ ...editedTask, description: notes });
      toast.success('Notes saved');
    } catch (error) {
      console.error('Failed to save notes:', error);
      toast.error('Failed to save notes');
    }
  };

  const handleAddChecklistItem = async () => {
    if (!editedTask || !newChecklistItem.trim()) return;
    try {
      const response = await tasksAPI.addSubtask(editedTask._id, {
        title: newChecklistItem,
        priority: 'P4',
      });
      setSubtasks((prev) => [...prev, response.data.data]);
      setNewChecklistItem('');
      onTaskUpdated(); // Refresh to update subtask counts
    } catch (error) {
      console.error('Failed to add checklist item:', error);
      toast.error('Failed to add item');
    }
  };

  const handleToggleChecklistItem = async (subtask: Task) => {
    if (!editedTask) return;
    try {
      await tasksAPI.updateSubtask(editedTask._id, subtask._id, {
        isCompleted: !subtask.isCompleted,
      });
      setSubtasks((prev) =>
        prev.map((s) =>
          s._id === subtask._id ? { ...s, isCompleted: !s.isCompleted } : s
        )
      );
      onTaskUpdated(); // Refresh to update subtask counts
    } catch (error) {
      console.error('Failed to update item:', error);
    }
  };

  const handleDeleteChecklistItem = async (subtaskId: string) => {
    if (!editedTask) return;
    try {
      await tasksAPI.deleteSubtask(editedTask._id, subtaskId);
      setSubtasks((prev) => prev.filter((s) => s._id !== subtaskId));
      onTaskUpdated(); // Refresh to update subtask counts
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handleUploadAttachments = async (fileList: FileList | null) => {
    if (!editedTask || !fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setIsUploadingAttachments(true);
    try {
      const response = await tasksAPI.uploadAttachments(editedTask._id, files);
      const updatedTask = response.data.data;
      setEditedTask(updatedTask);
      // Fetch signed URLs for the new attachments
      await fetchAttachmentUrls(updatedTask._id, updatedTask.attachments);
      toast.success('Attachments uploaded');
      onTaskUpdated();
    } catch (error) {
      console.error('Failed to upload:', error);
      toast.error('Failed to upload attachments');
    } finally {
      setIsUploadingAttachments(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!editedTask) return;
    try {
      const response = await tasksAPI.deleteAttachment(editedTask._id, attachmentId);
      setEditedTask(response.data.data);
      toast.success('Attachment deleted');
      onTaskUpdated();
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      toast.error('Failed to delete attachment');
    }
  };

  const getAttachmentUrl = (att: { _id: string; url: string; storage?: string }) => {
    // Use cached signed URL if available
    if (attachmentUrls[att._id]) {
      return attachmentUrls[att._id];
    }
    // Fallback for local storage
    if (att.storage !== 's3') {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';
      return `${baseUrl}${att.url}`;
    }
    // Return placeholder for S3 (will be loaded)
    return '';
  };

  const isPdfFile = (mimeType: string) => mimeType === 'application/pdf';
  const isImageFile = (mimeType: string) => mimeType.startsWith('image/');

  const handleDelete = async () => {
    if (!editedTask) return;
    try {
      await tasksAPI.delete(editedTask._id);
      toast.success('Task deleted');
      setIsDeleteDialogOpen(false);
      onClose();
      onTaskUpdated();
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('Failed to delete task');
    }
  };

  const getCurrentSectionName = (): string => {
    const section = sections.find((s) => s._id === editedTask?.section);
    return section?.name || 'Unknown';
  };

  const getRepeatLabel = (): string => {
    if (!editedTask?.repeat) return 'Does not repeat';
    const freq = editedTask.repeat.frequency;
    return repeatOptions.find((o) => o.value === freq)?.label || 'Does not repeat';
  };

  const completedItems = subtasks.filter((s) => s.isCompleted).length;
  const totalItems = subtasks.length;

  if (!editedTask) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex flex-col max-h-[85vh]">
        {/* Header */}
        <ModalHeader onClose={onClose}>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-primary font-medium">{projectName}</span>
            <div className="flex items-center gap-3">
              <button onClick={handleToggleComplete} className="shrink-0">
                {editedTask.isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <Circle className="w-6 h-6 text-primary" />
                )}
              </button>
              <Input
                value={editedTask.title}
                onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                onBlur={() => handleFieldUpdate('title', editedTask.title)}
                className="text-lg font-semibold border-0 bg-transparent h-auto p-0 focus-visible:ring-0"
              />
            </div>
          </div>
        </ModalHeader>

        <ModalContent className="flex-1 overflow-y-auto">
          {/* Assignee */}
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={editedTask.assignee?.avatar} />
                <AvatarFallback className="text-xs">
                  {editedTask.assignee ? getInitials(editedTask.assignee.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">
                {editedTask.assignee?.name || 'Unassigned'}
              </span>
            </div>
          </div>

          {/* Labels */}
          <div className="flex items-center gap-3 mb-6">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <button className="text-sm text-muted-foreground hover:text-foreground">
              Add label
            </button>
          </div>

          {/* Bucket, Progress, Priority Row */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            {/* Bucket */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Bucket
              </label>
              <Select
                value={editedTask.section}
                onValueChange={(v) => handleFieldUpdate('section', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{getCurrentSectionName()}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => (
                    <SelectItem key={section._id} value={section._id}>
                      {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Progress */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Progress
              </label>
              <Select
                value={editedTask.progress || 'not_started'}
                onValueChange={(v) => handleFieldUpdate('progress', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <Circle className="h-3 w-3 text-muted-foreground" />
                      {progressOptions.find((o) => o.value === (editedTask.progress || 'not_started'))?.label}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {progressOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Priority
              </label>
              <Select
                value={editedTask.priority}
                onValueChange={(v) => handleFieldUpdate('priority', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', priorityConfig[editedTask.priority]?.bg)} />
                      {priorityConfig[editedTask.priority]?.label}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2 w-2 rounded-full', config.bg)} />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Start Date, Due Date, Repeat Row */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* Start Date */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Start date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {editedTask.startDate
                      ? format(new Date(editedTask.startDate), 'MMM d, h:mm a')
                      : 'Start anytime'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editedTask.startDate ? new Date(editedTask.startDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        // Preserve existing time if set, otherwise use current time
                        const existingDate = editedTask.startDate ? new Date(editedTask.startDate) : new Date();
                        date.setHours(existingDate.getHours(), existingDate.getMinutes(), 0, 0);
                      }
                      handleFieldUpdate('startDate', date?.toISOString());
                    }}
                    disabled={editedTask.dueDate ? { after: new Date(editedTask.dueDate) } : undefined}
                    initialFocus
                  />
                  <div className="border-t p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="time"
                        value={editedTask.startDate ? format(new Date(editedTask.startDate), 'HH:mm') : ''}
                        onChange={(e) => {
                          const date = editedTask.startDate ? new Date(editedTask.startDate) : new Date();
                          const [hours, minutes] = e.target.value.split(':').map(Number);
                          date.setHours(hours, minutes, 0, 0);
                          handleFieldUpdate('startDate', date.toISOString());
                        }}
                        className="flex-1 h-8"
                      />
                    </div>
                  </div>
                  {editedTask.dueDate && (
                    <p className="text-xs text-muted-foreground px-3 pb-2">
                      Must be on or before {format(new Date(editedTask.dueDate), 'MMM d, yyyy')}
                    </p>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* Due Date */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Due date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {editedTask.dueDate
                      ? format(new Date(editedTask.dueDate), 'MMM d, h:mm a')
                      : 'Due anytime'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editedTask.dueDate ? new Date(editedTask.dueDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        // Preserve existing time if set, otherwise use end of day
                        const existingDate = editedTask.dueDate ? new Date(editedTask.dueDate) : new Date();
                        if (!editedTask.dueDate) {
                          existingDate.setHours(23, 59, 0, 0);
                        }
                        date.setHours(existingDate.getHours(), existingDate.getMinutes(), 0, 0);
                      }
                      handleFieldUpdate('dueDate', date?.toISOString());
                    }}
                    disabled={editedTask.startDate ? { before: new Date(editedTask.startDate) } : undefined}
                    initialFocus
                  />
                  <div className="border-t p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="time"
                        value={editedTask.dueDate ? format(new Date(editedTask.dueDate), 'HH:mm') : ''}
                        onChange={(e) => {
                          const date = editedTask.dueDate ? new Date(editedTask.dueDate) : new Date();
                          const [hours, minutes] = e.target.value.split(':').map(Number);
                          date.setHours(hours, minutes, 0, 0);
                          handleFieldUpdate('dueDate', date.toISOString());
                        }}
                        className="flex-1 h-8"
                      />
                    </div>
                  </div>
                  {editedTask.startDate && (
                    <p className="text-xs text-muted-foreground px-3 pb-2">
                      Must be on or after {format(new Date(editedTask.startDate), 'MMM d, yyyy')}
                    </p>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* Repeat */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Repeat
              </label>
              <Select
                value={editedTask.repeat?.frequency || 'none'}
                onValueChange={(v) => {
                  if (v === 'none') {
                    handleFieldUpdate('repeat', null);
                  } else {
                    handleFieldUpdate('repeat', { frequency: v });
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      {getRepeatLabel()}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {repeatOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Notes</label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="show-notes"
                  checked={showNotesOnCard}
                  onCheckedChange={(checked) => {
                    setShowNotesOnCard(!!checked);
                    handleFieldUpdate('showNotesOnCard', !!checked);
                  }}
                />
                <label htmlFor="show-notes" className="text-xs text-muted-foreground">
                  Show on card
                </label>
              </div>
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesUpdate}
              placeholder="Type a description or add notes here"
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Checklist */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Checklist</label>
                <span className="text-xs text-muted-foreground">
                  {completedItems} / {totalItems}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="show-checklist"
                  checked={showChecklistOnCard}
                  onCheckedChange={(checked) => {
                    setShowChecklistOnCard(!!checked);
                    handleFieldUpdate('showChecklistOnCard', !!checked);
                  }}
                />
                <label htmlFor="show-checklist" className="text-xs text-muted-foreground">
                  Show on card
                </label>
              </div>
            </div>

            <div className="space-y-2">
              {subtasks.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center gap-3 group"
                >
                  <button onClick={() => handleToggleChecklistItem(item)}>
                    {item.isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  <span
                    className={cn(
                      'flex-1 text-sm',
                      item.isCompleted && 'line-through text-muted-foreground'
                    )}
                  >
                    {item.title}
                  </span>
                  <button
                    onClick={() => handleDeleteChecklistItem(item._id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                  >
                    <XIcon className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              ))}

              {/* Add Item */}
              <div className="flex items-center gap-3">
                <Circle className="h-5 w-5 text-muted-foreground" />
                <Input
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddChecklistItem();
                    }
                  }}
                  placeholder="Add an item"
                  className="flex-1 border-0 bg-transparent h-8 p-0 focus-visible:ring-0"
                />
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div>
            <label className="text-sm font-medium mb-3 block">Attachments</label>
            <div className="flex flex-wrap gap-3">
              {/* Add Image Card */}
              <label className="flex flex-col items-center justify-center w-[120px] h-[120px] bg-muted/50 hover:bg-muted rounded-xl cursor-pointer transition-colors border-2 border-dashed border-muted-foreground/20 hover:border-muted-foreground/40">
                <ImagePlus className="h-6 w-6 text-muted-foreground mb-2" />
                <span className="text-xs text-muted-foreground font-medium">Add Image</span>
                <input
                  type="file"
                  multiple
                  accept="application/pdf,image/*"
                  className="hidden"
                  disabled={isUploadingAttachments}
                  onChange={(e) => handleUploadAttachments(e.target.files)}
                />
              </label>

              {/* Attachment Cards */}
              {editedTask.attachments?.map((att) => (
                <div
                  key={att._id}
                  className="relative group w-[120px]"
                >
                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteAttachment(att._id)}
                    className="absolute -top-2 -right-2 z-10 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>

                  {/* Attachment preview */}
                  <a
                    href={getAttachmentUrl(att)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <div className="w-[120px] h-[100px] bg-muted rounded-xl overflow-hidden flex items-center justify-center">
                      {isImageFile(att.mimeType) ? (
                        <img
                          src={getAttachmentUrl(att)}
                          alt={att.name}
                          className="w-full h-full object-cover"
                        />
                      ) : isPdfFile(att.mimeType) ? (
                        <div className="flex flex-col items-center justify-center">
                          <FileText className="h-10 w-10 text-rose-500" />
                          <span className="text-[10px] text-rose-500 font-semibold mt-1">PDF</span>
                        </div>
                      ) : (
                        <Paperclip className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 truncate text-center px-1">
                      {att.name}
                    </p>
                  </a>
                </div>
              ))}

              {/* Loading indicator */}
              {isUploadingAttachments && (
                <div className="flex flex-col items-center justify-center w-[120px] h-[120px] bg-muted/50 rounded-xl">
                  <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-muted-foreground mt-2">Uploading...</span>
                </div>
              )}
            </div>
          </div>

          {/* Delete Button */}
          <div className="mt-8 pt-4 border-t">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Task
            </Button>
          </div>
        </ModalContent>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{editedTask?.title}&quot;? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Modal>
  );
}
