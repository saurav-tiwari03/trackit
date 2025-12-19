'use client';

import { Calendar, MessageSquare, CheckSquare, MoreHorizontal } from 'lucide-react';
import { Task } from '@/types';
import { cn, formatRelativeDate, getPriorityColor } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface KanbanCardProps {
  task: Task;
  onClick: () => void;
  onQuickStatusChange?: (next: 'open' | 'in_progress' | 'completed') => void;
  isDragging?: boolean;
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function KanbanCard({ task, onClick, onQuickStatusChange, isDragging }: KanbanCardProps) {
  const completedSubtasks = task.subtasks.filter(s => s.isCompleted).length;
  const totalSubtasks = task.subtasks.length;

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-card rounded-lg p-3 cursor-pointer select-none',
        'border border-border',
        'transition-all duration-150 will-change-transform',
        isDragging
          ? 'shadow-2xl ring-2 ring-primary scale-[1.02] opacity-95'
          : 'hover:shadow-md hover:border-primary/50'
      )}
    >
      {/* Priority indicator */}
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('w-1.5 h-1.5 rounded-full', getPriorityColor(task.priority))} />
        <span className="text-xs text-muted-foreground">{task.priority}</span>
        {task.labels.length > 0 && (
          <div className="flex gap-1">
            {task.labels.slice(0, 2).map((label, i) => (
              <Badge key={i} variant="secondary" className="text-xs px-1.5 py-0">
                {label}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Title */}
      <h4
        className={cn(
          'text-sm font-medium mb-2',
          task.isCompleted && 'line-through text-muted-foreground'
        )}
      >
        {task.title}
      </h4>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {task.description.replace(/<[^>]*>/g, '')}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Due date */}
          {task.dueDate && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs',
                new Date(task.dueDate) < new Date() && !task.isCompleted
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              )}
            >
              <Calendar className="w-3 h-3" />
              <span>{formatRelativeDate(task.dueDate)}</span>
            </div>
          )}

          {/* Subtasks */}
          {totalSubtasks > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckSquare className="w-3 h-3" />
              <span>
                {completedSubtasks}/{totalSubtasks}
              </span>
            </div>
          )}

          {/* Comments indicator */}
          {task.comments && task.comments.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="w-3 h-3" />
              <span>{task.comments.length}</span>
            </div>
          )}
        </div>

        {/* Assignee */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-7 w-7"
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
                  onQuickStatusChange?.('open');
                }}
              >
                Move to To Do
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onQuickStatusChange?.('in_progress');
                }}
              >
                Move to In Progress
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onQuickStatusChange?.('completed');
                }}
              >
                Move to Completed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {task.assignee && (
            <Avatar className="h-6 w-6">
              {task.assignee.avatar && (
                <AvatarImage src={task.assignee.avatar} alt={task.assignee.name} />
              )}
              <AvatarFallback className="text-xs">
                {getInitials(task.assignee.name)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </div>
  );
}
