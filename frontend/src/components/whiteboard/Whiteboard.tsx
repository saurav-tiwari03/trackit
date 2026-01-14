'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { LuLocate, LuTriangleAlert, LuX, LuDownload, LuChevronLeft, LuChevronRight, LuImage, LuVideo, LuFileText } from 'react-icons/lu';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PreviewAttachment {
  type: 'image' | 'video' | 'pdf';
  url: string;
  name: string;
}

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
  
  // Preview modal state
  const [previewAttachment, setPreviewAttachment] = useState<PreviewAttachment | null>(null);
  const [pdfNumPages, setPdfNumPages] = useState(0);
  const [pdfCurrentPage, setPdfCurrentPage] = useState(1);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const [pdfPageWidth, setPdfPageWidth] = useState(600);

  const handleViewChange = useCallback((panOffset: Point, scale: number, contentVisible: boolean) => {
    setIsContentVisible(contentVisible);
  }, []);

  // PDF container width observer
  useEffect(() => {
    if (!pdfContainerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width - 32; // Account for padding
        if (width > 0) {
          setPdfPageWidth(Math.min(width, 800));
        }
      }
    });
    resizeObserver.observe(pdfContainerRef.current);
    return () => resizeObserver.disconnect();
  }, [previewAttachment]);

  // Determine file type from data URL or file extension
  const getFileType = useCallback((dataUrl: string): 'image' | 'video' | 'pdf' => {
    if (dataUrl.startsWith('data:video/')) return 'video';
    if (dataUrl.startsWith('data:application/pdf')) return 'pdf';
    return 'image';
  }, []);

  // Handle double-click on element to preview
  const handleElementDoubleClick = useCallback((element: WhiteboardElement) => {
    if (element.type === 'image' && element.imageData) {
      const fileType = getFileType(element.imageData);
      setPreviewAttachment({
        type: fileType,
        url: element.imageData,
        name: `${element.type}-${element.id}`,
      });
      setPdfCurrentPage(1);
      setPdfNumPages(0);
    }
  }, [getFileType]);

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
      
      // Determine file type
      const isVideo = file.type.startsWith('video/');
      const isPdf = file.type === 'application/pdf';
      const isImage = file.type.startsWith('image/');
      
      if (isImage) {
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
      } else if (isVideo || isPdf) {
        // For video and PDF, create a placeholder element
        const canvas = document.querySelector('canvas');
        const canvasWidth = canvas?.offsetWidth || 800;
        const canvasHeight = canvas?.offsetHeight || 600;
        
        const width = 300;
        const height = isVideo ? 200 : 400;
        const x = (canvasWidth - width) / 2;
        const y = (canvasHeight - height) / 2;

        const newElement: WhiteboardElement = {
          id: `${isVideo ? 'video' : 'pdf'}-${Date.now()}`,
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
      }
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
        onElementDoubleClick={handleElementDoubleClick}
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

      {/* Hidden file input for image/video/pdf import */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,application/pdf"
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

      {/* Preview Modal for Images, Videos, and PDFs */}
      <Dialog 
        open={!!previewAttachment} 
        onOpenChange={(open) => {
          if (!open) {
            setPreviewAttachment(null);
            setPdfNumPages(0);
            setPdfCurrentPage(1);
          }
        }}
      >
        <DialogContent className="max-w-4xl w-[90vw] h-[80vh] p-0 overflow-hidden bg-black/95 border-none focus:outline-none">
          <DialogHeader className="sr-only">
            <DialogTitle>{previewAttachment?.name || 'Attachment preview'}</DialogTitle>
          </DialogHeader>
          <div className={`relative w-full h-full ${previewAttachment?.type === 'pdf' ? 'block' : 'flex items-center justify-center'}`}>
            {/* Close button */}
            <button
              onClick={() => setPreviewAttachment(null)}
              className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm transition-colors"
            >
              <LuX className="h-6 w-6" />
            </button>

            {/* Download button */}
            <a
              href={previewAttachment?.url}
              download={previewAttachment?.name}
              className="absolute top-4 right-16 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm transition-colors"
            >
              <LuDownload className="h-6 w-6" />
            </a>

            {/* Type indicator */}
            <div className="absolute top-4 left-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 text-white backdrop-blur-sm">
              {previewAttachment?.type === 'image' && <LuImage className="h-4 w-4" />}
              {previewAttachment?.type === 'video' && <LuVideo className="h-4 w-4" />}
              {previewAttachment?.type === 'pdf' && <LuFileText className="h-4 w-4" />}
              <span className="text-sm font-medium capitalize">{previewAttachment?.type}</span>
            </div>

            {/* Image Preview */}
            {previewAttachment?.type === 'image' && (
              <img
                src={previewAttachment.url}
                alt={previewAttachment.name}
                className="max-w-full max-h-full object-contain"
              />
            )}

            {/* Video Preview */}
            {previewAttachment?.type === 'video' && (
              <video
                src={previewAttachment.url}
                controls
                className="max-w-full max-h-full"
                autoPlay
              />
            )}

            {/* PDF Preview */}
            {previewAttachment?.type === 'pdf' && (
              <>
                <div className="w-full h-full overflow-y-auto bg-neutral-900/50 p-4 pt-16">
                  <div ref={pdfContainerRef} className="max-w-3xl mx-auto min-h-full flex flex-col items-center">
                    <Document
                      file={previewAttachment.url}
                      onLoadSuccess={(info) => {
                        setPdfNumPages(info.numPages);
                        setPdfCurrentPage((p) => Math.min(Math.max(1, p), info.numPages));
                      }}
                      onLoadError={(error) => console.error('PDF Load Error:', error)}
                      loading={<div className="h-[50vh] flex items-center justify-center text-white">Loading PDF…</div>}
                      error={<div className="h-[50vh] flex items-center justify-center text-red-400">Failed to load PDF</div>}
                    >
                      {pdfNumPages > 0 && pdfPageWidth > 0 && (
                        <Page
                          pageNumber={pdfCurrentPage}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          className="shadow-lg mx-auto mb-24"
                          width={pdfPageWidth}
                          loading={
                            <div
                              className="bg-white shadow-lg mx-auto mb-24 animate-pulse"
                              style={{ width: pdfPageWidth, height: pdfPageWidth * 1.414 }}
                            />
                          }
                        />
                      )}
                    </Document>
                  </div>
                </div>

                {/* PDF Page Navigation */}
                {pdfNumPages > 0 && (
                  <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-full px-6 py-2 shadow-2xl border border-border/20 flex items-center gap-6 z-50">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPdfCurrentPage((p) => Math.max(1, p - 1));
                      }}
                      disabled={pdfCurrentPage <= 1}
                      className="p-1 hover:bg-black/5 rounded-full disabled:opacity-30 transition-colors"
                    >
                      <LuChevronLeft className="h-5 w-5 text-black" />
                    </button>
                    <span className="text-sm font-semibold text-black min-w-12 text-center select-none">
                      {pdfCurrentPage} of {pdfNumPages}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPdfCurrentPage((p) => Math.min(pdfNumPages, p + 1));
                      }}
                      disabled={pdfCurrentPage >= pdfNumPages}
                      className="p-1 hover:bg-black/5 rounded-full disabled:opacity-30 transition-colors"
                    >
                      <LuChevronRight className="h-5 w-5 text-black" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Re-export types for external use
export type { WhiteboardElement, Tool };
