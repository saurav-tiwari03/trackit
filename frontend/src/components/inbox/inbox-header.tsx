'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Check,
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
import { ListsPopover } from '@/components/lists/lists-popover';

export type InboxViewMode = 'grid' | 'board' | 'schedule' | 'charts';
export type InboxFilter = 'all' | 'not_started' | 'in_progress' | 'completed' | 'late';

interface InboxHeaderProps {
  viewMode: InboxViewMode;
  onViewModeChange: (mode: InboxViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filter: InboxFilter;
  onFilterChange: (filter: InboxFilter) => void;
  groupBy: string;
  onGroupByChange: (groupBy: string) => void;
  currentTheme: string;
  onThemeChange: (themeId: string) => void;
}

const filterOptions: Array<{ value: InboxFilter; label: string }> = [
  { value: 'all', label: 'All tasks' },
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'late', label: 'Late' },
];

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
  filter,
  onFilterChange,
  groupBy,
  onGroupByChange,
  currentTheme,
  onThemeChange,
}: InboxHeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isCustomTheme = currentTheme.startsWith('custom:') || !['dark', 'light'].includes(currentTheme);
  const activeFilter = filterOptions.find((f) => f.value === filter);

  return (
    <div className={cn(
      "flex items-center gap-4 px-4 py-3 sticky top-0 z-10",
      isCustomTheme ? "bg-background/60 backdrop-blur-md" : "bg-background/95 backdrop-blur-sm"
    )}>
      {/* Left: Search with bottom border */}
      <div className="flex items-center gap-4 border-b border-white/30 pb-2">
        <div className="relative w-[280px] sm:w-[350px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 bg-transparent border-0 focus-visible:ring-0"
          />
        </div>
        
        {/* Filters - inside the bordered container */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 shrink-0">
              <Filter className="h-4 w-4" />
              {activeFilter?.value === 'all' ? 'Filters' : activeFilter?.label}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[200px]">
            {filterOptions.map((option, index) => (
              <div key={option.value}>
                {index === 1 && <DropdownMenuSeparator />}
                <DropdownMenuItem 
                  className="cursor-pointer flex items-center justify-between"
                  onClick={() => onFilterChange(option.value)}
                >
                  {option.label}
                  {filter === option.value && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Spacer to push view controls to right */}
      <div className="flex-1" />

      {/* Right: View Controls */}
      <div className="flex items-center">
        {/* Group By - Only show in Board view with smooth animation */}
        <AnimatePresence mode="wait">
          {viewMode === 'board' && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden mr-2"
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 whitespace-nowrap">
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* View Mode Tabs - Enhanced Design with Sliding Animation */}
        <div className="flex items-center border rounded-lg p-1 bg-muted/20 relative">
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

        {/* Grocery List Button */}
        <div className="ml-2">
          <ListsPopover />
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
