'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Save,
  MoreVertical,
  Pin,
  PinOff,
  Star,
  StarOff,
  Archive,
  ArchiveRestore,
  Trash2,
  Folder,
  Tag,
  X,
  Plus,
  Clock,
  Loader2,
  Check,
} from 'lucide-react';
import { notesAPI, projectsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

// Dynamically import the editor to avoid SSR issues
const TiptapEditor = dynamic(
  () => import('@/components/notes/TiptapEditor'),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-muted/50 rounded-lg h-[400px]" />
    ),
  }
);

interface Note {
  _id: string;
  title: string;
  content: string;
  plainText: string;
  user: string;
  project?: {
    _id: string;
    name: string;
    color: string;
  } | string;
  color?: string;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  tags: string[];
  lastEditedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  _id: string;
  name: string;
  color: string;
}

const noteColors = [
  { name: 'Default', value: '', class: 'bg-card' },
  { name: 'Red', value: 'red', class: 'bg-red-500' },
  { name: 'Orange', value: 'orange', class: 'bg-orange-500' },
  { name: 'Yellow', value: 'yellow', class: 'bg-yellow-500' },
  { name: 'Green', value: 'green', class: 'bg-green-500' },
  { name: 'Blue', value: 'blue', class: 'bg-blue-500' },
  { name: 'Purple', value: 'purple', class: 'bg-purple-500' },
  { name: 'Pink', value: 'pink', class: 'bg-pink-500' },
];

