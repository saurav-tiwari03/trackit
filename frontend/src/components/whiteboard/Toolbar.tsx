'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  LuMousePointer2,
  LuHand,
  LuSquare,
  LuCircle,
  LuDiamond,
  LuMinus,
  LuArrowRight,
  LuPencil,
  LuType,
  LuEraser,
  LuUndo2,
  LuRedo2,
  LuTrash2,
  LuDownload,
  LuPalette,
  LuImage,
  LuShapes,
  LuGripVertical,
  LuPanelLeftClose,
  LuPanelLeftOpen,
  LuPenTool,
} from 'react-icons/lu';
import { cn } from '@/lib/utils';
import type { Tool } from './Canvas';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

interface ToolbarProps {
  tool: Tool;
  setTool: (tool: Tool) => void;
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  fillColor: string;
  setFillColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  roughness: number;
  setRoughness: (roughness: number) => void;
  opacity: number;
  setOpacity: (opacity: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExport: () => void;
  onImageImport: () => void;
  onIconPicker: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const tools: { id: Tool; icon: React.ComponentType<{ className?: string }>; label: string; shortcut?: string }[] = [
  { id: 'select', icon: LuMousePointer2, label: 'Select', shortcut: '1' },
  { id: 'hand', icon: LuHand, label: 'Pan', shortcut: 'H' },
  { id: 'rectangle', icon: LuSquare, label: 'Rectangle', shortcut: '2' },
  { id: 'ellipse', icon: LuCircle, label: 'Ellipse', shortcut: '3' },
  { id: 'diamond', icon: LuDiamond, label: 'Diamond', shortcut: '4' },
  { id: 'line', icon: LuMinus, label: 'Line', shortcut: '5' },
  { id: 'arrow', icon: LuArrowRight, label: 'Arrow', shortcut: '6' },
  { id: 'pencil', icon: LuPencil, label: 'Pencil', shortcut: '7' },
  { id: 'text', icon: LuType, label: 'Text', shortcut: '8' },
  { id: 'eraser', icon: LuEraser, label: 'Eraser', shortcut: '0' },
];

const colors = [
  '#1e1e1e', // Black
  '#e03131', // Red
  '#2f9e44', // Green
  '#1971c2', // Blue
  '#f08c00', // Orange
  '#9c36b5', // Purple
  '#0ca678', // Teal
  '#f783ac', // Pink
  '#ffffff', // White
];

export default function Toolbar({
  tool,
  setTool,
  strokeColor,
  setStrokeColor,
  fillColor,
  setFillColor,
  strokeWidth,
  setStrokeWidth,
  roughness,
  setRoughness,
  opacity,
  setOpacity,
  onUndo,
  onRedo,
  onClear,
  onExport,
  onImageImport,
  onIconPicker,
  canUndo,
  canRedo,
}: ToolbarProps) {
  const [showStrokeColors, setShowStrokeColors] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('top');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Load saved position and collapsed state from localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem('whiteboard-toolbar-position');
    if (savedPosition && ['top', 'bottom', 'left', 'right'].includes(savedPosition)) {
      setPosition(savedPosition as typeof position);
    }
    const savedCollapsed = localStorage.getItem('whiteboard-toolbar-collapsed');
    if (savedCollapsed === 'true') {
      setIsCollapsed(true);
    }
  }, []);

