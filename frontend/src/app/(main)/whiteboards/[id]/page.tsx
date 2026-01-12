'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  Clock,
  Loader2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { whiteboardsAPI, projectsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import Whiteboard, { type WhiteboardElement } from '@/components/whiteboard';

interface WhiteboardData {
  _id: string;
  title: string;
  elements: string;
  user: string;
  project?: {
    _id: string;
    name: string;
    color: string;
  } | string;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  lastEditedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  _id: string;
  name: string;
  color: string;
}

export default function WhiteboardEditorPage() {
  const router = useRouter();
  const params = useParams();
  const whiteboardId = params.id as string;

  const [whiteboard, setWhiteboard] = useState<WhiteboardData | null>(null);
  const [title, setTitle] = useState('Untitled Whiteboard');
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoad = useRef(true);

  const fetchWhiteboard = useCallback(async () => {
    try {
      const response = await whiteboardsAPI.getOne(whiteboardId);
      const data = response.data.data;
      setWhiteboard(data);
      setTitle(data.title);
      
      // Parse elements
      try {
        const parsedElements = JSON.parse(data.elements || '[]');
        setElements(parsedElements);
      } catch {
        setElements([]);
      }

      // Set project
      if (data.project) {
        const projectId = typeof data.project === 'string' ? data.project : data.project._id;
        setSelectedProject(projectId);
      }

      setLastSaved(new Date(data.updatedAt));
    } catch (error) {
      console.error('Failed to fetch whiteboard:', error);
      toast.error('Failed to load whiteboard');
      router.push('/whiteboards');
    } finally {
      setIsLoading(false);
      isInitialLoad.current = false;
    }
  }, [whiteboardId, router]);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }, []);

  useEffect(() => {
    fetchWhiteboard();
    fetchProjects();
  }, [fetchWhiteboard, fetchProjects]);

  const saveWhiteboard = useCallback(async () => {
    if (!whiteboard) return;

    setIsSaving(true);
    try {
      await whiteboardsAPI.update(whiteboard._id, {
        title,
        elements: JSON.stringify(elements),
        project: selectedProject || undefined,
      });
      setLastSaved(new Date());
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save whiteboard:', error);
      toast.error('Failed to save whiteboard');
    } finally {
      setIsSaving(false);
    }
  }, [whiteboard, title, elements, selectedProject]);

  // Auto-save when changes are made
  useEffect(() => {
    if (!hasChanges || !whiteboard || isInitialLoad.current) return;

    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }

    autoSaveTimeout.current = setTimeout(() => {
      saveWhiteboard();
    }, 3000);

    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, [hasChanges, saveWhiteboard, whiteboard]);

  const handleElementsChange = useCallback((newElements: WhiteboardElement[]) => {
    if (isInitialLoad.current) return;
    setElements(newElements);
    setHasChanges(true);
  }, []);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setHasChanges(true);
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId === 'none' ? '' : projectId);
    setHasChanges(true);
  };

  const handleTogglePin = async () => {
    if (!whiteboard) return;
    try {
      await whiteboardsAPI.togglePin(whiteboard._id);
      setWhiteboard({ ...whiteboard, isPinned: !whiteboard.isPinned });
      toast.success(whiteboard.isPinned ? 'Unpinned' : 'Pinned');
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      toast.error('Failed to update whiteboard');
    }
  };

  const handleToggleFavorite = async () => {
    if (!whiteboard) return;
    try {
      await whiteboardsAPI.toggleFavorite(whiteboard._id);
      setWhiteboard({ ...whiteboard, isFavorite: !whiteboard.isFavorite });
      toast.success(whiteboard.isFavorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      toast.error('Failed to update whiteboard');
    }
  };

  const handleToggleArchive = async () => {
    if (!whiteboard) return;
    try {
      await whiteboardsAPI.toggleArchive(whiteboard._id);
      toast.success(whiteboard.isArchived ? 'Whiteboard restored' : 'Whiteboard archived');
      router.push('/whiteboards');
    } catch (error) {
      console.error('Failed to toggle archive:', error);
      toast.error('Failed to update whiteboard');
    }
  };

  const handleConfirmDelete = async () => {
    if (!whiteboard) return;
    try {
      await whiteboardsAPI.delete(whiteboard._id);
      toast.success('Whiteboard deleted');
      router.push('/whiteboards');
    } catch (error) {
      console.error('Failed to delete whiteboard:', error);
      toast.error('Failed to delete whiteboard');
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleManualSave = async () => {
    await saveWhiteboard();
    toast.success('Whiteboard saved');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!whiteboard) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Whiteboard not found</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header - hidden in fullscreen */}
      {!isFullscreen && (
        <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20">
          <div className="flex items-center justify-between p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (hasChanges) saveWhiteboard();
                  router.push('/whiteboards');
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>

              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Untitled Whiteboard"
                className="border-none bg-transparent text-lg font-semibold focus-visible:ring-0 px-2 max-w-xs"
              />

              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {lastSaved ? (
                  <span className="hidden md:inline">
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
                {hasChanges && !isSaving && (
                  <span className="text-amber-500">Unsaved</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <div className="hidden sm:block">
                <Select value={selectedProject || 'none'} onValueChange={handleProjectChange}>
                  <SelectTrigger className="w-[140px]">
                    <Folder className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="No project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project._id} value={project._id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: project.color }}
                          />
                          {project.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleTogglePin}
                title={whiteboard.isPinned ? 'Unpin' : 'Pin'}
              >
                {whiteboard.isPinned ? (
                  <PinOff className="h-4 w-4" />
                ) : (
                  <Pin className="h-4 w-4" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleFavorite}
                title={whiteboard.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                {whiteboard.isFavorite ? (
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                ) : (
                  <Star className="h-4 w-4" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
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
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleToggleArchive}>
                    {whiteboard.isArchived ? (
                      <>
                        <ArchiveRestore className="h-4 w-4 mr-2" />
                        Restore
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
      )}

      {/* Fullscreen exit button */}
      {isFullscreen && (
        <Button
          variant="secondary"
          size="sm"
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 z-50 shadow-lg"
        >
          <Minimize2 className="h-4 w-4 mr-2" />
          Exit Fullscreen
        </Button>
      )}

      {/* Whiteboard Canvas */}
      <div className="flex-1 min-h-0 relative">
        <Whiteboard
          initialElements={elements}
          onChange={handleElementsChange}
          onSave={handleManualSave}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Whiteboard</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{whiteboard?.title || 'Untitled'}&quot;?
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
  );
}
