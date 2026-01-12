'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import rough from 'roughjs';
import type { RoughCanvas } from 'roughjs/bin/canvas';

export type Tool = 
  | 'select' 
  | 'hand' 
  | 'rectangle' 
  | 'ellipse' 
  | 'diamond'
  | 'line' 
  | 'arrow' 
  | 'pencil' 
  | 'text'
  | 'eraser'
  | 'image';

export interface Point {
  x: number;
  y: number;
}

export interface WhiteboardElement {
  id: string;
  type: 'rectangle' | 'ellipse' | 'diamond' | 'line' | 'arrow' | 'pencil' | 'text' | 'image';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  points?: Point[]; // For pencil/freehand
  text?: string; // For text elements
  imageData?: string; // For image elements (base64 data URL)
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  roughness: number;
  opacity: number;
  isSelected?: boolean;
}

interface CanvasProps {
  elements: WhiteboardElement[];
  setElements: React.Dispatch<React.SetStateAction<WhiteboardElement[]>>;
  tool: Tool;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  roughness: number;
  opacity: number;
  onElementsChange?: (elements: WhiteboardElement[]) => void;
  onViewChange?: (panOffset: Point, scale: number, isContentVisible: boolean) => void;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function createElement(
  id: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  type: WhiteboardElement['type'],
  options: Partial<WhiteboardElement> = {}
): WhiteboardElement {
  return {
    id,
    type,
    x1,
    y1,
    x2,
    y2,
    strokeColor: options.strokeColor || '#1e1e1e',
    fillColor: options.fillColor || 'transparent',
    strokeWidth: options.strokeWidth || 2,
    roughness: options.roughness || 1,
    opacity: options.opacity || 100,
    points: options.points,
    text: options.text,
  };
}

function drawElement(
  roughCanvas: RoughCanvas,
  context: CanvasRenderingContext2D,
  element: WhiteboardElement
) {
  context.globalAlpha = element.opacity / 100;

  const options = {
    stroke: element.strokeColor,
    fill: element.fillColor === 'transparent' ? undefined : element.fillColor,
    strokeWidth: element.strokeWidth,
    roughness: element.roughness,
    seed: parseInt(element.id.slice(0, 8), 36), // Consistent randomness
  };

  switch (element.type) {
    case 'rectangle': {
      const width = element.x2 - element.x1;
      const height = element.y2 - element.y1;
      roughCanvas.rectangle(element.x1, element.y1, width, height, options);
      break;
    }
    case 'ellipse': {
      const centerX = (element.x1 + element.x2) / 2;
      const centerY = (element.y1 + element.y2) / 2;
      const width = Math.abs(element.x2 - element.x1);
      const height = Math.abs(element.y2 - element.y1);
      roughCanvas.ellipse(centerX, centerY, width, height, options);
      break;
    }
    case 'diamond': {
      const centerX = (element.x1 + element.x2) / 2;
      const centerY = (element.y1 + element.y2) / 2;
      const halfWidth = Math.abs(element.x2 - element.x1) / 2;
      const halfHeight = Math.abs(element.y2 - element.y1) / 2;
      const points: [number, number][] = [
        [centerX, centerY - halfHeight],
        [centerX + halfWidth, centerY],
        [centerX, centerY + halfHeight],
        [centerX - halfWidth, centerY],
      ];
      roughCanvas.polygon(points, options);
      break;
    }
    case 'line': {
      roughCanvas.line(element.x1, element.y1, element.x2, element.y2, options);
      break;
    }
    case 'arrow': {
      roughCanvas.line(element.x1, element.y1, element.x2, element.y2, options);
      // Draw arrowhead
      const angle = Math.atan2(element.y2 - element.y1, element.x2 - element.x1);
      const headLength = 15;
      const headAngle = Math.PI / 6;
      roughCanvas.line(
        element.x2,
        element.y2,
        element.x2 - headLength * Math.cos(angle - headAngle),
        element.y2 - headLength * Math.sin(angle - headAngle),
        options
      );
      roughCanvas.line(
        element.x2,
        element.y2,
        element.x2 - headLength * Math.cos(angle + headAngle),
        element.y2 - headLength * Math.sin(angle + headAngle),
        options
      );
      break;
    }
    case 'pencil': {
      if (element.points && element.points.length > 1) {
        context.beginPath();
        context.strokeStyle = element.strokeColor;
        context.lineWidth = element.strokeWidth;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.moveTo(element.points[0].x, element.points[0].y);
        for (let i = 1; i < element.points.length; i++) {
          context.lineTo(element.points[i].x, element.points[i].y);
        }
        context.stroke();
      }
      break;
    }
    case 'text': {
      if (element.text) {
        context.font = `${element.strokeWidth * 10}px "Virgil", cursive, sans-serif`;
        context.fillStyle = element.strokeColor;
        context.fillText(element.text, element.x1, element.y1);
      }
      break;
    }
    case 'image': {
      // Images are handled separately with async loading
      break;
    }
  }

  // Draw selection box
  if (element.isSelected) {
    context.globalAlpha = 1;
    context.strokeStyle = '#6366f1';
    context.lineWidth = 2;
    context.setLineDash([5, 5]);
    const padding = 5;
    const minX = Math.min(element.x1, element.x2) - padding;
    const minY = Math.min(element.y1, element.y2) - padding;
    const width = Math.abs(element.x2 - element.x1) + padding * 2;
    const height = Math.abs(element.y2 - element.y1) + padding * 2;
    context.strokeRect(minX, minY, width, height);
    context.setLineDash([]);
  }

  context.globalAlpha = 1;
}

function isPointInElement(x: number, y: number, element: WhiteboardElement): boolean {
  const minX = Math.min(element.x1, element.x2);
  const maxX = Math.max(element.x1, element.x2);
  const minY = Math.min(element.y1, element.y2);
  const maxY = Math.max(element.y1, element.y2);
  
  return x >= minX && x <= maxX && y >= minY && y <= maxY;
}

// Get bounding box of all elements
function getContentBounds(elements: WhiteboardElement[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (elements.length === 0) return null;
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  elements.forEach((el) => {
    minX = Math.min(minX, Math.min(el.x1, el.x2));
    minY = Math.min(minY, Math.min(el.y1, el.y2));
    maxX = Math.max(maxX, Math.max(el.x1, el.x2));
    maxY = Math.max(maxY, Math.max(el.y1, el.y2));
  });
  
  return { minX, minY, maxX, maxY };
}

export interface CanvasRef {
  resetView: () => void;
  centerOnContent: () => void;
}

export default function Canvas({
  elements,
  setElements,
  tool,
  strokeColor,
  fillColor,
  strokeWidth,
  roughness,
  opacity,
  onElementsChange,
  onViewChange,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [draggedElementId, setDraggedElementId] = useState<string | null>(null);
  const [isErasing, setIsErasing] = useState(false);
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });
  const [startPanPoint, setStartPanPoint] = useState<Point | null>(null);
  const [scale, setScale] = useState(1);
  const [currentElement, setCurrentElement] = useState<WhiteboardElement | null>(null);

  // Check if content is visible in viewport
  const checkContentVisibility = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || elements.length === 0) return true;

