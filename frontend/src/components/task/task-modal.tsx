'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
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
  GripVertical,
} from 'lucide-react';
import { Task, Comment, Section, Attachment } from '@/types';
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
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';
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
  onOpenTask?: (task: Task) => void;
}

const priorityConfig: Record<string, { color: string; bg: string; label: string }> = {
  P1: { color: 'text-red-500', bg: 'bg-red-500', label: 'Urgent' },
  P2: { color: 'text-orange-500', bg: 'bg-orange-500', label: 'High' },
  P3: { color: 'text-yellow-500', bg: 'bg-yellow-500', label: 'Medium' },
  P4: { color: 'text-gray-400', bg: 'bg-gray-400', label: 'Low' },
};

export function TaskModal({ task, isOpen, onClose, onOpenTask }: TaskModalProps) {
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
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [isLoadingSubtasks, setIsLoadingSubtasks] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [isSubtasksOpen, setIsSubtasksOpen] = useState(true);
  const [subtaskPriority, setSubtaskPriority] = useState<'P1' | 'P2' | 'P3' | 'P4'>('P4');
  const [subtaskDueDate, setSubtaskDueDate] = useState<Date | undefined>(undefined);
  const [isSubtaskDateOpen, setIsSubtaskDateOpen] = useState(false);
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
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');

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

  type AxiosErrorLike = {
    response?: { data?: { message?: string } };
    message?: string;
  };

  const getApiErrorMessage = (error: unknown, fallback: string) => {
    const e = error as AxiosErrorLike;
    return e?.response?.data?.message || e?.message || fallback;
  };

  const mentionableUsers = useMemo(() => {
    if (!editedTask) return [];
    const projectId =
      typeof editedTask.project === 'string'
        ? editedTask.project
        : editedTask.project._id;
    const project = projects.find(p => p._id === projectId);
    type ProjectMember = (typeof project extends null ? never : NonNullable<typeof project>['owner']) & Partial<{ _id: string }>;
    const all: ProjectMember[] = project
      ? ([project.owner, ...(project.members || [])] as unknown as ProjectMember[])
      : [];
    const unique = new Map<string, { id: string; name: string; email: string }>();
    all.forEach(u => {
      const id = u.id || u._id;
      if (id && !unique.has(id)) {
        unique.set(id, { id, name: u.name, email: u.email });
      }
    });
    return Array.from(unique.values());
  }, [editedTask, projects]);

  const fetchComments = useCallback(async () => {
    if (!task) return;
    try {
      const response = await commentsAPI.getForTask(task._id);
      setComments(response.data.data);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  }, [task]);

  useEffect(() => {
    if (task) {
      setEditedTask({
        ...task,
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
      return;
    }
    setSubtasks([]);
  }, [task, fetchComments]);

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

  const handleSaveTitle = async () => {
    if (!editedTask || !editedTitle.trim()) return;
    try {
      await updateTask(editedTask._id, { title: editedTitle.trim() });
      setEditedTask({ ...editedTask, title: editedTitle.trim() });
      setIsEditingTitle(false);
      toast.success('Title updated');
    } catch (error) {
      console.error('Failed to update title:', error);
      toast.error('Failed to update title');
    }
  };

  const handleSaveSubtaskTitle = async (subtaskId: string) => {
    if (!editedTask || !editingSubtaskTitle.trim()) return;
    try {
      await tasksAPI.updateSubtask(editedTask._id, subtaskId, { title: editingSubtaskTitle.trim() });
      setSubtasks(prev =>
        prev.map(s => s._id === subtaskId ? { ...s, title: editingSubtaskTitle.trim() } : s)
      );
      setEditingSubtaskId(null);
      setEditingSubtaskTitle('');
      toast.success('Subtask title updated');
    } catch (error) {
      console.error('Failed to update subtask title:', error);
      toast.error('Failed to update subtask title');
    }
  };

  const handleAddSubtask = async () => {
    if (!editedTask || !newSubtask.trim()) return;
    try {
      const response = await tasksAPI.addSubtask(editedTask._id, {
        title: newSubtask,
        priority: subtaskPriority,
        dueDate: subtaskDueDate ? subtaskDueDate.toISOString() : undefined,
      });
      const created = response.data.data as Task;
      setSubtasks(prev => [...prev, created].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      setNewSubtask('');
      setIsAddingSubtask(false);
      setSubtaskPriority('P4');
      setSubtaskDueDate(undefined);
    } catch (error) {
      console.error('Failed to add subtask:', error);
    }
  };

  const handleToggleSubtask = async (subtask: Task) => {
    if (!editedTask) return;
    try {
      const nextIsCompleted = !subtask.isCompleted;
      setSubtasks(prev =>
        prev.map(t =>
          t._id === subtask._id
            ? { ...t, isCompleted: nextIsCompleted, status: nextIsCompleted ? 'completed' : 'in_progress' }
            : t
        )
      );
      await tasksAPI.updateSubtask(editedTask._id, subtask._id, { isCompleted: nextIsCompleted });
    } catch (error) {
      console.error('Failed to update subtask:', error);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!editedTask) return;
    try {
      await tasksAPI.deleteSubtask(editedTask._id, subtaskId);
      setSubtasks(prev => prev.filter(t => t._id !== subtaskId));
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
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to update labels'));
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
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to upload attachments'));
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
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to update comment'));
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
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to delete comment'));
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
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to load preview'));
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
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to remove attachment'));
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

  const handleSubtaskTimeChange = (timeString: string) => {
    const parsed = parseTimeString(timeString);
    if (!parsed) {
      toast.error('Invalid time');
      return;
    }

    const base = subtaskDueDate ? new Date(subtaskDueDate) : new Date();
    if (!isValidDate(base)) {
      toast.error('Invalid date/time');
      return;
    }

    base.setHours(parsed.hours, parsed.minutes, 0, 0);
    setSubtaskDueDate(base);
  };

  const handleSubtaskDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const hours = subtaskDueDate?.getHours() ?? 9;
    const minutes = subtaskDueDate?.getMinutes() ?? 0;
    const next = new Date(date);
    next.setHours(hours, minutes, 0, 0);
    setSubtaskDueDate(next);
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

  const handleReorderSubtasks = async (result: DropResult) => {
    if (!editedTask) return;
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    if (sourceIndex === destIndex) return;

    const prev = subtasks;
    const current = [...subtasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const [moved] = current.splice(sourceIndex, 1);
    current.splice(destIndex, 0, moved);

    const optimistic = current.map((s, idx) => ({ ...s, order: idx }));
    setSubtasks(optimistic);

    try {
      const response = await tasksAPI.reorderSubtasks(
        editedTask._id,
        optimistic.map(s => s._id)
      );
      setSubtasks(response.data.data || []);
    } catch (error) {
      console.error('Failed to reorder subtasks:', error);
      setSubtasks(prev);
      toast.error('Failed to reorder subtasks');
    }
  };

  if (!editedTask) return null;

  const completedSubtasks = subtasks.filter(s => s.isCompleted).length;
  const totalSubtasks = subtasks.length;
  const displaySubtasks = [...subtasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const currentProject = (() => {
    const pid =
      typeof editedTask.project === 'string' ? editedTask.project : editedTask.project?._id;
    if (typeof editedTask.project !== 'string' && editedTask.project?.name) return editedTask.project;
    return projects.find(p => p._id === pid) || null;
  })();

  const currentSectionName = (() => {
    const sectionId = editedTask.section;
    const section = (currentProject?.sections || []).find(s => s._id === sectionId);
    return section?.name || 'Unknown';
  })();

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="flex flex-col lg:flex-row h-dvh sm:h-[85vh]">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <ModalHeader onClose={onClose}>
            <div className="flex items-center gap-3 min-w-0">
              {editedTask.parentTask && onOpenTask && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0"
                  onClick={async () => {
                    try {
                      const pid = editedTask.parentTask;
                      if (!pid) return;
                      const response = await tasksAPI.getOne(pid);
                      onOpenTask(response.data.data as Task);
                    } catch (e) {
                      console.error('Failed to open parent task:', e);
                      toast.error('Failed to open parent task');
                    }
                  }}
                  aria-label="Back to parent task"
                  title="Back to parent task"
                >
                  <ChevronUp className="w-4 h-4 -rotate-90" />
                </Button>
              )}
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
              {isEditingTitle ? (
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveTitle();
                    }
                    if (e.key === 'Escape') {
                      setIsEditingTitle(false);
                      setEditedTitle(editedTask.title);
                    }
                  }}
                  className="flex-1 h-8 text-base font-medium"
                  autoFocus
                />
              ) : (
                <span
                  className={cn(
                    'truncate cursor-pointer hover:bg-muted/50 px-2 py-1 rounded-md -mx-2',
                    editedTask.isCompleted && 'line-through text-muted-foreground'
                  )}
                  onClick={() => {
                    setEditedTitle(editedTask.title);
                    setIsEditingTitle(true);
                  }}
                  title="Click to edit title"
                >
                  {editedTask.title}
                </span>
              )}
            </div>
          </ModalHeader>

          <ModalContent className="flex-1 overflow-y-auto overflow-x-hidden">
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

            {/* Sub-tasks (match requested UI style) */}
            <div className="mb-6">
              <Collapsible open={isSubtasksOpen} onOpenChange={setIsSubtasksOpen}>
                <div className="flex items-center gap-2">
                  <CollapsibleTrigger
                    className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted/30"
                    aria-label={isSubtasksOpen ? 'Collapse sub-tasks' : 'Expand sub-tasks'}
                  >
                    <ChevronDown
                      className={cn(
                        'h-5 w-5 transition-transform',
                        isSubtasksOpen && 'rotate-180'
                      )}
                    />
                  </CollapsibleTrigger>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-base font-semibold">Sub-tasks</h3>
                    <span className="text-sm text-muted-foreground">
                      {completedSubtasks}/{totalSubtasks}
                    </span>
                  </div>
              </div>

                <CollapsibleContent>
                  <div className="mt-3 border-t border-border/40">
                    <DragDropContext onDragEnd={handleReorderSubtasks}>
                      <Droppable droppableId="subtasks">
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.droppableProps}>
                            {displaySubtasks.map((subtask, index) => (
                              <Draggable key={subtask._id} draggableId={subtask._id} index={index}>
                                {(draggableProvided, snapshot) => (
                                  (() => {
                                    const row = (
                                      <div
                                        ref={draggableProvided.innerRef}
                                        {...draggableProvided.draggableProps}
                                        className={cn(
                                          'group flex items-center gap-3 py-3 border-b border-border/40',
                                          snapshot.isDragging && 'bg-muted/30'
                                        )}
                                        role="button"
                                        tabIndex={0}
                                        onClick={async () => {
                                          try {
                                            const response = await tasksAPI.getOne(subtask._id);
                                            const next = response.data.data as Task;
                                            if (onOpenTask) onOpenTask(next);
                                          } catch (e) {
                                            console.error('Failed to open subtask:', e);
                                            toast.error('Failed to open subtask');
                                          }
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            void (async () => {
                                              try {
                                                const response = await tasksAPI.getOne(subtask._id);
                                                const next = response.data.data as Task;
                                                if (onOpenTask) onOpenTask(next);
                                              } catch {
                                                toast.error('Failed to open subtask');
                                              }
                                            })();
                                          }
                                        }}
                                      >
                                        <span
                                          {...draggableProvided.dragHandleProps}
                                          className="shrink-0 text-muted-foreground/60 group-hover:text-muted-foreground cursor-grab active:cursor-grabbing"
                                          aria-hidden="true"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <GripVertical className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </span>

                                        <button
                                          onClick={(e) => {
                                            // Prevent accidental drag-start on click.
                                            e.stopPropagation();
                                            void handleToggleSubtask(subtask);
                                          }}
                                          className="cursor-pointer shrink-0"
                                          aria-label={subtask.isCompleted ? 'Mark incomplete' : 'Mark complete'}
                                        >
                                          {subtask.isCompleted ? (
                                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                                          ) : (
                                            <Circle className="w-6 h-6 text-muted-foreground" />
                                          )}
                                        </button>

                                        {editingSubtaskId === subtask._id ? (
                                          <Input
                                            value={editingSubtaskTitle}
                                            onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                                            onBlur={() => handleSaveSubtaskTitle(subtask._id)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleSaveSubtaskTitle(subtask._id);
                                              }
                                              if (e.key === 'Escape') {
                                                setEditingSubtaskId(null);
                                                setEditingSubtaskTitle('');
                                              }
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex-1 h-8 text-base min-w-0"
                                            autoFocus
                                          />
                                        ) : (
                                          <span
                                            className={cn(
                                              'text-base flex-1 min-w-0 truncate cursor-pointer hover:bg-muted/50 px-2 py-1 rounded-md -mx-2',
                                              subtask.isCompleted && 'line-through text-muted-foreground'
                                            )}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingSubtaskId(subtask._id);
                                              setEditingSubtaskTitle(subtask.title);
                                            }}
                                            title="Click to edit subtask title"
                                          >
                                            {subtask.title}
                                          </span>
                                        )}
                                        {(subtask.dueDate || subtask.priority) && (
                                          <span className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                                            {subtask.dueDate && (
                                              <span className="inline-flex items-center gap-1">
                                                <CalendarIcon className="h-3 w-3" />
                                                {format(new Date(subtask.dueDate), 'MMM d')}
                                              </span>
                                            )}
                                            {subtask.priority && (
                                              <span className="inline-flex items-center gap-1">
                                                <Flag className="h-3 w-3" />
                                                {subtask.priority}
                                              </span>
                                            )}
                                          </span>
                                        )}

                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            void handleDeleteSubtask(subtask._id);
                                          }}
                                          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-2 hover:bg-destructive/10 rounded-md shrink-0"
                                          aria-label="Delete sub-task"
                                        >
                                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                                        </button>
                  </div>
                                    );

                                    // Fix drag offset issues inside modals/containers with CSS transforms:
                                    // render the dragged element in a portal to <body>.
                                    return snapshot.isDragging && typeof document !== 'undefined'
                                      ? createPortal(row, document.body)
                                      : row;
                                  })()
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                </div>
              )}
                      </Droppable>
                    </DragDropContext>

                    {displaySubtasks.length === 0 && !isAddingSubtask && (
                      <p className="text-sm text-muted-foreground py-4">
                        No sub-tasks yet
                      </p>
                    )}

                    {/* "+ Add sub-task" row (matches screenshot). Input appears at bottom. */}
                    {!isAddingSubtask && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingSubtask(true);
                          setSubtaskPriority('P4');
                          // default to today @ 09:00 like task due date flow
                          const next = new Date();
                          next.setHours(9, 0, 0, 0);
                          setSubtaskDueDate(next);
                        }}
                        className="w-full mr-4 flex items-center gap-2 py-4 text-sm text-muted-foreground hover:text-foreground border-b border-border/40"
                      >
                        <Plus className="h-4 w-4 text-destructive" />
                        <span>Add sub-task</span>
                      </button>
                    )}

                    {isLoadingSubtasks && (
                      <div className="py-3 text-xs text-muted-foreground">Loading subtasks…</div>
                    )}

                {isAddingSubtask && (
                      <div className="py-4 mr-4 border-b border-border/40 max-w-full overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
                          <Circle className="w-6 h-6 text-muted-foreground shrink-0" />
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
                                setSubtaskPriority('P4');
                                setSubtaskDueDate(undefined);
                        }
                      }}
                            placeholder="Add a sub-task…"
                            className="flex-1 min-w-0 h-10 text-base border-0 bg-transparent focus-visible:ring-0 px-0"
                      autoFocus
                    />
                          <div className="flex gap-2 shrink-0 sm:self-auto self-end">
                      <Button size="sm" onClick={handleAddSubtask} disabled={!newSubtask.trim()}>
                        Add
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsAddingSubtask(false);
                          setNewSubtask('');
                                setSubtaskPriority('P4');
                                setSubtaskDueDate(undefined);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>

                        {/* Extra fields + path (like reference UI) */}
                        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
                          <div className="flex flex-wrap items-center gap-4 min-w-0">
                            <Popover open={isSubtaskDateOpen} onOpenChange={setIsSubtaskDateOpen} modal={true}>
                              <PopoverTrigger asChild>
                                <Button type="button" variant="ghost" size="sm" className="h-9 px-0">
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {subtaskDueDate ? format(subtaskDueDate, 'MMM d, HH:mm') : 'Date'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 overflow-hidden" align="start">
                                <Calendar
                                  mode="single"
                                  selected={subtaskDueDate}
                                  onSelect={handleSubtaskDateSelect}
                                  initialFocus
                                />
                                <div className="border-t p-3">
                                  <div className="flex items-center gap-2">
                                    <Timer className="h-4 w-4 text-muted-foreground" />
                                    <input
                                      type="time"
                                      value={subtaskDueDate ? format(subtaskDueDate, 'HH:mm') : '09:00'}
                                      onChange={(e) => handleSubtaskTimeChange(e.target.value)}
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
                                      setSubtaskDueDate(undefined);
                                      setIsSubtaskDateOpen(false);
                                    }}
                                  >
                                    Clear
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => setIsSubtaskDateOpen(false)}
                                  >
                                    Done
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>

                            <Select
                              value={subtaskPriority}
                              onValueChange={(v) => setSubtaskPriority(v as 'P1' | 'P2' | 'P3' | 'P4')}
                            >
                              <SelectTrigger className="h-9 w-[140px] border-0 bg-transparent px-0">
                                <SelectValue>
                                  <div className="flex items-center gap-2">
                                    <Flag className="h-4 w-4 text-muted-foreground" />
                                    <span>{subtaskPriority}</span>
                                  </div>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {(['P1', 'P2', 'P3', 'P4'] as const).map(p => (
                                  <SelectItem key={p} value={p}>
                                    {p} - {priorityConfig[p].label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="sm:ml-auto text-sm text-muted-foreground truncate max-w-full">
                            {currentProject?.name || 'Project'} / {currentSectionName}
                          </div>
                        </div>
                      </div>
                )}
              </div>
                </CollapsibleContent>
              </Collapsible>
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
