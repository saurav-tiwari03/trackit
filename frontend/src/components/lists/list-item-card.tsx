'use client';

import { ListItem } from '@/types';
import { cn } from '@/lib/utils';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ListItemCardProps {
  item: ListItem;
  onEdit: () => void;
  onDelete: () => void;
  isDragging?: boolean;
}

export function ListItemCard({
  item,
  onEdit,
  onDelete,
  isDragging,
}: ListItemCardProps) {
  return (
    <div
      className={cn(
        'bg-card rounded-lg p-3 border border-border select-none',
        'transition-all duration-150 will-change-transform',
        isDragging
          ? 'shadow-2xl ring-2 ring-primary scale-[1.02] opacity-95 cursor-grabbing'
          : 'cursor-grab hover:shadow-md hover:border-primary/50'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{item.name}</p>
          {item.description?.trim() ? (
            <div
              className="text-xs text-muted-foreground mt-0.5 prose prose-sm prose-invert max-w-none prose-p:my-0.5 prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0 prose-headings:my-1 wrap-break-word"
              dangerouslySetInnerHTML={{ __html: item.description }}
            />
          ) : null}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
          asChild
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
