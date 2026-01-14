'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  LayoutGrid,
  Kanban,
  Calendar,
  BarChart3,
  ChevronDown,
  Plus,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { InboxSettingsSidebar } from './inbox-settings-sidebar';

export type InboxViewMode = 'grid' | 'board' | 'schedule' | 'charts';

interface InboxHeaderProps {
  viewMode: InboxViewMode;
  onViewModeChange: (mode: InboxViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  groupBy: string;
  onGroupByChange: (groupBy: string) => void;
  currentTheme: string;
  onThemeChange: (themeId: string) => void;
}

const viewModes: Array<{ value: InboxViewMode; label: string; icon: React.ReactNode; description: string }> = [
  { value: 'grid', label: 'Grid', icon: <LayoutGrid className="h-4 w-4" />, description: 'Table view' },
  { value: 'board', label: 'Board', icon: <Kanban className="h-4 w-4" />, description: 'Kanban board' },
  { value: 'schedule', label: 'Schedule', icon: <Calendar className="h-4 w-4" />, description: 'Calendar view' },
  { value: 'charts', label: 'Charts', icon: <BarChart3 className="h-4 w-4" />, description: 'Analytics' },
];

const groupByOptions = [
  { value: 'bucket', label: 'Bucket' },
  { value: 'assignee', label: 'Assigned to' },
  { value: 'progress', label: 'Progress' },
  { value: 'priority', label: 'Priority' },
  { value: 'dueDate', label: 'Due date' },
];

export function InboxHeader({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  groupBy,
  onGroupByChange,
  currentTheme,
  onThemeChange,
}: InboxHeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isCustomTheme = currentTheme.startsWith('custom:') || !['dark', 'light'].includes(currentTheme);

  return (
    <div className={cn(
      "flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10",
      isCustomTheme ? "bg-background/60 backdrop-blur-md" : "bg-background/95 backdrop-blur-sm"
    )}>
      {/* Left: Search */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tasks..."
            className="w-[280px] pl-9 bg-muted/30 border-0"
          />
        </div>
      </div>

      {/* Right: View Controls */}
      <div className="flex items-center gap-2">
        {/* Filters */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuItem>All tasks</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Not started</DropdownMenuItem>
            <DropdownMenuItem>In progress</DropdownMenuItem>
            <DropdownMenuItem>Completed</DropdownMenuItem>
            <DropdownMenuItem>Late</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Group By - Only show in Board view */}
        {viewMode === 'board' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Kanban className="h-4 w-4" />
                Group by {groupByOptions.find((o) => o.value === groupBy)?.label}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              {groupByOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => onGroupByChange(option.value)}
                  className={cn(groupBy === option.value && 'bg-muted')}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* View Mode Tabs - Enhanced Design with Sliding Animation */}
        <div className="flex items-center border rounded-lg p-1 ml-2 bg-muted/20 relative">
          {viewModes.map((mode) => {
            const isActive = viewMode === mode.value;
            return (
              <button
                key={mode.value}
                onClick={() => onViewModeChange(mode.value)}
                className={cn(
                  'relative flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 z-10',
                  isActive
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title={mode.description}
              >
                {/* Sliding background indicator */}
                {isActive && (
                  <motion.div
                    layoutId="viewModeIndicator"
                    className="absolute inset-0 bg-primary rounded-md shadow-sm"
                    initial={false}
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 35,
                    }}
                  />
                )}
                <span className="relative z-10">{mode.icon}</span>
                <span className="relative z-10 hidden sm:inline">{mode.label}</span>
              </button>
            );
          })}
        </div>

        {/* Settings Button */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 ml-2 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* Settings Sidebar */}
      <InboxSettingsSidebar
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentTheme={currentTheme}
        onThemeChange={onThemeChange}
      />
    </div>
  );
}
