'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  Plus,
  StickyNote,
  Pin,
  Star,
  Folder,
  ArrowRight,
  Tag,
} from 'lucide-react';
import { notesAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';

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

export function RecentNotes() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    try {
      const response = await notesAPI.getAll({ sortBy: 'lastEditedAt', sortOrder: 'desc' });
      // Get only the first 6 notes for the dashboard
      setNotes((response.data.data || []).slice(0, 6));
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleCreateNote = async () => {
    try {
      const response = await notesAPI.create({ title: 'Untitled' });
      router.push(`/notes/${response.data.data._id}`);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const getPreviewText = (plainText: string, maxLength: number = 80) => {
    if (!plainText) return 'No content';
    if (plainText.length <= maxLength) return plainText;
    return plainText.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-amber-500" />
              Recent Notes
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-xl bg-muted/50 animate-pulse"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-amber-500" />
              Recent Notes
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleCreateNote}>
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
              <Link
                href="/notes"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-3 rounded-full bg-muted mb-3">
                <StickyNote className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-3">No notes yet</p>
              <Button size="sm" onClick={handleCreateNote}>
                <Plus className="h-4 w-4 mr-1" />
                Create Note
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {notes.map((note, index) => (
                <motion.div
                  key={note._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  onClick={() => router.push(`/notes/${note._id}`)}
                  className={cn(
                    'group cursor-pointer rounded-xl border p-3 transition-all hover:shadow-md hover:border-primary/50',
                    note.color || 'bg-card/80 border-border/50'
                  )}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-sm text-foreground line-clamp-1 flex-1">
                      {note.title || 'Untitled'}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {note.isPinned && (
                        <Pin className="h-3 w-3 text-primary" />
                      )}
                      {note.isFavorite && (
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                  </div>

                  {/* Preview */}
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {getPreviewText(note.plainText)}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {note.project && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] h-5 px-1.5 shrink-0"
                          style={{
                            backgroundColor: `${note.project.color}20`,
                            color: note.project.color,
                          }}
                        >
                          <Folder className="h-2.5 w-2.5 mr-0.5" />
                          <span className="truncate max-w-[60px]">{note.project.name}</span>
                        </Badge>
                      )}
                      {note.tags.length > 0 && (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                          <Tag className="h-2.5 w-2.5 mr-0.5" />
                          {note.tags.length}
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                      {formatDistanceToNow(new Date(note.lastEditedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