export default function NoteEditorPage() {
  const router = useRouter();
  const params = useParams();
  const noteId = params.id as string;

  const [note, setNote] = useState<Note | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [plainText, setPlainText] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);

  const fetchNote = useCallback(async () => {
    try {
      const response = await notesAPI.getOne(noteId);
      const noteData = response.data.data;
      setNote(noteData);
      setTitle(noteData.title || '');
      setContent(noteData.content || '');
      setPlainText(noteData.plainText || '');
      setSelectedProject(
        typeof noteData.project === 'object'
          ? noteData.project?._id || ''
          : noteData.project || ''
      );
      setSelectedColor(noteData.color || '');
      setTags(noteData.tags || []);
      setLastSaved(new Date(noteData.updatedAt));
    } catch (error) {
      console.error('Failed to fetch note:', error);
      toast.error('Failed to load note');
      router.push('/notes');
    } finally {
      setIsLoading(false);
    }
  }, [noteId, router]);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }, []);

  useEffect(() => {
    fetchNote();
    fetchProjects();
  }, [fetchNote, fetchProjects]);

  const saveNote = useCallback(async () => {
    if (!note) return;

    setIsSaving(true);
    try {
      await notesAPI.update(note._id, {
        title,
        content,
        plainText,
        project: selectedProject || undefined,
        color: selectedColor,
        tags,
      });
      setLastSaved(new Date());
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save note:', error);
      toast.error('Failed to save note');
    } finally {
      setIsSaving(false);
    }
  }, [note, title, content, plainText, selectedProject, selectedColor, tags]);

  // Auto-save when changes are made
  useEffect(() => {
    if (!hasChanges || !note) return;

    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }

    autoSaveTimeout.current = setTimeout(() => {
      saveNote();
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, [hasChanges, saveNote, note]);

  const handleContentChange = (html: string, text: string) => {
    setContent(html);
    setPlainText(text);
    setHasChanges(true);
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setHasChanges(true);
  };

  const handleProjectChange = (value: string) => {
    setSelectedProject(value === 'none' ? '' : value);
    setHasChanges(true);
  };

  const handleColorChange = (value: string) => {
    setSelectedColor(value);
    setHasChanges(true);
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    if (tags.includes(newTag.trim())) {
      toast.error('Tag already exists');
      return;
    }
    setTags([...tags, newTag.trim()]);
    setNewTag('');
    setShowTagInput(false);
    setHasChanges(true);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
    setHasChanges(true);
  };

  const handleTogglePin = async () => {
    if (!note) return;
    try {
      await notesAPI.togglePin(note._id);
      setNote({ ...note, isPinned: !note.isPinned });
      toast.success(note.isPinned ? 'Note unpinned' : 'Note pinned');
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      toast.error('Failed to update note');
    }
  };

  const handleToggleFavorite = async () => {
    if (!note) return;
    try {
      await notesAPI.toggleFavorite(note._id);
      setNote({ ...note, isFavorite: !note.isFavorite });
      toast.success(
        note.isFavorite ? 'Removed from favorites' : 'Added to favorites'
      );
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      toast.error('Failed to update note');
    }
  };

  const handleToggleArchive = async () => {
    if (!note) return;
    try {
      await notesAPI.toggleArchive(note._id);
      toast.success(note.isArchived ? 'Note restored' : 'Note archived');
      router.push('/notes');
    } catch (error) {
      console.error('Failed to toggle archive:', error);
      toast.error('Failed to update note');
    }
  };

  const handleConfirmDelete = async () => {
    if (!note) return;

    try {
      await notesAPI.delete(note._id);
      toast.success('Note deleted');
      router.push('/notes');
    } catch (error) {
      console.error('Failed to delete note:', error);
      toast.error('Failed to delete note');
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleManualSave = async () => {
    await saveNote();
    toast.success('Note saved');
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Note not found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (hasChanges) saveNote();
                router.push('/notes');
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {lastSaved ? (
                <span>
                  Last saved {format(lastSaved, 'MMM d, h:mm a')}
                </span>
              ) : (
                <span>Not saved yet</span>
              )}
              {isSaving && (
                <span className="flex items-center gap-1 text-primary">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </span>
              )}
              {!isSaving && hasChanges && (
                <span className="text-yellow-500">Unsaved changes</span>
              )}
              {!isSaving && !hasChanges && lastSaved && (
                <span className="flex items-center gap-1 text-green-500">
                  <Check className="h-3 w-3" />
                  Saved
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTogglePin}
            >
              {note.isPinned ? (
                <>
                  <PinOff className="h-4 w-4 mr-2" />
                  Unpin
                </>
              ) : (
                <>
                  <Pin className="h-4 w-4 mr-2" />
                  Pin
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleFavorite}
            >
              {note.isFavorite ? (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              ) : (
                <Star className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleManualSave}
              disabled={isSaving || !hasChanges}
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleToggleArchive}>
                  {note.isArchived ? (
                    <>
                      <ArchiveRestore className="h-4 w-4 mr-2" />
                      Restore from archive
                    </>
                  ) : (
                    <>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Title and Metadata - Fixed */}
        <div className="shrink-0 border-b border-border/50 bg-background px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-5xl mx-auto space-y-4">
            {/* Title */}
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Untitled"
              className="w-full text-2xl sm:text-3xl font-bold bg-transparent border-none outline-none focus:ring-0 placeholder:text-muted-foreground/50"
            />

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Project Selector */}
              <Select value={selectedProject || 'none'} onValueChange={handleProjectChange}>
                <SelectTrigger className="w-[200px] h-9">
                  <Folder className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project._id} value={project._id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Color Selector */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <div
                      className={cn(
                        'h-4 w-4 rounded-full mr-2 border',
                        selectedColor
                          ? noteColors.find((c) => c.value === selectedColor)
                            ?.class
                          : 'bg-card'
                      )}
                    />
                    Color
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2">
                  <div className="flex gap-2">
                    {noteColors.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => handleColorChange(color.value)}
                        className={cn(
                          'h-6 w-6 rounded-full border-2 transition-all',
                          color.class,
                          selectedColor === color.value
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-transparent hover:border-muted-foreground/50'
                        )}
                        title={color.name}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Tags */}
              <div className="flex items-center gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}

                {showTagInput ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddTag();
                        if (e.key === 'Escape') {
                          setShowTagInput(false);
                          setNewTag('');
                        }
                      }}
                      placeholder="Tag name"
                      className="h-7 w-24 text-sm"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={handleAddTag}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        setShowTagInput(false);
                        setNewTag('');
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTagInput(true)}
                    className="h-7 text-muted-foreground"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add tag
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Editor Container - Scrollable */}
          <div className="flex-1 min-h-0 overflow-auto bg-muted/20">
            <div className="max-w-5xl mx-auto h-full px-4 sm:px-6 lg:px-8 py-6">
              <div className="h-full flex flex-col">
                {/* Editor */}
                <div className="flex-1 min-h-[500px]">
                  <TiptapEditor
                    content={content}
                    onChange={handleContentChange}
                    placeholder="Start writing your note..."
                    autoFocus
                  />
                </div>

                {/* Footer Info */}
                <div className="shrink-0 text-sm text-muted-foreground pt-4 mt-4 border-t border-border/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span>
                      Created {format(new Date(note.createdAt), 'MMMM d, yyyy')}
                    </span>
                    <span>
                      {plainText.split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Note</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{note?.title || 'Untitled'}&quot;?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