    const bounds = getContentBounds(elements);
    if (!bounds) return true;

    const canvasWidth = canvas.offsetWidth;
    const canvasHeight = canvas.offsetHeight;

    // Transform content bounds to screen coordinates
    const screenMinX = bounds.minX * scale + panOffset.x;
    const screenMinY = bounds.minY * scale + panOffset.y;
    const screenMaxX = bounds.maxX * scale + panOffset.x;
    const screenMaxY = bounds.maxY * scale + panOffset.y;

    // Check if any part of content is visible
    const isVisible = !(
      screenMaxX < -50 ||
      screenMinX > canvasWidth + 50 ||
      screenMaxY < -50 ||
      screenMinY > canvasHeight + 50
    );

    return isVisible;
  }, [elements, panOffset, scale]);

  // Notify parent of view changes
  useEffect(() => {
    const isContentVisible = checkContentVisibility();
    onViewChange?.(panOffset, scale, isContentVisible);
  }, [panOffset, scale, checkContentVisibility, onViewChange]);

  // Center view on content
  const centerOnContent = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || elements.length === 0) {
      setPanOffset({ x: 0, y: 0 });
      setScale(1);
      return;
    }

    const bounds = getContentBounds(elements);
    if (!bounds) return;

    const canvasWidth = canvas.offsetWidth;
    const canvasHeight = canvas.offsetHeight;
    
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;
    const contentCenterX = bounds.minX + contentWidth / 2;
    const contentCenterY = bounds.minY + contentHeight / 2;

    // Calculate scale to fit content with padding
    const padding = 100;
    const scaleX = (canvasWidth - padding * 2) / contentWidth;
    const scaleY = (canvasHeight - padding * 2) / contentHeight;
    const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.1), 2);

    // Calculate pan to center content
    const newPanX = canvasWidth / 2 - contentCenterX * newScale;
    const newPanY = canvasHeight / 2 - contentCenterY * newScale;

    setScale(newScale);
    setPanOffset({ x: newPanX, y: newPanY });
  }, [elements]);

  // Expose methods via window for parent access
  useEffect(() => {
    (window as any).__whiteboardCanvas = {
      centerOnContent,
      resetView: () => {
        setPanOffset({ x: 0, y: 0 });
        setScale(1);
      },
    };
    return () => {
      delete (window as any).__whiteboardCanvas;
    };
  }, [centerOnContent]);

  // Load and cache image
  const loadImage = useCallback((imageData: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const cached = imageCache.current.get(imageData);
      if (cached) {
        resolve(cached);
        return;
      }

      const img = new Image();
      img.onload = () => {
        imageCache.current.set(imageData, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = imageData;
    });
  }, []);

  // Redraw canvas when elements change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const draw = async () => {
      // Clear and apply transforms
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.save();
      context.translate(panOffset.x, panOffset.y);
      context.scale(scale, scale);

      // Create rough canvas
      const roughCanvas = rough.canvas(canvas);

      // Draw all elements
      for (const element of elements) {
        if (element.type === 'image' && element.imageData) {
          try {
            const img = await loadImage(element.imageData);
            context.globalAlpha = element.opacity / 100;
            const width = element.x2 - element.x1;
            const height = element.y2 - element.y1;
            context.drawImage(img, element.x1, element.y1, width, height);
            context.globalAlpha = 1;

            // Draw selection box for images
            if (element.isSelected) {
              context.strokeStyle = '#4f46e5';
              context.lineWidth = 2 / scale;
              context.setLineDash([6 / scale, 4 / scale]);
              context.strokeRect(element.x1 - 4, element.y1 - 4, width + 8, height + 8);
              context.setLineDash([]);
            }
          } catch (e) {
            // Image failed to load
          }
        } else {
          drawElement(roughCanvas, context, element);
        }
      }

      // Draw current element being created
      if (currentElement) {
        drawElement(roughCanvas, context, currentElement);
      }

      context.restore();
    };

    draw();
  }, [elements, currentElement, panOffset, scale, loadImage]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getMouseCoordinates = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left - panOffset.x) / scale,
        y: (event.clientY - rect.top - panOffset.y) / scale,
      };
    },
    [panOffset, scale]
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getMouseCoordinates(event);

      if (tool === 'hand') {
        setStartPanPoint({ x: event.clientX - panOffset.x, y: event.clientY - panOffset.y });
        return;
      }

      if (tool === 'select') {
        // Find element under cursor
        const clickedElement = [...elements].reverse().find((el) => isPointInElement(x, y, el));
        
        if (clickedElement) {
          // Check if clicking on an already selected element - start dragging
          if (clickedElement.isSelected) {
            setIsDragging(true);
            setDragStart({ x, y });
            setDraggedElementId(clickedElement.id);
            return;
          }
          
          // Select the clicked element and start dragging
          setElements((prev) =>
            prev.map((el) => ({
              ...el,
              isSelected: el.id === clickedElement.id,
            }))
          );
          setIsDragging(true);
          setDragStart({ x, y });
          setDraggedElementId(clickedElement.id);
        } else {
          // Clicked on empty space - deselect all
          setElements((prev) =>
            prev.map((el) => ({
              ...el,
              isSelected: false,
            }))
          );
        }
        return;
      }

      if (tool === 'eraser') {
        setIsErasing(true);
        // Erase element under cursor immediately
        const elementToDelete = [...elements].reverse().find((el) => isPointInElement(x, y, el));
        if (elementToDelete) {
          const newElements = elements.filter((el) => el.id !== elementToDelete.id);
          setElements(newElements);
          onElementsChange?.(newElements);
        }
        return;
      }

      if (tool === 'text') {
        const text = prompt('Enter text:');
        if (text) {
          const newElement = createElement(generateId(), x, y, x + 100, y + 30, 'text', {
            strokeColor,
            fillColor,
            strokeWidth,
            roughness,
            opacity,
            text,
          });
          setElements((prev) => [...prev, newElement]);
          onElementsChange?.([...elements, newElement]);
        }
        return;
      }

      setIsDrawing(true);

      const elementType = tool === 'pencil' ? 'pencil' : tool as WhiteboardElement['type'];
      
      const newElement = createElement(generateId(), x, y, x, y, elementType, {
        strokeColor,
        fillColor,
        strokeWidth,
        roughness,
        opacity,
        points: tool === 'pencil' ? [{ x, y }] : undefined,
      });

      setCurrentElement(newElement);
    },
    [tool, elements, strokeColor, fillColor, strokeWidth, roughness, opacity, getMouseCoordinates, panOffset, setElements, onElementsChange]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (tool === 'hand' && startPanPoint) {
        setPanOffset({
          x: event.clientX - startPanPoint.x,
          y: event.clientY - startPanPoint.y,
        });
        return;
      }

      // Handle erasing while dragging
      if (tool === 'eraser' && isErasing) {
        const { x, y } = getMouseCoordinates(event);
        const elementToDelete = [...elements].reverse().find((el) => isPointInElement(x, y, el));
        if (elementToDelete) {
          const newElements = elements.filter((el) => el.id !== elementToDelete.id);
          setElements(newElements);
          onElementsChange?.(newElements);
        }
        return;
      }

      // Handle dragging selected elements
      if (isDragging && dragStart && draggedElementId) {
        const { x, y } = getMouseCoordinates(event);
        const dx = x - dragStart.x;
        const dy = y - dragStart.y;

        setElements((prev) =>
          prev.map((el) => {
            if (el.id === draggedElementId) {
              const updatedElement = {
                ...el,
                x1: el.x1 + dx,
                y1: el.y1 + dy,
                x2: el.x2 + dx,
                y2: el.y2 + dy,
              };
              
              // Also update points for pencil elements
              if (el.points) {
                updatedElement.points = el.points.map((p) => ({
                  x: p.x + dx,
                  y: p.y + dy,
                }));
              }
              
              return updatedElement;
            }
            return el;
          })
        );
        
        setDragStart({ x, y });
        return;
      }

      if (!isDrawing || !currentElement) return;

      const { x, y } = getMouseCoordinates(event);

      if (currentElement.type === 'pencil') {
        setCurrentElement((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            points: [...(prev.points || []), { x, y }],
            x2: x,
            y2: y,
          };
        });
      } else {
        setCurrentElement((prev) => {
          if (!prev) return null;
          return { ...prev, x2: x, y2: y };
        });
      }
    },
    [tool, isDrawing, currentElement, startPanPoint, getMouseCoordinates, isDragging, dragStart, draggedElementId, setElements, isErasing, elements, onElementsChange]
  );

  const handleMouseUp = useCallback(() => {
    setStartPanPoint(null);
    
    // Stop erasing
    if (isErasing) {
      setIsErasing(false);
      return;
    }

    // Finalize dragging
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      setDraggedElementId(null);
      onElementsChange?.(elements);
      return;
    }

    if (!isDrawing || !currentElement) {
      setIsDrawing(false);
      return;
    }

    // Add the element to the list
    const finalElement = { ...currentElement };
    
    // Normalize coordinates for pencil
    if (finalElement.type === 'pencil' && finalElement.points) {
      const xs = finalElement.points.map((p) => p.x);
      const ys = finalElement.points.map((p) => p.y);
      finalElement.x1 = Math.min(...xs);
      finalElement.y1 = Math.min(...ys);
      finalElement.x2 = Math.max(...xs);
      finalElement.y2 = Math.max(...ys);
    }

    setElements((prev) => {
      const newElements = [...prev, finalElement];
      onElementsChange?.(newElements);
      return newElements;
    });
    
    setCurrentElement(null);
    setIsDrawing(false);
  }, [isDrawing, currentElement, setElements, onElementsChange, isDragging, elements, isErasing]);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => Math.min(Math.max(prev * delta, 0.1), 5));
  }, []);

  // Get cursor style based on tool
  const getCursor = () => {
    if (isDragging) {
      return 'grabbing';
    }
    
    switch (tool) {
      case 'select':
        // Check if hovering over a selected element
        return 'default';
      case 'hand':
        return startPanPoint ? 'grabbing' : 'grab';
      case 'pencil':
        return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(strokeColor)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z'/%3E%3C/svg%3E") 2 22, crosshair`;
      case 'text':
        return 'text';
      case 'eraser':
        return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23ef4444' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21'/%3E%3Cpath d='M22 21H7'/%3E%3Cpath d='m5 11 9 9'/%3E%3C/svg%3E") 4 20, not-allowed`;
      case 'rectangle':
      case 'ellipse':
      case 'diamond':
        return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Ccircle cx='10' cy='10' r='8' fill='none' stroke='${encodeURIComponent(strokeColor)}' stroke-width='2'/%3E%3Ccircle cx='10' cy='10' r='2' fill='${encodeURIComponent(strokeColor)}'/%3E%3C/svg%3E") 10 10, crosshair`;
      case 'line':
      case 'arrow':
        return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Cline x1='2' y1='18' x2='18' y2='2' stroke='${encodeURIComponent(strokeColor)}' stroke-width='2'/%3E%3Ccircle cx='18' cy='2' r='3' fill='${encodeURIComponent(strokeColor)}'/%3E%3C/svg%3E") 18 2, crosshair`;
      case 'image':
        return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Cpath d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/%3E%3C/svg%3E") 12 12, copy`;
      default:
        return 'crosshair';
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{
        cursor: getCursor(),
        touchAction: 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    />
  );
}
