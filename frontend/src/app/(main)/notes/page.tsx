'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
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
  FileText,
  Folder,
  Tag,
  Filter,
  Grid3X3,
  List,
  StickyNote,
} from 'lucide-react';
import { notesAPI, projectsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
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
  };
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
  { name: 'Default', value: '' },
  { name: 'Red', value: 'bg-red-500/10 border-red-500/30' },
  { name: 'Orange', value: 'bg-orange-500/10 border-orange-500/30' },
  { name: 'Yellow', value: 'bg-yellow-500/10 border-yellow-500/30' },
  { name: 'Green', value: 'bg-green-500/10 border-green-500/30' },
  { name: 'Blue', value: 'bg-blue-500/10 border-blue-500/30' },
  { name: 'Purple', value: 'bg-purple-500/10 border-purple-500/30' },
  { name: 'Pink', value: 'bg-pink-500/10 border-pink-500/30' },
];

export default function NotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterView, setFilterView] = useState<'all' | 'favorites' | 'archived'>(
    'all'
  );
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      const params: Record<string, unknown> = {};

      if (searchQuery) params.search = searchQuery;
      if (filterProject && filterProject !== 'all')
        params.project = filterProject;
      if (filterView === 'favorites') params.isFavorite = true;
      if (filterView === 'archived') params.isArchived = true;

      const response = await notesAPI.getAll(params);
      setNotes(response.data.data);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filterProject, filterView]);

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
  }, [fetchProjects]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchNotes();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchNotes]);

  const handleCreateNote = async () => {
    try {
      const response = await notesAPI.create({ title: 'Untitled' });
      router.push(`/notes/${response.data.data._id}`);
    } catch (error) {
      console.error('Failed to create note:', error);
      toast.error('Failed to create note');
    }
  };

  const handleTogglePin = async (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    try {
      await notesAPI.togglePin(note._id);
      setNotes((prev) =>
        prev.map((n) =>
          n._id === note._id ? { ...n, isPinned: !n.isPinned } : n
        )
      );
      toast.success(note.isPinned ? 'Note unpinned' : 'Note pinned');
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      toast.error('Failed to update note');
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    try {
      await notesAPI.toggleFavorite(note._id);
      setNotes((prev) =>
        prev.map((n) =>
          n._id === note._id ? { ...n, isFavorite: !n.isFavorite } : n
        )
      );
      toast.success(
        note.isFavorite ? 'Removed from favorites' : 'Added to favorites'
      );
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      toast.error('Failed to update note');
    }
  };

  const handleToggleArchive = async (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    try {
      await notesAPI.toggleArchive(note._id);
      setNotes((prev) => prev.filter((n) => n._id !== note._id));
      toast.success(note.isArchived ? 'Note restored' : 'Note archived');
    } catch (error) {
      console.error('Failed to toggle archive:', error);
      toast.error('Failed to update note');
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    setNoteToDelete(note);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!noteToDelete) return;

    try {
      await notesAPI.delete(noteToDelete._id);
      setNotes((prev) => prev.filter((n) => n._id !== noteToDelete._id));
      toast.success('Note deleted');
    } catch (error) {
      console.error('Failed to delete note:', error);
      toast.error('Failed to delete note');
    } finally {
      setDeleteDialogOpen(false);
      setNoteToDelete(null);
    }
  };

  const getPreviewText = (plainText: string, maxLength: number = 150) => {
    if (!plainText) return 'No content';
    if (plainText.length <= maxLength) return plainText;
    return plainText.substring(0, maxLength) + '...';
  };

  const pinnedNotes = useMemo(
    () => notes.filter((n) => n.isPinned),
    [notes]
  );
  const unpinnedNotes = useMemo(
    () => notes.filter((n) => !n.isPinned),
    [notes]
  );

  const NoteCard = ({ note }: { note: Note }) => (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onClick={() => router.push(`/notes/${note._id}`)}
      className={cn(
        'group cursor-pointer rounded-xl border p-4 transition-all hover:shadow-lg hover:border-primary/50',
        note.color || 'bg-card border-border',
        viewMode === 'list' ? 'flex items-center gap-4' : ''
      )}
    >
      {viewMode === 'grid' ? (
        <>
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-foreground line-clamp-1 flex-1">
              {note.title || 'Untitled'}
            </h3>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => handleTogglePin(e, note)}
              >
                {note.isPinned ? (
                  <PinOff className="h-4 w-4" />
                ) : (
                  <Pin className="h-4 w-4" />
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={(e) => handleToggleFavorite(e as unknown as React.MouseEvent, note)}>
                    {note.isFavorite ? (
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
                  <DropdownMenuItem onClick={(e) => handleToggleArchive(e as unknown as React.MouseEvent, note)}>
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
                    onClick={(e) => handleDeleteClick(e as unknown as React.MouseEvent, note)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-4 mb-3">
            {getPreviewText(note.plainText)}
          </p>

          <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              {note.project && (
                <Badge
                  variant="secondary"
                  className="text-xs"
                  style={{
                    backgroundColor: `${note.project.color}20`,
                    color: note.project.color,
                  }}
                >
                  <Folder className="h-3 w-3 mr-1" />
                  {note.project.name}
                </Badge>
              )}
              {note.isFavorite && (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              )}
              {note.isPinned && (
                <Pin className="h-4 w-4 text-primary" />
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(note.lastEditedAt), {
                addSuffix: true,
              })}
            </span>
          </div>

          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {note.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
              {note.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{note.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground truncate">
                {note.title || 'Untitled'}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {getPreviewText(note.plainText, 80)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {note.project && (
              <Badge
                variant="secondary"
                className="text-xs"
                style={{
                  backgroundColor: `${note.project.color}20`,
                  color: note.project.color,
                }}
              >
                {note.project.name}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {format(new Date(note.lastEditedAt), 'MMM d, yyyy')}
            </span>
            <div className="flex items-center gap-1">
              {note.isFavorite && (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              )}
              {note.isPinned && <Pin className="h-4 w-4 text-primary" />}
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
                <DropdownMenuItem onClick={(e) => handleTogglePin(e as unknown as React.MouseEvent, note)}>
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
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => handleToggleFavorite(e as unknown as React.MouseEvent, note)}>
                  {note.isFavorite ? (
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
                <DropdownMenuItem onClick={(e) => handleToggleArchive(e as unknown as React.MouseEvent, note)}>
                  {note.isArchived ? (
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
                  onClick={(e) => handleDeleteClick(e as unknown as React.MouseEvent, note)}
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
              <StickyNote className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Notes</h1>
              <p className="text-sm text-muted-foreground">
                {notes.length} {notes.length === 1 ? 'note' : 'notes'}
              </p>
            </div>
          </div>
          <Button onClick={handleCreateNote}>
            <Plus className="h-4 w-4 mr-2" />
            New Note
          </Button>
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
              <div
                key={i}
                className="h-48 rounded-xl bg-muted/50 animate-pulse"
              />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <StickyNote className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchQuery || filterProject !== 'all' || filterView !== 'all'
                ? 'No notes found'
                : 'No notes yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterProject !== 'all' || filterView !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first note to get started'}
            </p>
            {!searchQuery && filterProject === 'all' && filterView === 'all' && (
              <Button onClick={handleCreateNote}>
                <Plus className="h-4 w-4 mr-2" />
                Create Note
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pinned Notes */}
            {pinnedNotes.length > 0 && (
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
                    {pinnedNotes.map((note) => (
                      <NoteCard key={note._id} note={note} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Other Notes */}
            {unpinnedNotes.length > 0 && (
              <div>
                {pinnedNotes.length > 0 && (
                  <h2 className="text-sm font-medium text-muted-foreground mb-3">
                    Other Notes
                  </h2>
                )}
                <div
                  className={cn(
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4'
                      : 'space-y-2'
                  )}
                >
                  <AnimatePresence mode="popLayout">
                    {unpinnedNotes.map((note) => (
                      <NoteCard key={note._id} note={note} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{noteToDelete?.title || 'Untitled'}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNoteToDelete(null)}>
              Cancel
            </AlertDialogCancel>
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
