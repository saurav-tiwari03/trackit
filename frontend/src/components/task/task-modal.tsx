'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  MoreHorizontal,
  Send,
  ChevronDown,
  ChevronUp,
  Flag,
  Tag,
  Clock,
  Timer,
  ListTodo,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const [commentMentions, setCommentMentions] = useState<Array<{ id: string; name: string }>>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [labelInput, setLabelInput] = useState('');
  const [isUpdatingLabels, setIsUpdatingLabels] = useState(false);
  const userLabelSuggestions = useMemo(() => {
    const list = user?.labels || [];
    return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
  }, [user?.labels]);
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
  const pdfContainerRef = useRef<HTMLDivElement | null>(null);
  const [pdfPageWidth, setPdfPageWidth] = useState<number>(0);
  const [attachmentToRemove, setAttachmentToRemove] = useState<Attachment | null>(null);
  const [isRemovingAttachment, setIsRemovingAttachment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentValue, setEditingCommentValue] = useState('');
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);

  const updatePdfWidth = () => {
    const el = pdfContainerRef.current;
    if (!el) return;
    // Use container width (modal content width) so it works on mobile too
    const next = Math.max(280, Math.min(1100, el.clientWidth - 24));
    setPdfPageWidth(next);
  };

  // Keep PDF responsive as preview opens/resizes.
  // NOTE: the preview dialog (and ref) mounts only when opened,
  // so we must attach the observer when `previewUrl` is ready.
  useLayoutEffect(() => {
    const isPdf = !!previewAttachment?.mimeType?.includes('pdf');
    if (!isPdf || !previewUrl) return;

    let ro: ResizeObserver | null = null;
    let raf = 0;

    const attach = () => {
      const el = pdfContainerRef.current;
      if (!el) {
        raf = requestAnimationFrame(attach);
        return;
      }
      updatePdfWidth();
      ro = new ResizeObserver(() => updatePdfWidth());
      ro.observe(el);
    };

    attach();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [previewAttachment, previewUrl]);

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

  const mentionableUsers = useMemo(() => {
    if (!editedTask) return [];
    const projectId =
      typeof editedTask.project === 'string'
        ? editedTask.project
        : editedTask.project._id;
    const project = projects.find(p => p._id === projectId);
    const all = project ? [project.owner, ...(project.members || [])] : [];
    const unique = new Map<string, { id: string; name: string; email: string }>();
    all.forEach(u => {
      const id = (u as any).id || (u as any)._id;
      if (id && !unique.has(id)) {
        unique.set(id, { id, name: u.name, email: u.email });
      }
    });
    return Array.from(unique.values());
  }, [editedTask, projects]);

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
      setNewComment('');
      setCommentMentions([]);
      setMentionOpen(false);
      setMentionQuery('');
      setMentionStart(null);
      setLabelInput('');
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
      const nextIsCompleted = !editedTask.isCompleted;
      setEditedTask({
        ...editedTask,
        isCompleted: nextIsCompleted,
        status: nextIsCompleted ? 'completed' : 'open',
      });
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleStatusChange = async (next: Task['status']) => {
    if (!editedTask) return;
    const prev = editedTask.status;
    try {
      const isCompleted = next === 'completed';
      // Optimistic UI (prevents “still showing To Do” while request is in-flight)
      setEditedTask({ ...editedTask, status: next, isCompleted });
      await updateTask(editedTask._id, { status: next, isCompleted });
      toast.success('Task status updated');
    } catch (error) {
      console.error('Failed to update task status:', error);
      setEditedTask({ ...editedTask, status: prev });
      toast.error('Failed to update task status');
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
        mentions: commentMentions.length > 0 ? commentMentions.map(m => m.id) : undefined,
      });
      setComments([response.data.data, ...comments]);
      setNewComment('');
      setCommentMentions([]);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const updateMentionState = (value: string, cursorPos: number) => {
    const upto = value.slice(0, cursorPos);
    const at = upto.lastIndexOf('@');
    if (at === -1) {
      setMentionOpen(false);
      setMentionQuery('');
      setMentionStart(null);
      return;
    }
    const between = upto.slice(at + 1);
    if (/\s/.test(between)) {
      setMentionOpen(false);
      setMentionQuery('');
      setMentionStart(null);
      return;
    }
    setMentionStart(at);
    setMentionQuery(between);
    setMentionOpen(true);
  };

  const insertMention = (u: { id: string; name: string }) => {
    const input = document.getElementById('task-comment-input') as HTMLInputElement | null;
    const cursor = input?.selectionStart ?? newComment.length;
    const start = mentionStart ?? newComment.lastIndexOf('@', cursor);
    if (start === -1) return;
    const before = newComment.slice(0, start);
    const after = newComment.slice(cursor);
    const nextText = `${before}@${u.name} ${after}`;
    setNewComment(nextText);
    setCommentMentions(prev =>
      prev.some(m => m.id === u.id) ? prev : [...prev, { id: u.id, name: u.name }]
    );
    setMentionOpen(false);
    setMentionQuery('');
    setMentionStart(null);
    requestAnimationFrame(() => {
      if (!input) return;
      const pos = (before + `@${u.name} `).length;
      input.focus();
      input.setSelectionRange(pos, pos);
    });
  };

  const renderCommentContent = (c: Comment) => {
    if (!c.mentions || c.mentions.length === 0) return c.content;
    const text = c.content || '';
    const needles = c.mentions.map(m => `@${m.name}`).filter(Boolean);
    if (needles.length === 0) return text;

    const ranges: Array<{ start: number; end: number }> = [];
    needles.forEach(label => {
      let idx = 0;
      while (idx < text.length) {
        const found = text.indexOf(label, idx);
        if (found === -1) break;
        ranges.push({ start: found, end: found + label.length });
        idx = found + label.length;
      }
    });
    ranges.sort((a, b) => a.start - b.start);

    const out: React.ReactNode[] = [];
    let i = 0;
    ranges.forEach((r, n) => {
      if (r.start < i) return;
      if (r.start > i) out.push(text.slice(i, r.start));
      out.push(
        <span
          key={`m-${n}-${r.start}`}
          className="bg-primary/15 text-primary font-medium px-1 rounded"
        >
          {text.slice(r.start, r.end)}
        </span>
      );
      i = r.end;
    });
    if (i < text.length) out.push(text.slice(i));
    return out;
  };

  const updateLabels = async (nextLabels: string[]) => {
    if (!editedTask) return;
    setIsUpdatingLabels(true);
    try {
      const response = await tasksAPI.update(editedTask._id, { labels: nextLabels });
      const updatedTask = response.data.data as Task;
      setEditedTask({
        ...updatedTask,
        subtasks: updatedTask.subtasks || [],
        labels: updatedTask.labels || [],
      });
      toast.success('Labels updated');
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to update labels';
      toast.error(message);
    } finally {
      setIsUpdatingLabels(false);
    }
  };

  const handleAddLabel = async () => {
    if (!editedTask) return;
    const value = labelInput.trim().replace(/\s+/g, ' ');
    if (!value) return;
    const current = editedTask.labels || [];
    const next = current.includes(value) ? current : [...current, value];
    setLabelInput('');
    await updateLabels(next);
  };

  const handleRemoveLabel = async (label: string) => {
    if (!editedTask) return;
    const next = (editedTask.labels || []).filter(l => l !== label);
    await updateLabels(next);
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

  const startEditComment = (c: Comment) => {
    setEditingCommentId(c._id);
    setEditingCommentValue(c.content || '');
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentValue('');
  };

  const saveEditComment = async () => {
    if (!editingCommentId) return;
    const content = editingCommentValue.trim();
    if (!content) return;
    try {
      const response = await commentsAPI.update(editingCommentId, { content });
      const updated = response.data.data as Comment;
      setComments(prev => prev.map(c => (c._id === updated._id ? { ...c, ...updated } : c)));
      toast.success('Comment updated');
      cancelEditComment();
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Failed to update comment';
      toast.error(message);
    }
  };

  const confirmDeleteComment = async () => {
    if (!commentToDelete) return;
    setIsDeletingComment(true);
    try {
      await commentsAPI.delete(commentToDelete._id);
      setComments(prev => prev.filter(c => c._id !== commentToDelete._id));
      toast.success('Comment deleted');
      setCommentToDelete(null);
      cancelEditComment();
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Failed to delete comment';
      toast.error(message);
    } finally {
      setIsDeletingComment(false);
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
    // Ensure width is computed when opening
    requestAnimationFrame(() => updatePdfWidth());
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
      const removedId = attachmentToRemove._id;
      const response = await tasksAPI.deleteAttachment(
        editedTask._id,
        removedId
      );
      const updatedTask = response.data.data as Task;
      setEditedTask({
        ...updatedTask,
        subtasks: updatedTask.subtasks || [],
        labels: updatedTask.labels || [],
      });
      toast.success('Attachment removed');
      setAttachmentToRemove(null);

      // If we deleted the currently previewed attachment, close the preview dialog.
      if (previewAttachment?._id === removedId) {
        setPreviewAttachment(null);
        setPreviewUrl('');
        setIsPreviewLoading(false);
        setPdfNumPages(0);
      }
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
      <div className="flex flex-col lg:flex-row h-dvh sm:h-[85vh]">
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

                    {/* Section */}
                    <div className="rounded-xl border border-border/50 bg-card/30 p-3">
                      <div className="text-xs font-medium text-muted-foreground mb-2">Section</div>
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

                    {/* Task Status */}
                    <div className="rounded-xl border border-border/50 bg-card/30 p-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                        <ListTodo className="w-3 h-3" />
                        Task status
                      </div>
                      <Select
                        value={editedTask.status}
                        onValueChange={(v) => handleStatusChange(v as Task['status'])}
                      >
                        <SelectTrigger className="w-full h-8">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">To Do</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
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
                              'w-full justify-start text-left font-normal overflow-hidden',
                              !editedTask.dueDate && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            <span className="truncate">
                              {editedTask.dueDate
                                ? format(new Date(editedTask.dueDate), 'PPP p')
                                : 'Pick date & time'}
                            </span>
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
                      <div className="flex gap-2">
                        <Input
                          value={labelInput}
                          onChange={(e) => setLabelInput(e.target.value)}
                          placeholder="Add label…"
                          className="h-8"
                          list="user-label-suggestions"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void handleAddLabel();
                            }
                          }}
                        />
                        <datalist id="user-label-suggestions">
                          {userLabelSuggestions.map(l => (
                            <option key={l} value={l} />
                          ))}
                        </datalist>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={!labelInput.trim() || isUpdatingLabels}
                          onClick={() => void handleAddLabel()}
                        >
                          Add
                        </Button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(editedTask.labels || []).length === 0 ? (
                          <span className="text-xs text-muted-foreground">No labels</span>
                        ) : (
                          (editedTask.labels || []).map((label) => (
                            <span
                              key={label}
                              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
                            >
                              {label}
                              <button
                                type="button"
                                onClick={() => void handleRemoveLabel(label)}
                                className="text-muted-foreground hover:text-foreground"
                                aria-label="Remove label"
                              >
                                <XIcon className="h-3 w-3" />
                              </button>
                            </span>
                          ))
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
            <div className="mb-6 rounded-2xl border border-border/50 bg-card/40 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Description
                </h3>
                {!isEditingDescription && (
                  <Button
                    variant="secondary"
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
                  className="text-sm cursor-pointer hover:bg-muted/40 rounded-xl p-3 bg-muted/10"
                  onClick={() => setIsEditingDescription(true)}
                >
                  <TipTapViewer content={editedTask.description} />
                </div>
              ) : (
                <p
                  className="text-sm text-muted-foreground cursor-pointer hover:bg-muted/40 rounded-xl p-3 bg-muted/10"
                  onClick={() => setIsEditingDescription(true)}
                >
                  Click to add description...
                </p>
              )}
            </div>

            {/* Subtasks */}
            <div className="mb-6 rounded-2xl border border-border/50 bg-card/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Subtasks ({completedSubtasks}/{totalSubtasks})
                </h3>
                <Button
                  variant="secondary"
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
                  <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-xl border border-border/40">
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
                      className="flex items-center gap-2 group p-2 hover:bg-muted/30 rounded-xl"
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
                <div className="sticky bottom-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 border-t bg-transparent">
                  <TabsList className="w-full bg-muted/20 border border-border/40 rounded-xl p-1">
                    <TabsTrigger value="comments" className="flex-1">
                      Comments ({comments.length})
                    </TabsTrigger>
                    <TabsTrigger value="attachments" className="flex-1">
                      Attachments ({editedTask.attachments?.length || 0})
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="comments" className="pt-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="text-xs leading-none">
                        {user?.name ? getInitials(user.name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 flex items-center gap-2 bg-muted/30 border border-border/40 rounded-2xl px-3 h-11 relative">
                      <Input
                        id="task-comment-input"
                        value={newComment}
                        onChange={e => {
                          const value = e.target.value;
                          setNewComment(value);
                          updateMentionState(value, e.target.selectionStart ?? value.length);
                        }}
                        onKeyDown={(e) => {
                          if (mentionOpen && e.key === 'Escape') {
                            setMentionOpen(false);
                            return;
                          }
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddComment();
                          }
                        }}
                        placeholder="Write a comment..."
                        className="flex-1 border-0 bg-transparent h-11 px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        className="shrink-0 h-9 w-9 rounded-xl"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {mentionOpen && (
                    <div className="mb-4">
                      <div className="rounded-xl border border-border/50 bg-card/60 p-2">
                        <div className="text-xs text-muted-foreground px-2 py-1">
                          Mention a user
                        </div>
                        <div className="max-h-44 overflow-y-auto no-scrollbar">
                          {mentionableUsers
                            .filter(u => {
                              const q = mentionQuery.trim().toLowerCase();
                              if (!q) return true;
                              return (
                                u.name.toLowerCase().includes(q) ||
                                u.email.toLowerCase().includes(q)
                              );
                            })
                            .slice(0, 8)
                            .map(u => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => insertMention(u)}
                                className="w-full flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40 text-left"
                              >
                                <Avatar className="h-7 w-7 shrink-0">
                                  <AvatarFallback className="text-[10px]">
                                    {getInitials(u.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium truncate">{u.name}</div>
                                  <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                                </div>
                                <span className="text-xs text-muted-foreground">@</span>
                              </button>
                            ))}
                          {mentionableUsers.length === 0 && (
                            <div className="text-xs text-muted-foreground px-2 py-2">
                              No users to mention
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {comments.map(comment => (
                      <motion.div
                        key={comment._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="group flex items-start gap-3 rounded-2xl border border-border/50 bg-card/40 p-3"
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="text-xs">
                            {getInitials(comment.author.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-sm font-medium">
                                {comment.author.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDateDisplay(comment.createdAt)}
                              </span>
                            </div>

                            {user?.id && comment.author?.id === user.id && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    className="shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      startEditComment(comment);
                                    }}
                                  >
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setCommentToDelete(comment);
                                    }}
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>

                          {editingCommentId === comment._id ? (
                            <div className="mt-2">
                              <textarea
                                value={editingCommentValue}
                                onChange={(e) => setEditingCommentValue(e.target.value)}
                                className="w-full min-h-[88px] rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                              <div className="mt-2 flex items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={cancelEditComment}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => void saveEditComment()}
                                  disabled={!editingCommentValue.trim()}
                                >
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm wrap-break-word leading-relaxed">
                              {renderCommentContent(comment)}
                            </p>
                          )}
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
                        <div
                          key={att._id}
                          onClick={() => openPreview(att)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              openPreview(att);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          className="text-left flex items-center gap-3 rounded-xl border border-border/50 bg-card/40 p-3 hover:bg-muted/30 transition-colors group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity rounded-md p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              aria-label="Remove attachment"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <span className="text-xs text-muted-foreground">Preview</span>
                          </div>
                        </div>
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
              <DialogContent
                showCloseButton={false}
                className="w-[calc(100%-2rem)] sm:max-w-5xl max-h-[85vh] overflow-hidden p-0"
              >
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
                    {previewAttachment && (
                      <button
                        type="button"
                        onClick={() => setAttachmentToRemove(previewAttachment)}
                        className="inline-flex items-center justify-center rounded-md border px-2 py-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        aria-label="Delete attachment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
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
                <div
                  className="p-4 overflow-y-auto overflow-x-hidden overscroll-contain"
                  style={{ maxHeight: '75vh' }}
                >
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
                      <div ref={pdfContainerRef} className="w-full">
                        <Document
                          file={previewUrl}
                          onLoadSuccess={(info) => {
                            setPdfNumPages(info.numPages);
                          }}
                          loading={<div className="h-[55vh] flex items-center justify-center text-sm text-muted-foreground">Loading PDF…</div>}
                          error={<div className="text-sm text-muted-foreground">Failed to load PDF</div>}
                        >
                          {pdfNumPages > 0 && pdfPageWidth > 0 &&
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

            {/* Section */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">
                Section
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

            {/* Task Status */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <ListTodo className="w-3 h-3" />
                Task status
              </h4>
              <Select
                value={editedTask.status}
                onValueChange={(v) => handleStatusChange(v as Task['status'])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
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
                      'w-full justify-start text-left font-normal overflow-hidden',
                      !editedTask.dueDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span className="truncate">
                      {editedTask.dueDate
                        ? format(new Date(editedTask.dueDate), 'PPP p')
                        : 'Pick date & time'}
                    </span>
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
              <div className="flex gap-2">
                <Input
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  placeholder="Add label…"
                  className="h-8"
                  list="user-label-suggestions"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleAddLabel();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!labelInput.trim() || isUpdatingLabels}
                  onClick={() => void handleAddLabel()}
                >
                  Add
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(editedTask.labels || []).length === 0 ? (
                  <span className="text-xs text-muted-foreground">No labels</span>
                ) : (
                  (editedTask.labels || []).map((label) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
                    >
                      {label}
                      <button
                        type="button"
                        onClick={() => void handleRemoveLabel(label)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Remove label"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </span>
                  ))
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

      {/* Delete Comment Dialog */}
      <AlertDialog
        open={!!commentToDelete}
        onOpenChange={(open) => {
          if (!open) setCommentToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete comment</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the comment. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingComment}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDeleteComment()}
              disabled={isDeletingComment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingComment ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Modal>
  );
}