  // Save position to localStorage
  useEffect(() => {
    localStorage.setItem('whiteboard-toolbar-position', position);
  }, [position]);

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('whiteboard-toolbar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const rect = toolbarRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left - rect.width / 2,
        y: e.clientY - rect.top - rect.height / 2,
      });
    }
  }, []);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const container = toolbarRef.current?.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top;
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;

    // Determine which edge is closest
    const distTop = y;
    const distBottom = containerRect.height - y;
    const distLeft = x;
    const distRight = containerRect.width - x;

    const minDist = Math.min(distTop, distBottom, distLeft, distRight);

    if (minDist === distTop) {
      setPosition('top');
    } else if (minDist === distBottom) {
      setPosition('bottom');
    } else if (minDist === distLeft) {
      setPosition('left');
    } else {
      setPosition('right');
    }
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  const isVertical = position === 'left' || position === 'right';

  const positionClasses = {
    top: 'top-4 left-1/2 -translate-x-1/2',
    bottom: 'bottom-4 left-1/2 -translate-x-1/2',
    left: 'left-4 top-1/2 -translate-y-1/2',
    right: 'right-4 top-1/2 -translate-y-1/2',
  };

  // Collapsed state - show just a floating button
  if (isCollapsed) {
    return (
      <div 
        className={cn(
          'absolute z-50 transition-all duration-200',
          positionClasses[position]
        )}
      >
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2 px-3 py-2 bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-lg hover:bg-muted transition-colors"
          title="Expand toolbar"
        >
          <LuPenTool className="w-5 h-5" />
          <span className="text-sm font-medium">Tools</span>
          <LuPanelLeftOpen className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={toolbarRef}
      className={cn(
        'absolute z-50 transition-all duration-200',
        positionClasses[position],
        isDragging && 'opacity-80 scale-95'
      )}
    >
      <div className={cn(
        'flex gap-1 bg-card/95 backdrop-blur-sm border border-border rounded-xl p-2 shadow-lg',
        isVertical ? 'flex-col items-center' : 'flex-row items-center'
      )}>
        {/* Drag Handle */}
        <div
          onMouseDown={handleDragStart}
          className={cn(
            'flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors',
            isVertical ? 'w-full py-1 border-b border-border mb-1' : 'h-full px-1 border-r border-border mr-1'
          )}
          title="Drag to reposition toolbar"
        >
          <LuGripVertical className={cn('w-4 h-4', isVertical && 'rotate-90')} />
        </div>
        {/* Drawing Tools */}
        <div className={cn(
          'flex gap-0.5',
          isVertical 
            ? 'flex-col items-center border-b border-border pb-2 mb-1' 
            : 'flex-row items-center border-r border-border pr-2 mr-1'
        )}>
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                className={cn(
                  'p-2 rounded-lg transition-all duration-150',
                  'hover:bg-muted',
                  tool === t.id && 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
                title={`${t.label} (${t.shortcut})`}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })}
        </div>

        {/* Color & Style Options */}
        <div className={cn(
          'flex gap-1',
          isVertical 
            ? 'flex-col items-center border-b border-border pb-2 mb-1' 
            : 'flex-row items-center border-r border-border pr-2 mr-1'
        )}>
          {/* Stroke Color */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                title="Stroke Color"
              >
                <div 
                  className="w-5 h-5 rounded-md border-2 border-border"
                  style={{ backgroundColor: strokeColor }}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="center">
              <div className="space-y-3">
                <p className="text-sm font-medium">Stroke Color</p>
                <div className="grid grid-cols-5 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setStrokeColor(color)}
                      className={cn(
                        'w-7 h-7 rounded-md border-2 transition-all',
                        strokeColor === color 
                          ? 'border-primary ring-2 ring-primary ring-offset-2' 
                          : 'border-border hover:scale-110'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Fill Color */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                title="Fill Color"
              >
                <div 
                  className="w-5 h-5 rounded-md border-2 border-border relative overflow-hidden"
                  style={{ backgroundColor: fillColor === 'transparent' ? 'transparent' : fillColor }}
                >
                  {fillColor === 'transparent' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-0.5 bg-red-500 rotate-45 transform origin-center" />
                    </div>
                  )}
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="center">
              <div className="space-y-3">
                <p className="text-sm font-medium">Fill Color</p>
                <div className="grid grid-cols-5 gap-2">
                  <button
                    onClick={() => setFillColor('transparent')}
                    className={cn(
                      'w-7 h-7 rounded-md border-2 transition-all relative overflow-hidden',
                      fillColor === 'transparent' 
                        ? 'border-primary ring-2 ring-primary ring-offset-2' 
                        : 'border-border hover:scale-110'
                    )}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-0.5 bg-red-500 rotate-45 transform origin-center" />
                    </div>
                  </button>
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setFillColor(color)}
                      className={cn(
                        'w-7 h-7 rounded-md border-2 transition-all',
                        fillColor === color 
                          ? 'border-primary ring-2 ring-primary ring-offset-2' 
                          : 'border-border hover:scale-110'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Style Options */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                title="Style Options"
              >
                <LuPalette className="w-5 h-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4" align="center">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Stroke Width</span>
                    <span className="text-sm text-muted-foreground">{strokeWidth}px</span>
                  </div>
                  <Slider
                    value={[strokeWidth]}
                    onValueChange={([v]) => setStrokeWidth(v)}
                    min={1}
                    max={20}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Roughness</span>
                    <span className="text-sm text-muted-foreground">{roughness}</span>
                  </div>
                  <Slider
                    value={[roughness]}
                    onValueChange={([v]) => setRoughness(v)}
                    min={0}
                    max={3}
                    step={0.5}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Opacity</span>
                    <span className="text-sm text-muted-foreground">{opacity}%</span>
                  </div>
                  <Slider
                    value={[opacity]}
                    onValueChange={([v]) => setOpacity(v)}
                    min={10}
                    max={100}
                    step={10}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Actions */}
        <div className={cn(
          'flex gap-0.5',
          isVertical ? 'flex-col items-center' : 'flex-row items-center'
        )}>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={cn(
              'p-2 rounded-lg transition-colors',
              canUndo ? 'hover:bg-muted' : 'opacity-40 cursor-not-allowed'
            )}
            title="Undo (Ctrl+Z)"
          >
            <LuUndo2 className="w-5 h-5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={cn(
              'p-2 rounded-lg transition-colors',
              canRedo ? 'hover:bg-muted' : 'opacity-40 cursor-not-allowed'
            )}
            title="Redo (Ctrl+Y)"
          >
            <LuRedo2 className="w-5 h-5" />
          </button>
          <button
            onClick={onIconPicker}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="Insert Icon (Shift+I)"
          >
            <LuShapes className="w-5 h-5" />
          </button>
          <button
            onClick={onImageImport}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="Import Image (I)"
          >
            <LuImage className="w-5 h-5" />
          </button>
          <button
            onClick={onClear}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-destructive"
            title="Clear Canvas"
          >
            <LuTrash2 className="w-5 h-5" />
          </button>
          <button
            onClick={onExport}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="Export as Image"
          >
            <LuDownload className="w-5 h-5" />
          </button>
        </div>

        {/* Collapse Button */}
        <div className={cn(
          'flex items-center justify-center',
          isVertical 
            ? 'w-full pt-1 border-t border-border mt-1' 
            : 'h-full pl-1 border-l border-border ml-1'
        )}>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Collapse toolbar"
          >
            <LuPanelLeftClose className={cn('w-4 h-4', isVertical && 'rotate-90')} />
          </button>
        </div>
      </div>
    </div>
  );
}
