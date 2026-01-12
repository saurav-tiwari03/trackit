'use client';

import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LuSearch } from 'react-icons/lu';

// Import icon sets
import * as LuIcons from 'react-icons/lu';
import * as FaIcons from 'react-icons/fa';
import * as Fa6Icons from 'react-icons/fa6';
import * as SiIcons from 'react-icons/si';
import * as BiIcons from 'react-icons/bi';
import * as AiIcons from 'react-icons/ai';
import * as HiIcons from 'react-icons/hi';
import * as Hi2Icons from 'react-icons/hi2';
import * as MdIcons from 'react-icons/md';
import * as IoIcons from 'react-icons/io5';
import * as TbIcons from 'react-icons/tb';
import * as RiIcons from 'react-icons/ri';
import * as VscIcons from 'react-icons/vsc';
import * as GrIcons from 'react-icons/gr';

interface IconPickerProps {
  open: boolean;
  onClose: () => void;
  onSelectIcon: (iconName: string) => void;
}

interface IconCategory {
  name: string;
  prefix: string;
  icons: Record<string, React.ComponentType<{ className?: string; size?: number }>>;
  color?: string;
}

const categories: IconCategory[] = [
  { name: 'Lucide', prefix: 'Lu', icons: LuIcons, color: '#f97316' },
  { name: 'Font Awesome', prefix: 'Fa', icons: FaIcons as any, color: '#3b82f6' },
  { name: 'Font Awesome 6', prefix: 'Fa6', icons: Fa6Icons as any, color: '#6366f1' },
  { name: 'Simple Icons', prefix: 'Si', icons: SiIcons as any, color: '#10b981' },
  { name: 'BoxIcons', prefix: 'Bi', icons: BiIcons as any, color: '#8b5cf6' },
  { name: 'Ant Design', prefix: 'Ai', icons: AiIcons as any, color: '#ef4444' },
  { name: 'Heroicons', prefix: 'Hi', icons: HiIcons as any, color: '#ec4899' },
  { name: 'Heroicons 2', prefix: 'Hi2', icons: Hi2Icons as any, color: '#f43f5e' },
  { name: 'Material Design', prefix: 'Md', icons: MdIcons as any, color: '#14b8a6' },
  { name: 'Ionicons', prefix: 'Io', icons: IoIcons as any, color: '#0ea5e9' },
  { name: 'Tabler', prefix: 'Tb', icons: TbIcons as any, color: '#f59e0b' },
  { name: 'Remix', prefix: 'Ri', icons: RiIcons as any, color: '#84cc16' },
  { name: 'VS Code', prefix: 'Vsc', icons: VscIcons as any, color: '#06b6d4' },
  { name: 'Grommet', prefix: 'Gr', icons: GrIcons as any, color: '#a855f7' },
];

// Get icon names from a category
function getIconNames(icons: Record<string, any>, prefix: string): string[] {
  return Object.keys(icons).filter(
    (key) => key.startsWith(prefix) && typeof icons[key] === 'function'
  );
}

// Convert icon name to readable format
function formatIconName(name: string, prefix: string): string {
  const withoutPrefix = name.replace(new RegExp(`^${prefix}`), '');
  return withoutPrefix
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .toLowerCase();
}

export default function IconPicker({ open, onClose, onSelectIcon }: IconPickerProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get all icons or filter by search
  const filteredIcons = useMemo(() => {
    const results: { category: IconCategory; iconName: string; Icon: React.ComponentType<any> }[] = [];
    const searchLower = search.toLowerCase();
    const maxPerCategory = search ? 50 : 20; // Show more when searching

    for (const category of categories) {
      if (selectedCategory && category.name !== selectedCategory) continue;

      const iconNames = getIconNames(category.icons, category.prefix);
      let count = 0;

      for (const iconName of iconNames) {
        if (count >= maxPerCategory) break;

        const formattedName = formatIconName(iconName, category.prefix);
        if (search && !formattedName.includes(searchLower) && !iconName.toLowerCase().includes(searchLower)) {
          continue;
        }

        const Icon = category.icons[iconName];
        if (typeof Icon === 'function') {
          results.push({ category, iconName, Icon });
          count++;
        }
      }
    }

    return results;
  }, [search, selectedCategory]);

  // Group by category for display
  const groupedIcons = useMemo(() => {
    const groups: Record<string, typeof filteredIcons> = {};
    for (const item of filteredIcons) {
      const catName = item.category.name;
      if (!groups[catName]) groups[catName] = [];
      groups[catName].push(item);
    }
    return groups;
  }, [filteredIcons]);

  const handleIconClick = useCallback(
    (iconName: string) => {
      // Pass icon name to parent, which will handle rendering
      onSelectIcon(iconName);
      onClose();
      setSearch('');
    },
    [onSelectIcon, onClose]
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="sr-only">Icon Picker</DialogTitle>
          <div className="relative">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Category sidebar */}
          <div className="w-48 border-r border-border p-2 overflow-y-auto">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                !selectedCategory
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground'
              )}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2',
                  selectedCategory === cat.name
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground'
                )}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                {cat.name}
              </button>
            ))}
          </div>

          {/* Icons grid */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {Object.entries(groupedIcons).map(([categoryName, icons]) => (
                <div key={categoryName}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: categories.find((c) => c.name === categoryName)?.color,
                      }}
                    />
                    {categoryName}
                  </h3>
                  <div className="grid grid-cols-6 gap-2">
                    {icons.map(({ iconName, Icon, category }) => (
                      <button
                        key={iconName}
                        onClick={() => handleIconClick(iconName)}
                        className="group flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted transition-colors"
                        title={iconName}
                      >
                        <div className="w-10 h-10 flex items-center justify-center rounded-md border border-border group-hover:border-primary group-hover:bg-primary/5 transition-colors">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                          {formatIconName(iconName, category.prefix)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {filteredIcons.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <LuSearch className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-sm">No icons found for "{search}"</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>↑↓ to navigate</span>
          <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">enter</kbd> to insert</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
