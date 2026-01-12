'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  Plus,
  Search,
  MoreVertical,
  Pin,
  PinOff,
  Star,
  StarOff,
  Archive,
  ArchiveRestore,
  Trash2,
  Folder,
  FolderOpen,
  FolderPlus,
  Grid3X3,
  List,
  ChevronRight,
  ChevronDown,
  FolderInput,
  Pencil,
  X,
  Check,
  Home,
  PenTool,
} from 'lucide-react';
import { whiteboardsAPI, projectsAPI, foldersAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface WhiteboardFolder {
  _id: string;
  name: string;
  color?: string;
  icon?: string;
}

interface Whiteboard {
  _id: string;
  title: string;
  thumbnail?: string;
  user: string;
  project?: {
    _id: string;
    name: string;
    color: string;
  };
  folder?: WhiteboardFolder;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  lastEditedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface FolderItem {
  _id: string;
  name: string;
  parent?: string;
  color?: string;
  icon?: string;
  isExpanded: boolean;
  order: number;
}

interface Project {
  _id: string;
  name: string;
  color: string;
}

export default function WhiteboardsPage() {
  const router = useRouter();
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterView, setFilterView] = useState<'all' | 'favorites' | 'archived'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [whiteboardToDelete, setWhiteboardToDelete] = useState<Whiteboard | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<FolderItem | null>(null);
  const [deleteFolderDialogOpen, setDeleteFolderDialogOpen] = useState(false);
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParent, setNewFolderParent] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [mobileFolderSheetOpen, setMobileFolderSheetOpen] = useState(false);

  const fetchFolders = useCallback(async () => {
    try {
      const response = await foldersAPI.getAll();
      setFolders(response.data.data);
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    }
  }, []);

  const fetchWhiteboards = useCallback(async () => {
    try {
      const params: Record<string, unknown> = {};

      if (searchQuery) params.search = searchQuery;
      if (filterProject && filterProject !== 'all') params.project = filterProject;
      if (filterView === 'favorites') params.isFavorite = true;
      if (filterView === 'archived') params.isArchived = true;
      if (selectedFolder) params.folder = selectedFolder;

      const response = await whiteboardsAPI.getAll(params);
      setWhiteboards(response.data.data);
    } catch (error) {
      console.error('Failed to fetch whiteboards:', error);
      toast.error('Failed to load whiteboards');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filterProject, filterView, selectedFolder]);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchFolders();
  }, [fetchProjects, fetchFolders]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchWhiteboards();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchWhiteboards]);

  const handleCreateWhiteboard = async () => {
    try {
      const response = await whiteboardsAPI.create({
        title: 'Untitled Whiteboard',
        folder: selectedFolder || undefined,
      });
      router.push(`/whiteboards/${response.data.data._id}`);
    } catch (error) {
      console.error('Failed to create whiteboard:', error);
      toast.error('Failed to create whiteboard');
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const response = await foldersAPI.create({
        name: newFolderName.trim(),
        parent: newFolderParent || undefined,
      });
      setFolders((prev) => [...prev, response.data.data]);
      setNewFolderName('');
      setNewFolderParent(null);
      setNewFolderDialogOpen(false);
      toast.success('Folder created');
    } catch (error) {
      console.error('Failed to create folder:', error);
      toast.error('Failed to create folder');
    }
  };

  const openNewFolderDialog = (parentId: string | null = null) => {
    setNewFolderParent(parentId);
    setNewFolderName('');
    setNewFolderDialogOpen(true);
  };

  const handleRenameFolder = async (folderId: string) => {
    if (!editingFolderName.trim()) {
      setEditingFolderId(null);
      return;
    }

    try {
      await foldersAPI.update(folderId, { name: editingFolderName.trim() });
      setFolders((prev) =>
        prev.map((f) => (f._id === folderId ? { ...f, name: editingFolderName.trim() } : f))
      );
      setEditingFolderId(null);
      toast.success('Folder renamed');
    } catch (error) {
      console.error('Failed to rename folder:', error);
      toast.error('Failed to rename folder');
    }
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;

    try {
      await foldersAPI.delete(folderToDelete._id);
      setFolders((prev) => prev.filter((f) => f._id !== folderToDelete._id));
      if (selectedFolder === folderToDelete._id) {
        setSelectedFolder(null);
      }
      toast.success('Folder deleted');
      fetchWhiteboards();
    } catch (error) {
      console.error('Failed to delete folder:', error);
      toast.error('Failed to delete folder');
    } finally {
      setDeleteFolderDialogOpen(false);
      setFolderToDelete(null);
    }
  };

  const handleToggleFolderExpand = async (folderId: string) => {
    try {
      await foldersAPI.toggle(folderId);
      setFolders((prev) =>
        prev.map((f) => (f._id === folderId ? { ...f, isExpanded: !f.isExpanded } : f))
      );
    } catch (error) {
      console.error('Failed to toggle folder:', error);
    }
  };

  const handleMoveWhiteboard = async (whiteboardId: string, folderId: string | null) => {
    try {
      await whiteboardsAPI.move(whiteboardId, folderId);
      setWhiteboards((prev) =>
        prev.map((w) =>
          w._id === whiteboardId
            ? {
                ...w,
                folder: folderId ? folders.find((f) => f._id === folderId) : undefined,
              }
            : w
        )
      );
      toast.success(folderId ? 'Whiteboard moved to folder' : 'Whiteboard moved to root');
    } catch (error) {
      console.error('Failed to move whiteboard:', error);
      toast.error('Failed to move whiteboard');
    }
  };

  const handleTogglePin = async (e: React.MouseEvent, whiteboard: Whiteboard) => {
    e.stopPropagation();
    try {
      await whiteboardsAPI.togglePin(whiteboard._id);
      setWhiteboards((prev) =>
        prev.map((w) => (w._id === whiteboard._id ? { ...w, isPinned: !w.isPinned } : w))
      );
      toast.success(whiteboard.isPinned ? 'Whiteboard unpinned' : 'Whiteboard pinned');
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      toast.error('Failed to update whiteboard');
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, whiteboard: Whiteboard) => {
    e.stopPropagation();
    try {
      await whiteboardsAPI.toggleFavorite(whiteboard._id);
      setWhiteboards((prev) =>
        prev.map((w) => (w._id === whiteboard._id ? { ...w, isFavorite: !w.isFavorite } : w))
      );
      toast.success(whiteboard.isFavorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      toast.error('Failed to update whiteboard');
    }
  };

  const handleToggleArchive = async (e: React.MouseEvent, whiteboard: Whiteboard) => {
    e.stopPropagation();
    try {
      await whiteboardsAPI.toggleArchive(whiteboard._id);
      setWhiteboards((prev) => prev.filter((w) => w._id !== whiteboard._id));
      toast.success(whiteboard.isArchived ? 'Whiteboard restored' : 'Whiteboard archived');
    } catch (error) {
      console.error('Failed to toggle archive:', error);
      toast.error('Failed to update whiteboard');
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, whiteboard: Whiteboard) => {
    e.stopPropagation();
    setWhiteboardToDelete(whiteboard);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!whiteboardToDelete) return;

    try {
      await whiteboardsAPI.delete(whiteboardToDelete._id);
      setWhiteboards((prev) => prev.filter((w) => w._id !== whiteboardToDelete._id));
      toast.success('Whiteboard deleted');
    } catch (error) {
      console.error('Failed to delete whiteboard:', error);
      toast.error('Failed to delete whiteboard');
    } finally {
      setDeleteDialogOpen(false);
      setWhiteboardToDelete(null);
    }
  };

  // Get root level folders (no parent)
  const rootFolders = useMemo(
    () => folders.filter((f) => !f.parent).sort((a, b) => a.order - b.order),
    [folders]
  );

  const getSubfolders = useCallback(
    (parentId: string) =>
      folders.filter((f) => f.parent === parentId).sort((a, b) => a.order - b.order),
    [folders]
  );

  const pinnedWhiteboards = useMemo(() => whiteboards.filter((w) => w.isPinned), [whiteboards]);
  const unpinnedWhiteboards = useMemo(() => whiteboards.filter((w) => !w.isPinned), [whiteboards]);

  const FolderTreeItem = ({
    folder,
    level = 0,
  }: {
    folder: FolderItem;
    level?: number;
  }) => {
    const subfolders = getSubfolders(folder._id);
    const isSelected = selectedFolder === folder._id;
    const isEditing = editingFolderId === folder._id;

    return (
      <div>
        <div
          className={cn(
            'group flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors',
            isSelected
              ? 'bg-primary/10 text-primary'
              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          )}
          style={{ paddingLeft: `${8 + level * 16}px` }}
          onClick={() => !isEditing && setSelectedFolder(folder._id)}
        >
          {subfolders.length > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFolderExpand(folder._id);
              }}
              className="p-0.5 hover:bg-muted rounded"
            >
              {folder.isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}

          {isSelected ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
          ) : (
            <Folder
              className="h-4 w-4 shrink-0"
              style={{ color: folder.color || undefined }}
            />
          )}

          {isEditing ? (
            <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
              <Input
                value={editingFolderName}
                onChange={(e) => setEditingFolderName(e.target.value)}
                className="h-6 text-sm py-0 px-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameFolder(folder._id);
                  if (e.key === 'Escape') setEditingFolderId(null);
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => handleRenameFolder(folder._id)}
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setEditingFolderId(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <>
              <span className="text-sm truncate flex-1">{folder.name}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      openNewFolderDialog(folder._id);
                    }}
                  >
                    <FolderPlus className="h-4 w-4 mr-2" />
                    New subfolder
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFolderId(folder._id);
                      setEditingFolderName(folder.name);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFolderToDelete(folder);
                      setDeleteFolderDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>

        {folder.isExpanded && subfolders.length > 0 && (
          <div>
            {subfolders.map((subfolder) => (
              <FolderTreeItem key={subfolder._id} folder={subfolder} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Mobile folder item component
  const MobileFolderItem = ({
    folder,
    level = 0,
  }: {
    folder: FolderItem;
    level?: number;
  }) => {
    const subfolders = getSubfolders(folder._id);
    const isSelected = selectedFolder === folder._id;

    return (
      <div>
        <div
          className={cn(
            'flex items-center gap-2 py-2 px-3 rounded-md cursor-pointer transition-colors',
            isSelected
              ? 'bg-primary/10 text-primary'
              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          )}
          style={{ paddingLeft: `${12 + level * 16}px` }}
          onClick={() => {
            setSelectedFolder(folder._id);
            setMobileFolderSheetOpen(false);
          }}
        >
          {subfolders.length > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFolderExpand(folder._id);
              }}
              className="p-0.5"
            >
              {folder.isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}

          {isSelected ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
          ) : (
            <Folder
              className="h-4 w-4 shrink-0"
              style={{ color: folder.color || undefined }}
            />
          )}

          <span className="text-sm truncate flex-1">{folder.name}</span>
        </div>

        {folder.isExpanded && subfolders.length > 0 && (
          <div>
            {subfolders.map((subfolder) => (
              <MobileFolderItem key={subfolder._id} folder={subfolder} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const WhiteboardCard = ({ whiteboard }: { whiteboard: Whiteboard }) => (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onClick={() => router.push(`/whiteboards/${whiteboard._id}`)}
      className={cn(
        'group cursor-pointer rounded-xl border bg-card transition-all hover:shadow-lg hover:border-primary/50 overflow-hidden',
        viewMode === 'list' ? 'flex items-center gap-4 p-4' : ''
      )}
    >
      {viewMode === 'grid' ? (
        <>
          {/* Thumbnail */}
          <div className="aspect-video bg-muted/50 relative overflow-hidden">
            {whiteboard.thumbnail ? (
              <img
                src={whiteboard.thumbnail}
                alt={whiteboard.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <PenTool className="h-12 w-12 text-muted-foreground/30" />
              </div>
            )}
            {/* Actions overlay */}
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="secondary"
                size="sm"
                className="h-7 w-7 p-0 bg-background/80 backdrop-blur-sm"
                onClick={(e) => handleTogglePin(e, whiteboard)}
              >
                {whiteboard.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 w-7 p-0 bg-background/80 backdrop-blur-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <FolderInput className="h-4 w-4 mr-2" />
                      Move to folder
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveWhiteboard(whiteboard._id, null);
                          }}
                        >
                          <Home className="h-4 w-4 mr-2" />
                          Root (No folder)
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {folders.map((folder) => (
                          <DropdownMenuItem
                            key={folder._id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveWhiteboard(whiteboard._id, folder._id);
                            }}
                          >
                            <Folder className="h-4 w-4 mr-2" />
                            {folder.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => handleToggleFavorite(e as unknown as React.MouseEvent, whiteboard)}
                  >
                    {whiteboard.isFavorite ? (
                      <>
                        <StarOff className="h-4 w-4 mr-2" />
                        Remove from favorites
                      </>
                    ) : (
                      <>
                        <Star className="h-4 w-4 mr-2" />
                        Add to favorites
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => handleToggleArchive(e as unknown as React.MouseEvent, whiteboard)}
                  >
                    {whiteboard.isArchived ? (
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
                    onClick={(e) => handleDeleteClick(e as unknown as React.MouseEvent, whiteboard)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Info */}
          <div className="p-4">
            <h3 className="font-semibold text-foreground line-clamp-1 mb-2">
              {whiteboard.title || 'Untitled'}
            </h3>

            <div className="flex items-center gap-2 flex-wrap">
              {whiteboard.folder && (
                <Badge variant="secondary" className="text-xs">
                  <Folder className="h-3 w-3 mr-1" />
                  <span className="truncate max-w-[100px]">{whiteboard.folder.name}</span>
                </Badge>
              )}
              {whiteboard.project && (
                <Badge
                  variant="secondary"
                  className="text-xs"
                  style={{
                    backgroundColor: `${whiteboard.project.color}20`,
                    color: whiteboard.project.color,
                  }}
                >
                  <span className="truncate max-w-[100px]">{whiteboard.project.name}</span>
                </Badge>
              )}
              {whiteboard.isFavorite && (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 shrink-0" />
              )}
              {whiteboard.isPinned && <Pin className="h-4 w-4 text-primary shrink-0" />}
            </div>
            <span className="text-xs text-muted-foreground block mt-2">
              {formatDistanceToNow(new Date(whiteboard.lastEditedAt), { addSuffix: true })}
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-md bg-muted/50 flex items-center justify-center flex-shrink-0">
              <PenTool className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground truncate">{whiteboard.title || 'Untitled'}</h3>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(whiteboard.lastEditedAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {whiteboard.folder && (
              <Badge variant="secondary" className="text-xs">
                <Folder className="h-3 w-3 mr-1" />
                {whiteboard.folder.name}
              </Badge>
            )}
            {whiteboard.project && (
              <Badge
                variant="secondary"
                className="text-xs"
                style={{
                  backgroundColor: `${whiteboard.project.color}20`,
                  color: whiteboard.project.color,
                }}
              >
                {whiteboard.project.name}
              </Badge>
            )}
            <div className="flex items-center gap-1">
              {whiteboard.isFavorite && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
              {whiteboard.isPinned && <Pin className="h-4 w-4 text-primary" />}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onClick={(e) => handleTogglePin(e as unknown as React.MouseEvent, whiteboard)}
                >
                  {whiteboard.isPinned ? (
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
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => handleToggleFavorite(e as unknown as React.MouseEvent, whiteboard)}
                >
                  {whiteboard.isFavorite ? (
                    <>
                      <StarOff className="h-4 w-4 mr-2" />
                      Remove from favorites
                    </>
                  ) : (
                    <>
                      <Star className="h-4 w-4 mr-2" />
                      Add to favorites
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => handleToggleArchive(e as unknown as React.MouseEvent, whiteboard)}
                >
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
                  onClick={(e) => handleDeleteClick(e as unknown as React.MouseEvent, whiteboard)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </motion.div>
  );

  return (
    <div className="h-full flex">
      {/* Folder Sidebar */}
      <div className="w-56 border-r border-border bg-muted/30 flex-shrink-0 hidden md:flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Folders
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => openNewFolderDialog()}
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {/* All Whiteboards */}
            <div
              className={cn(
                'flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors',
                selectedFolder === null && filterView === 'all'
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setSelectedFolder(null)}
            >
              <PenTool className="h-4 w-4" />
              <span className="text-sm">All Whiteboards</span>
            </div>

            {/* Folder Tree */}
            <div className="mt-2 space-y-0.5">
              {rootFolders.map((folder) => (
                <FolderTreeItem key={folder._id} folder={folder} />
              ))}
            </div>

            {rootFolders.length === 0 && (
              <div className="mt-4 text-center py-4 text-muted-foreground">
                <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No folders yet</p>
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs"
                  onClick={() => openNewFolderDialog()}
                >
                  Create one
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30">
                <PenTool className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  {selectedFolder
                    ? folders.find((f) => f._id === selectedFolder)?.name || 'Whiteboards'
                    : 'All Whiteboards'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {whiteboards.length} {whiteboards.length === 1 ? 'whiteboard' : 'whiteboards'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sheet open={mobileFolderSheetOpen} onOpenChange={setMobileFolderSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="md:hidden">
                    <Folder className="h-4 w-4 mr-2" />
                    Folders
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0" hideCloseButton>
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle className="flex items-center justify-between">
                      <span>Folders</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setMobileFolderSheetOpen(false);
                          openNewFolderDialog();
                        }}
                      >
                        <FolderPlus className="h-4 w-4" />
                      </Button>
                    </SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-80px)]">
                    <div className="p-2">
                      {/* All Whiteboards */}
                      <div
                        className={cn(
                          'flex items-center gap-2 py-2 px-3 rounded-md cursor-pointer transition-colors',
                          selectedFolder === null && filterView === 'all'
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                        )}
                        onClick={() => {
                          setSelectedFolder(null);
                          setMobileFolderSheetOpen(false);
                        }}
                      >
                        <PenTool className="h-4 w-4" />
                        <span className="text-sm font-medium">All Whiteboards</span>
                      </div>

                      {/* Folder Tree */}
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground px-3 mb-2">FOLDERS</p>
                        {rootFolders.map((folder) => (
                          <MobileFolderItem key={folder._id} folder={folder} />
                        ))}
                        {rootFolders.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <Folder className="h-10 w-10 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No folders yet</p>
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => {
                                setMobileFolderSheetOpen(false);
                                openNewFolderDialog();
                              }}
                            >
                              Create your first folder
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>
              <Button onClick={handleCreateWhiteboard}>
                <Plus className="h-4 w-4 mr-2" />
                New Whiteboard
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-4 pb-4">
            <div className="relative flex-1 min-w-[150px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-[140px] sm:w-[180px]">
                <Folder className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
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

            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={filterView === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFilterView('all')}
                className="h-8 px-2 sm:px-3"
              >
                All
              </Button>
              <Button
                variant={filterView === 'favorites' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFilterView('favorites')}
                className="h-8 px-2 sm:px-3"
              >
                <Star className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Favorites</span>
              </Button>
              <Button
                variant={filterView === 'archived' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFilterView('archived')}
                className="h-8 px-2 sm:px-3"
              >
                <Archive className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Archived</span>
              </Button>
            </div>

            <div className="flex items-center gap-1 sm:border-l sm:border-border sm:pl-3">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 w-8 p-0"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 w-8 p-0"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] rounded-xl bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : whiteboards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <PenTool className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchQuery || filterProject !== 'all' || filterView !== 'all' || selectedFolder
                  ? 'No whiteboards found'
                  : 'No whiteboards yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filterProject !== 'all' || filterView !== 'all' || selectedFolder
                  ? 'Try adjusting your filters'
                  : 'Create your first whiteboard to get started'}
              </p>
              {!searchQuery && filterProject === 'all' && filterView === 'all' && (
                <Button onClick={handleCreateWhiteboard}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Whiteboard
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Pinned Whiteboards */}
              {pinnedWhiteboards.length > 0 && (
                <div>
                  <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Pin className="h-4 w-4" />
                    Pinned
                  </h2>
                  <div
                    className={cn(
                      viewMode === 'grid'
                        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4'
                        : 'space-y-2'
                    )}
                  >
                    <AnimatePresence mode="popLayout">
                      {pinnedWhiteboards.map((whiteboard) => (
                        <WhiteboardCard key={whiteboard._id} whiteboard={whiteboard} />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Other Whiteboards */}
              {unpinnedWhiteboards.length > 0 && (
                <div>
                  {pinnedWhiteboards.length > 0 && (
                    <h2 className="text-sm font-medium text-muted-foreground mb-3">Other Whiteboards</h2>
                  )}
                  <div
                    className={cn(
                      viewMode === 'grid'
                        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4'
                        : 'space-y-2'
                    )}
                  >
                    <AnimatePresence mode="popLayout">
                      {unpinnedWhiteboards.map((whiteboard) => (
                        <WhiteboardCard key={whiteboard._id} whiteboard={whiteboard} />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New Folder Dialog */}
      <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {newFolderParent
                ? `Create Subfolder in "${folders.find((f) => f._id === newFolderParent)?.name}"`
                : 'Create New Folder'}
            </DialogTitle>
            <DialogDescription>
              {newFolderParent
                ? 'Enter a name for the new subfolder.'
                : 'Enter a name for your new folder.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewFolderDialogOpen(false);
                setNewFolderParent(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Whiteboard Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Whiteboard</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{whiteboardToDelete?.title || 'Untitled'}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setWhiteboardToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Folder Confirmation Dialog */}
      <AlertDialog open={deleteFolderDialogOpen} onOpenChange={setDeleteFolderDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{folderToDelete?.name}&quot;? Whiteboards in this
              folder will be moved to the root level.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFolderToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolder}
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
