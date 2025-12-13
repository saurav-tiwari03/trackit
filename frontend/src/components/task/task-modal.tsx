'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Send,
  ChevronDown,
  ChevronUp,
  Flag,
  Tag,
  Clock,
  Timer,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Download,
  X as XIcon,
} from 'lucide-react';
import { Task, Comment, Subtask, Section, Attachment } from '@/types';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { toast } from '@/components/ui/sonner';
import { TipTapEditor, TipTapViewer } from '@/components/ui/tiptap-editor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { cn } from '@/lib/utils';
import { useProjectsStore } from '@/store/projects';
import { tasksAPI, commentsAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

// IMPORTANT: keep worker version in sync with the PDF.js API version used by react-pdf.
// Using `pdfjs.version` avoids "API version does not match Worker version" errors.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface TaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

const priorityConfig: Record<string, { color: string; bg: string; label: string }> = {
  P1: { color: 'text-red-500', bg: 'bg-red-500', label: 'Urgent' },
  P2: { color: 'text-orange-500', bg: 'bg-orange-500', label: 'High' },
  P3: { color: 'text-yellow-500', bg: 'bg-yellow-500', label: 'Medium' },
  P4: { color: 'text-gray-400', bg: 'bg-gray-400', label: 'Low' },
};

export function TaskModal({ task, isOpen, onClose }: TaskModalProps) {
  const { user } = useAuthStore();
  const { updateTask, deleteTask, projects } = useProjectsStore();
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [isDateOpenMobile, setIsDateOpenMobile] = useState(false);
  const [isDateOpenDesktop, setIsDateOpenDesktop] = useState(false);
  const [draftDueDate, setDraftDueDate] = useState<Date | undefined>(undefined);
  const [isDraftDueDateDirty, setIsDraftDueDateDirty] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [pdfNumPages, setPdfNumPages] = useState(0);
  const pdfScrollRef = useRef<HTMLDivElement | null>(null);
  const [pdfPageWidth, setPdfPageWidth] = useState<number>(900);
  const [attachmentToRemove, setAttachmentToRemove] = useState<Attachment | null>(null);
  const [isRemovingAttachment, setIsRemovingAttachment] = useState(false);

  useEffect(() => {
    if (!pdfScrollRef.current) return;
    const el = pdfScrollRef.current;
    const ro = new ResizeObserver(() => {
      // Keep a little padding so it doesn't touch the edges
      const next = Math.max(320, Math.min(1100, el.clientWidth - 24));
      setPdfPageWidth(next);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Get sections from the task's project
  const getProjectSections = (): Section[] => {
    if (!editedTask) return [];
    const projectId = typeof editedTask.project === 'string'
      ? editedTask.project
      : editedTask.project._id;
    const project = projects.find(p => p._id === projectId);
    return project?.sections || [];
  };

  const sections = getProjectSections();

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

  const handleUploadAttachments = async (fileList: FileList | null) => {
    if (!editedTask || !fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setIsUploadingAttachments(true);
    try {
      const response = await tasksAPI.uploadAttachments(editedTask._id, files);
      const updatedTask = response.data.data as Task;
      setEditedTask({
        ...updatedTask,
        subtasks: updatedTask.subtasks || [],
        labels: updatedTask.labels || [],
      });
      toast.success('Attachments uploaded');
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to upload attachments';
      toast.error(message);
    } finally {
      setIsUploadingAttachments(false);
    }
  };

  const getAttachmentIcon = (att: Attachment) => {
    if (att.mimeType?.includes('pdf')) return <FileText className="h-4 w-4" />;
    if (att.mimeType?.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    return <Paperclip className="h-4 w-4" />;
  };

  const openPreview = async (att: Attachment) => {
    if (!editedTask) return;
    setPreviewAttachment(att);
    setIsPreviewLoading(true);
    setPreviewUrl('');
    setPdfNumPages(0);
    try {
      const response = await tasksAPI.getAttachmentUrl(editedTask._id, att._id);
      setPreviewUrl(response.data.data.url);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to load preview';
      toast.error(message);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const confirmRemoveAttachment = async () => {
    if (!editedTask || !attachmentToRemove) return;
    setIsRemovingAttachment(true);
    try {
      const response = await tasksAPI.deleteAttachment(
        editedTask._id,
        attachmentToRemove._id
      );
      const updatedTask = response.data.data as Task;
      setEditedTask({
        ...updatedTask,
        subtasks: updatedTask.subtasks || [],
        labels: updatedTask.labels || [],
      });
      toast.success('Attachment removed');
      setAttachmentToRemove(null);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to remove attachment';
      toast.error(message);
    } finally {
      setIsRemovingAttachment(false);
    }
  };

  const handleDelete = async () => {
    if (!editedTask) return;
    try {
      await deleteTask(editedTask._id);
      toast.success('Task deleted successfully');
      setIsDeleteDialogOpen(false);
      onClose();
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('Failed to delete task');
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

  const handleSectionChange = async (sectionId: string) => {
    if (!editedTask) return;
    try {
      await tasksAPI.update(editedTask._id, { section: sectionId });
      setEditedTask({ ...editedTask, section: sectionId });
      toast.success('Section updated');
    } catch (error) {
      console.error('Failed to update section:', error);
      toast.error('Failed to update section');
    }
  };

  const getCurrentSectionName = (): string => {
    const section = sections.find(s => s._id === editedTask?.section);
    return section?.name || 'Unknown';
  };

  const isValidDate = (d: unknown): d is Date =>
    d instanceof Date && !Number.isNaN(d.getTime());

  const parseTimeString = (raw: string): { hours: number; minutes: number } | null => {
    const value = raw.trim();
    if (!value) return null;

    // Supports:
    // - "HH:mm" (24h)
    // - "hh:mm AM/PM" (12h) - some browsers expose this string even for <input type="time">
    const match = value.match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
    if (!match) return null;

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const ampm = match[3]?.toUpperCase();

    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (minutes < 0 || minutes > 59) return null;

    if (ampm) {
      if (hours < 1 || hours > 12) return null;
      if (ampm === 'PM' && hours !== 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
    } else {
      if (hours < 0 || hours > 23) return null;
    }

    return { hours, minutes };
  };

  const initDraftDueDate = () => {
    const base = editedTask?.dueDate ? new Date(editedTask.dueDate) : undefined;
    setDraftDueDate(isValidDate(base) ? base : undefined);
    setIsDraftDueDateDirty(false);
  };

  const commitDueDate = async (date: Date | undefined, closePopover = false, isMobile = false) => {
    if (!editedTask) return;
    try {
      if (date && !isValidDate(date)) {
        toast.error('Invalid date/time');
        return;
      }
      const dueDate = date ? date.toISOString() : undefined;
      await tasksAPI.update(editedTask._id, { dueDate: dueDate as string });
      setEditedTask({ ...editedTask, dueDate });
      if (closePopover) {
        if (isMobile) {
          setIsDateOpenMobile(false);
        } else {
          setIsDateOpenDesktop(false);
        }
      }
    } catch (error) {
      console.error('Failed to update due date:', error);
      toast.error('Failed to update due date');
    }
  };

  const handleTimeChange = (timeString: string) => {
    const parsed = parseTimeString(timeString);
    if (!parsed) {
      toast.error('Invalid time');
      return;
    }

    const base = draftDueDate ? new Date(draftDueDate) : new Date();
    if (!isValidDate(base)) {
      toast.error('Invalid date/time');
      return;
    }

    base.setHours(parsed.hours, parsed.minutes, 0, 0);
    setDraftDueDate(base);
    setIsDraftDueDateDirty(true);
  };

  const handleDraftDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const hours = draftDueDate?.getHours() ?? (editedTask?.dueDate ? new Date(editedTask.dueDate).getHours() : 9);
    const minutes = draftDueDate?.getMinutes() ?? (editedTask?.dueDate ? new Date(editedTask.dueDate).getMinutes() : 0);
    const next = new Date(date);
    next.setHours(hours, minutes, 0, 0);
    setDraftDueDate(next);
    setIsDraftDueDateDirty(true);
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

  const completedSubtasks = (editedTask.subtasks || []).filter(s => s.isCompleted).length;
  const totalSubtasks = (editedTask.subtasks || []).length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="flex flex-col lg:flex-row h-[100dvh] sm:h-[85vh]">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <ModalHeader onClose={onClose}>
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={handleToggleComplete}
                className="cursor-pointer shrink-0"
              >
                {editedTask.isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <Circle className="w-6 h-6 text-muted-foreground hover:text-foreground transition-colors" />
                )}
              </button>
              <span
                className={cn(
                  'truncate',
                  editedTask.isCompleted && 'line-through text-muted-foreground'
                )}
              >
                {editedTask.title}
              </span>
            </div>
          </ModalHeader>

          <ModalContent className="flex-1 overflow-y-auto">
            {/* Mobile: Collapsible Details Section */}
            <div className="lg:hidden mb-4">
              <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-2 h-2 rounded-full', priorityConfig[editedTask.priority]?.bg)} />
                    <span className="text-sm font-medium">Task Details</span>
                    {editedTask.dueDate && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {format(new Date(editedTask.dueDate), 'MMM d')}
                      </Badge>
                    )}
                  </div>
                  {isDetailsOpen ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-3 p-4 bg-muted/30 rounded-xl space-y-4">
                    {/* Priority */}
                    <div>
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                        <Flag className="w-3 h-3" />
                        Priority
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(['P1', 'P2', 'P3', 'P4'] as const).map(p => (
                          <button
                            key={p}
                            onClick={() => handlePriorityChange(p)}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                              editedTask.priority === p
                                ? cn(priorityConfig[p].bg, 'text-white shadow-sm')
                                : 'bg-muted text-muted-foreground hover:bg-accent'
                            )}
                          >
                            {p} - {priorityConfig[p].label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Section/Status */}
                    <div className="rounded-xl border border-border/50 bg-card/30 p-3">
                      <div className="text-xs font-medium text-muted-foreground mb-2">Status</div>
                      <Select
                        value={editedTask.section}
                        onValueChange={handleSectionChange}
                      >
                        <SelectTrigger className="w-full h-8">
                          <SelectValue placeholder="Select section">
                            {getCurrentSectionName()}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {sections.map((section) => (
                            <SelectItem key={section._id} value={section._id}>
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: section.color }}
                                />
                                {section.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Due Date & Time */}
                    <div className="rounded-xl border border-border/50 bg-card/30 p-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                        <CalendarIcon className="w-3 h-3" />
                        Due Date & Time
                      </div>
                      <Popover
                        open={isDateOpenMobile}
                        onOpenChange={(open) => {
                          setIsDateOpenMobile(open);
                          if (open) {
                            initDraftDueDate();
                            return;
                          }
                          // Save on close (click outside / ESC) if changed
                          if (isDraftDueDateDirty) {
                            void commitDueDate(draftDueDate, false, true);
                          }
                        }}
                        modal={true}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !editedTask.dueDate && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {editedTask.dueDate
                              ? format(new Date(editedTask.dueDate), 'PPP p')
                              : 'Pick date & time'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 overflow-hidden" align="start">
                          <Calendar
                            mode="single"
                            selected={draftDueDate}
                            onSelect={handleDraftDateSelect}
                            initialFocus
                          />
                          <div className="border-t p-3">
                            <div className="flex items-center gap-2">
                              <Timer className="h-4 w-4 text-muted-foreground" />
                              <input
                                type="time"
                                value={draftDueDate ? format(draftDueDate, 'HH:mm') : '09:00'}
                                onChange={(e) => handleTimeChange(e.target.value)}
                                className="flex-1 bg-transparent border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                            </div>
                          </div>
                          <div className="border-t p-2 flex justify-between">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDraftDueDate(undefined);
                                setIsDraftDueDateDirty(true);
                                void commitDueDate(undefined, true, true);
                              }}
                            >
                              Clear
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => void commitDueDate(draftDueDate, true, true)}
                            >
                              Done
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Labels */}
                    <div className="rounded-xl border border-border/50 bg-card/30 p-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                        <Tag className="w-3 h-3" />
                        Labels
                      </div>
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

                    {/* Delete Button */}
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Task
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

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
                  Subtasks ({completedSubtasks}/{totalSubtasks})
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

              {/* Subtask Progress */}
              {totalSubtasks > 0 && (
                <div className="mb-3">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
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
                      placeholder="Enter subtask title..."
                      className="flex-1 h-8 text-sm border-0 bg-transparent focus-visible:ring-0"
                      autoFocus
                    />
                    <div className="flex gap-1">
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
                          'text-sm flex-1 min-w-0 truncate',
                          subtask.isCompleted && 'line-through text-muted-foreground'
                        )}
                      >
                        {subtask.title}
                      </span>
                      <button
                        onClick={() => handleDeleteSubtask(subtask._id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 hover:bg-destructive/10 rounded shrink-0"
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

            {/* Comments + Attachments Tabs (bottom) */}
            <div className="mt-2">
              <Tabs defaultValue="comments" className="w-full">
                <div className="sticky bottom-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 border-t bg-background/95 backdrop-blur">
                  <TabsList className="w-full">
                    <TabsTrigger value="comments" className="flex-1">
                      Comments ({comments.length})
                    </TabsTrigger>
                    <TabsTrigger value="attachments" className="flex-1">
                      Attachments ({editedTask.attachments?.length || 0})
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="comments" className="pt-4">
                  <div className="flex items-start gap-3 mb-4">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs">
                        {user?.name ? getInitials(user.name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
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
                        className="shrink-0"
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
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="text-xs">
                            {getInitials(comment.author.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-medium">
                              {comment.author.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDateDisplay(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm wrap-break-word">{comment.content}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="attachments" className="pt-4">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <p className="text-sm font-medium">Upload files</p>
                      <p className="text-xs text-muted-foreground">
                        PDF, PNG, JPG, WEBP, GIF (max 20MB each)
                      </p>
                    </div>
                    <label
                      className={cn(
                        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
                        'bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 cursor-pointer'
                      )}
                    >
                      {isUploadingAttachments ? 'Uploading...' : 'Upload'}
                      <input
                        type="file"
                        multiple
                        accept="application/pdf,image/*"
                        className="hidden"
                        disabled={isUploadingAttachments}
                        onChange={(e) => handleUploadAttachments(e.target.files)}
                      />
                    </label>
                  </div>

                  {(editedTask.attachments || []).length === 0 ? (
                    <div className="rounded-xl border border-border/50 bg-card/40 p-4 text-sm text-muted-foreground">
                      No attachments yet
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(editedTask.attachments || []).map((att) => (
                        <button
                          key={att._id}
                          type="button"
                          onClick={() => openPreview(att)}
                          className="text-left flex items-center gap-3 rounded-xl border border-border/50 bg-card/40 p-3 hover:bg-muted/30 transition-colors group"
                        >
                          <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground shrink-0">
                            {getAttachmentIcon(att)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{att.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(att.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAttachmentToRemove(att);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              aria-label="Remove attachment"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <span className="text-xs text-muted-foreground">Preview</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Preview Dialog */}
            <Dialog
              open={!!previewAttachment}
              onOpenChange={(open) => {
                if (!open) {
                  setPreviewAttachment(null);
                  setPreviewUrl('');
                  setIsPreviewLoading(false);
                  setPdfNumPages(0);
                }
              }}
            >
              <DialogContent showCloseButton={false} className="sm:max-w-5xl max-h-[85vh] overflow-hidden p-0">
                <div className="p-4 border-b flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground">
                    {previewAttachment ? getAttachmentIcon(previewAttachment) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <DialogHeader>
                      <DialogTitle className="truncate">
                        {previewAttachment?.name || 'Attachment'}
                      </DialogTitle>
                    </DialogHeader>
                    <p className="text-xs text-muted-foreground">
                      {previewAttachment
                        ? `${(previewAttachment.size / 1024 / 1024).toFixed(2)} MB`
                        : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {previewUrl && (
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/30"
                      >
                        <Download className="h-4 w-4" />
                        Open
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewAttachment(null);
                        setPreviewUrl('');
                        setIsPreviewLoading(false);
                        setPdfNumPages(0);
                      }}
                      className="inline-flex items-center justify-center rounded-md border px-2 py-2 hover:bg-muted/30"
                      aria-label="Close preview"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Scroll area for preview */}
                <div className="p-4 overflow-y-auto overscroll-contain" style={{ maxHeight: '75vh' }}>
                  {isPreviewLoading ? (
                    <div className="h-[50vh] flex items-center justify-center text-sm text-muted-foreground">
                      Loading preview…
                    </div>
                  ) : !previewUrl ? (
                    <div className="h-[50vh] flex items-center justify-center text-sm text-muted-foreground">
                      Preview unavailable
                    </div>
                  ) : previewAttachment?.mimeType?.startsWith('image/') ? (
                    <img
                      src={previewUrl}
                      alt={previewAttachment.name}
                      className="max-h-[65vh] w-full object-contain rounded-lg border"
                    />
                  ) : previewAttachment?.mimeType?.includes('pdf') ? (
                    <div className="rounded-lg border bg-black/10 p-3">
                      <div ref={pdfScrollRef} className="w-full">
                        <Document
                          file={previewUrl}
                          onLoadSuccess={(info) => {
                            setPdfNumPages(info.numPages);
                          }}
                          loading={<div className="h-[55vh] flex items-center justify-center text-sm text-muted-foreground">Loading PDF…</div>}
                          error={<div className="text-sm text-muted-foreground">Failed to load PDF</div>}
                        >
                          {pdfNumPages > 0 &&
                            Array.from({ length: pdfNumPages }, (_, idx) => (
                              <div key={`pdf-page-${idx + 1}`} className={idx === 0 ? '' : 'mt-4'}>
                                <Page
                                  pageNumber={idx + 1}
                                  renderTextLayer={false}
                                  renderAnnotationLayer={false}
                                  className="shadow-lg"
                                  width={pdfPageWidth}
                                />
                              </div>
                            ))}
                        </Document>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      This file type can’t be previewed. Use Open to download/view.
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Remove confirmation */}
            <AlertDialog
              open={!!attachmentToRemove}
              onOpenChange={(open) => {
                if (!open) setAttachmentToRemove(null);
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove attachment</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the file from storage (S3) and remove it from the task.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isRemovingAttachment}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmRemoveAttachment}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isRemovingAttachment}
                  >
                    {isRemovingAttachment ? 'Removing…' : 'Remove'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </ModalContent>
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-72 border-l p-4 bg-muted/30 overflow-hidden shrink-0">
          <div className="space-y-5">
            {/* Priority */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Flag className="w-3 h-3" />
                Priority
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(['P1', 'P2', 'P3', 'P4'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => handlePriorityChange(p)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      editedTask.priority === p
                        ? cn(priorityConfig[p].bg, 'text-white shadow-sm')
                        : 'bg-muted text-muted-foreground hover:bg-accent'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Section/Status */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">
                Status
              </h4>
              <Select
                value={editedTask.section}
                onValueChange={handleSectionChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select section">
                    {getCurrentSectionName()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => (
                    <SelectItem key={section._id} value={section._id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: section.color }}
                        />
                        {section.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date & Time */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <CalendarIcon className="w-3 h-3" />
                Due Date & Time
              </h4>
              <Popover
                open={isDateOpenDesktop}
                onOpenChange={(open) => {
                  setIsDateOpenDesktop(open);
                  if (open) {
                    initDraftDueDate();
                    return;
                  }
                  if (isDraftDueDateDirty) {
                    void commitDueDate(draftDueDate, false, false);
                  }
                }}
                modal={true}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !editedTask.dueDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editedTask.dueDate
                      ? format(new Date(editedTask.dueDate), 'PPP p')
                      : 'Pick date & time'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 overflow-hidden" align="start">
                  <Calendar
                    mode="single"
                    selected={draftDueDate}
                    onSelect={handleDraftDateSelect}
                    initialFocus
                  />
                  <div className="border-t p-3">
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      <input
                        type="time"
                        value={draftDueDate ? format(draftDueDate, 'HH:mm') : '09:00'}
                        onChange={(e) => handleTimeChange(e.target.value)}
                        className="flex-1 bg-transparent border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <div className="border-t p-2 flex justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDraftDueDate(undefined);
                        setIsDraftDueDateDirty(true);
                        void commitDueDate(undefined, true, false);
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void commitDueDate(draftDueDate, true, false)}
                    >
                      Done
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Labels */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Tag className="w-3 h-3" />
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
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Task
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{editedTask?.title}&quot;? This action cannot be undone.
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
