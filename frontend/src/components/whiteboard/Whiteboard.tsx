'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { LuLocate, LuTriangleAlert } from 'react-icons/lu';
import Canvas, { type Tool, type WhiteboardElement, type Point } from './Canvas';
import Toolbar from './Toolbar';
import IconPicker from './IconPicker';
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

interface WhiteboardProps {
  initialElements?: WhiteboardElement[];
  onChange?: (elements: WhiteboardElement[]) => void;
  onSave?: () => void;
}

export default function Whiteboard({
  initialElements = [],
  onChange,
  onSave,
}: WhiteboardProps) {
  const { resolvedTheme } = useTheme();
  const [elements, setElements] = useState<WhiteboardElement[]>(initialElements);
  const [tool, setTool] = useState<Tool>('pencil');
  const [strokeColor, setStrokeColor] = useState('#1e1e1e');
  const [fillColor, setFillColor] = useState('transparent');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [roughness, setRoughness] = useState(1);
  const [opacity, setOpacity] = useState(100);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // History for undo/redo
  const [history, setHistory] = useState<WhiteboardElement[][]>([initialElements]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Track if content is visible in viewport
  const [isContentVisible, setIsContentVisible] = useState(true);

  const handleViewChange = useCallback((panOffset: Point, scale: number, contentVisible: boolean) => {
    setIsContentVisible(contentVisible);
  }, []);

  const handleBackToContent = useCallback(() => {
    const canvas = (window as any).__whiteboardCanvas;
    if (canvas?.centerOnContent) {
      canvas.centerOnContent();
    }
  }, []);

  // Update colors based on theme
  useEffect(() => {
    if (resolvedTheme === 'dark') {
      setStrokeColor('#ffffff');
    } else {
      setStrokeColor('#1e1e1e');
    }
  }, [resolvedTheme]);

  // Initialize elements from props
  useEffect(() => {
    if (initialElements.length > 0) {
      setElements(initialElements);
      setHistory([initialElements]);
      setHistoryIndex(0);
    }
  }, [initialElements]);

  const handleElementsChange = useCallback((newElements: WhiteboardElement[]) => {
    // Add to history
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, newElements];
    });
    setHistoryIndex((prev) => prev + 1);
    
    onChange?.(newElements);
  }, [historyIndex, onChange]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setElements(history[newIndex]);
      onChange?.(history[newIndex]);
    }
  }, [historyIndex, history, onChange]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setElements(history[newIndex]);
      onChange?.(history[newIndex]);
    }
  }, [historyIndex, history, onChange]);

  const handleClear = useCallback(() => {
    if (elements.length === 0) return;
    setClearDialogOpen(true);
  }, [elements.length]);

  const confirmClear = useCallback(() => {
    setElements([]);
    handleElementsChange([]);
    setClearDialogOpen(false);
  }, [handleElementsChange]);

  const handleExport = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  const handleImageImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        // Create image element at center of canvas
        const canvas = document.querySelector('canvas');
        const canvasWidth = canvas?.offsetWidth || 800;
        const canvasHeight = canvas?.offsetHeight || 600;

        // Scale image to fit nicely
        const maxSize = 400;
        let width = img.width;
        let height = img.height;
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width *= ratio;
          height *= ratio;
        }

        const x = (canvasWidth - width) / 2;
        const y = (canvasHeight - height) / 2;

        const newElement: WhiteboardElement = {
          id: `image-${Date.now()}`,
          type: 'image',
          x1: x,
          y1: y,
          x2: x + width,
          y2: y + height,
          strokeColor: 'transparent',
          fillColor: 'transparent',
          strokeWidth: 0,
          roughness: 0,
          opacity: 100,
          imageData: dataUrl,
        };

        const newElements = [...elements, newElement];
        setElements(newElements);
        handleElementsChange(newElements);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    
    // Reset input so same file can be selected again
    event.target.value = '';
  }, [elements, handleElementsChange]);

  const handleIconSelect = useCallback(async (iconName: string) => {
    // Dynamically import the icon and render it
    const iconPrefix = iconName.substring(0, 2).toLowerCase();
    let iconModule: Record<string, any> | null = null;
    
    // Map prefix to icon library
    const prefixMap: Record<string, () => Promise<any>> = {
      'lu': () => import('react-icons/lu'),
      'fa': () => import('react-icons/fa'),
      'si': () => import('react-icons/si'),
      'bi': () => import('react-icons/bi'),
      'ai': () => import('react-icons/ai'),
      'hi': () => import('react-icons/hi'),
      'md': () => import('react-icons/md'),
      'io': () => import('react-icons/io5'),
      'tb': () => import('react-icons/tb'),
      'ri': () => import('react-icons/ri'),
      'vs': () => import('react-icons/vsc'),
      'gr': () => import('react-icons/gr'),
    };

    try {
      const importFn = prefixMap[iconPrefix];
      if (importFn) {
        iconModule = await importFn();
      }
    } catch (e) {
      console.error('Failed to import icon module:', e);
      return;
    }

    if (!iconModule || !iconModule[iconName]) {
      console.error('Icon not found:', iconName);
      return;
    }

    const Icon = iconModule[iconName];

    // Create a temporary container to render the icon
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);

    // Render the icon using ReactDOM
    const { createRoot } = await import('react-dom/client');
    const root = createRoot(tempDiv);
    
    await new Promise<void>((resolve) => {
      root.render(<Icon size={64} color={strokeColor} />);
      setTimeout(resolve, 50);
    });

    const svg = tempDiv.querySelector('svg');
    if (svg) {
      svg.setAttribute('width', '64');
      svg.setAttribute('height', '64');
      const svgString = svg.outerHTML;
      
      // Convert SVG to data URL
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        const size = 64;
        tempCanvas.width = size;
        tempCanvas.height = size;
        const ctx = tempCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, size, size);
          const dataUrl = tempCanvas.toDataURL('image/png');

          const canvas = document.querySelector('canvas');
          const canvasWidth = canvas?.offsetWidth || 800;
          const canvasHeight = canvas?.offsetHeight || 600;
          const x = (canvasWidth - size) / 2;
          const y = (canvasHeight - size) / 2;

          const newElement: WhiteboardElement = {
            id: `icon-${Date.now()}`,
            type: 'image',
            x1: x,
            y1: y,
            x2: x + size,
            y2: y + size,
            strokeColor: 'transparent',
            fillColor: 'transparent',
            strokeWidth: 0,
            roughness: 0,
            opacity: 100,
            imageData: dataUrl,
          };

          const newElements = [...elements, newElement];
          setElements(newElements);
          handleElementsChange(newElements);
        }
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }

    root.unmount();
    document.body.removeChild(tempDiv);
  }, [elements, handleElementsChange, strokeColor]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Tool shortcuts
      if (!event.ctrlKey && !event.metaKey) {
        switch (event.key) {
          case '1':
            setTool('select');
            break;
          case 'h':
          case 'H':
            setTool('hand');
            break;
          case '2':
            setTool('rectangle');
            break;
          case '3':
            setTool('ellipse');
            break;
          case '4':
            setTool('diamond');
            break;
          case '5':
            setTool('line');
            break;
          case '6':
            setTool('arrow');
            break;
          case '7':
            setTool('pencil');
            break;
          case '8':
            setTool('text');
            break;
          case '0':
            setTool('eraser');
            break;
          case 'i':
            if (event.shiftKey) {
              setIconPickerOpen(true);
            } else {
              handleImageImport();
            }
            break;
          case 'I':
            if (event.shiftKey) {
              setIconPickerOpen(true);
            } else {
              handleImageImport();
            }
            break;
        }
      }

      // Ctrl shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'z':
            event.preventDefault();
            if (event.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
            break;
          case 'y':
            event.preventDefault();
            handleRedo();
            break;
          case 's':
            event.preventDefault();
            onSave?.();
            break;
        }
      }

      // Delete selected elements
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const hasSelected = elements.some((el) => el.isSelected);
        if (hasSelected) {
          const newElements = elements.filter((el) => !el.isSelected);
          setElements(newElements);
          handleElementsChange(newElements);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [elements, handleUndo, handleRedo, handleElementsChange, onSave]);

  return (
    <div 
      className="relative w-full h-full overflow-hidden"
      style={{ 
        backgroundColor: resolvedTheme === 'dark' ? '#1a1a2e' : '#fafafa',
      }}
    >
      {/* Toolbar */}
      <Toolbar
        tool={tool}
        setTool={setTool}
        strokeColor={strokeColor}
        setStrokeColor={setStrokeColor}
        fillColor={fillColor}
        setFillColor={setFillColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        roughness={roughness}
        setRoughness={setRoughness}
        opacity={opacity}
        setOpacity={setOpacity}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onExport={handleExport}
        onImageImport={handleImageImport}
        onIconPicker={() => setIconPickerOpen(true)}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
      />

      {/* Canvas */}
      <Canvas
        elements={elements}
        setElements={setElements}
        tool={tool}
        strokeColor={strokeColor}
        fillColor={fillColor}
        strokeWidth={strokeWidth}
        roughness={roughness}
        opacity={opacity}
        onElementsChange={handleElementsChange}
        onViewChange={handleViewChange}
      />

      {/* Back to Content button - shows when content is off-screen */}
      {!isContentVisible && elements.length > 0 && (
        <button
          onClick={handleBackToContent}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all duration-200 animate-in fade-in slide-in-from-bottom-4"
        >
          <LuLocate className="w-4 h-4" />
          <span className="font-medium">Back to content</span>
        </button>
      )}

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 bg-card/80 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 text-sm text-muted-foreground">
        Use scroll to zoom • Drag with Hand tool to pan
      </div>

      {/* Hidden file input for image import */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Icon Picker Modal */}
      <IconPicker
        open={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        onSelectIcon={handleIconSelect}
      />

      {/* Clear Canvas Confirmation Dialog */}
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LuTriangleAlert className="w-5 h-5 text-destructive" />
              Clear Canvas
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear the canvas? This action cannot be undone and all your drawings will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClear}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear Canvas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Re-export types for external use
export type { WhiteboardElement, Tool };
