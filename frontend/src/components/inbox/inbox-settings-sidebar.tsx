'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Palette, Pipette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RgbaColorPicker, RgbaColor } from 'react-colorful';
import { cn } from '@/lib/utils';

interface Theme {
  id: string;
  name: string;
  preview?: string | null;
  color?: string;
  gradient?: string;
}

interface InboxSettingsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: string;
  onThemeChange: (themeId: string) => void;
}

// Helper to convert hex to rgba
const hexToRgba = (hex: string): RgbaColor => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
      a: 1,
    };
  }
  return { r: 99, g: 102, b: 241, a: 1 }; // Default indigo
};

// Helper to convert rgba to hex
const rgbaToHex = (rgba: RgbaColor): string => {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}`;
};

// Helper to convert rgba to css string
const rgbaToCss = (rgba: RgbaColor): string => {
  return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
};

export function InboxSettingsSidebar({
  isOpen,
  onClose,
  currentTheme,
  onThemeChange,
}: InboxSettingsSidebarProps) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [customColor, setCustomColor] = useState<RgbaColor>({ r: 99, g: 102, b: 241, a: 1 });
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Ensure we only render portal on client
  useEffect(() => {
    setMounted(true);
    // Load custom color from localStorage
    const savedColor = localStorage.getItem('inbox-custom-color');
    if (savedColor) {
      try {
        const parsed = JSON.parse(savedColor);
        if (parsed.r !== undefined) {
          setCustomColor(parsed);
        } else {
          // It's a hex string from before
          setCustomColor(hexToRgba(savedColor));
        }
      } catch {
        // It's a hex string
        setCustomColor(hexToRgba(savedColor));
      }
    }
  }, []);

  // Fetch themes from JSON file
  useEffect(() => {
    const fetchThemes = async () => {
      try {
        const response = await fetch('/themes.json');
        const data = await response.json();
        setThemes(data.themes || []);
      } catch (error) {
        console.error('Failed to load themes:', error);
        // Fallback themes
        setThemes([
          { id: 'dark', name: 'Dark', color: '#1a1a1a' },
          { id: 'blue', name: 'Blue', color: '#2563eb' },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchThemes();
    }
  }, [isOpen]);

  const getThemeStyle = (theme: Theme): React.CSSProperties => {
    if (theme.preview) {
      return {
        backgroundImage: `url(${theme.preview})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    if (theme.gradient) {
      return {
        background: theme.gradient,
      };
    }
    if (theme.color) {
      return {
        backgroundColor: theme.color,
      };
    }
    return {
      backgroundColor: '#374151',
    };
  };

  const handleCustomColorChange = (color: RgbaColor) => {
    setCustomColor(color);
    localStorage.setItem('inbox-custom-color', JSON.stringify(color));
  };

  const applyCustomColor = () => {
    const cssColor = customColor.a < 1 ? rgbaToCss(customColor) : rgbaToHex(customColor);
    onThemeChange(`custom:${cssColor}`);
    setShowColorPicker(false);
  };

  const handleEyeDropper = async () => {
    if ('EyeDropper' in window) {
      try {
        // @ts-expect-error EyeDropper is not in TypeScript types yet
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        const hex = result.sRGBHex;
        const rgba = hexToRgba(hex);
        handleCustomColorChange(rgba);
      } catch {
        // User cancelled or error
      }
    }
  };

  const displayedThemes = showAll ? themes : themes.slice(0, 8);
  const isCustomTheme = currentTheme.startsWith('custom:');
  const customColorCss = customColor.a < 1 ? rgbaToCss(customColor) : rgbaToHex(customColor);

  const sidebarContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20"
            style={{ zIndex: 9998 }}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-[320px] bg-background border-l shadow-xl overflow-y-auto"
            style={{ zIndex: 9999 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background">
              <h2 className="text-lg font-semibold">Settings</h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Themes Section */}
              <div>
                <h3 className="font-medium mb-4">Themes</h3>
                {isLoading ? (
                  <div className="grid grid-cols-5 gap-2">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-lg bg-muted animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-5 gap-2">
                      {displayedThemes.map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() => onThemeChange(theme.id)}
                          className={cn(
                            'relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105',
                            currentTheme === theme.id
                              ? 'border-primary ring-2 ring-primary/30'
                              : 'border-transparent hover:border-muted-foreground/30'
                          )}
                          title={theme.name}
                        >
                          <div
                            className="w-full h-full"
                            style={getThemeStyle(theme)}
                          />
                          {currentTheme === theme.id && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </button>
                      ))}

                      {/* Custom Color Button */}
                      <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className={cn(
                          'relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105',
                          isCustomTheme
                            ? 'border-primary ring-2 ring-primary/30'
                            : 'border-transparent hover:border-muted-foreground/30'
                        )}
                        title="Custom color"
                        style={{
                          background: isCustomTheme
                            ? currentTheme.replace('custom:', '')
                            : `conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)`,
                        }}
                      >
                        {!isCustomTheme && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Palette className="h-4 w-4 text-white" />
                          </div>
                        )}
                        {isCustomTheme && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </button>
                    </div>

                    {/* Color Picker */}
                    <AnimatePresence>
                      {showColorPicker && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 p-4 border rounded-lg bg-card overflow-hidden"
                        >
                          <div className="space-y-4">
                            {/* Color Picker */}
                            <div className="color-picker-wrapper">
                              <RgbaColorPicker
                                color={customColor}
                                onChange={handleCustomColorChange}
                              />
                            </div>

                            {/* Bottom Controls */}
                            <div className="space-y-3">
                              {/* First Row: Eyedropper, Preview, Hex Input */}
                              <div className="flex items-center gap-2">
                                {/* Eyedropper */}
                                {'EyeDropper' in window && (
                                  <button
                                    onClick={handleEyeDropper}
                                    className="p-2 border rounded-md hover:bg-muted transition-colors shrink-0"
                                    title="Pick color from screen"
                                  >
                                    <Pipette className="h-4 w-4" />
                                  </button>
                                )}
                                
                                {/* Hex Input */}
                                <input
                                  type="text"
                                  value={rgbaToHex(customColor).toUpperCase()}
                                  onChange={(e) => {
                                    const hex = e.target.value;
                                    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                                      handleCustomColorChange({ ...hexToRgba(hex), a: customColor.a });
                                    }
                                  }}
                                  className="flex-1 h-10 px-3 rounded-md border bg-background text-sm font-mono uppercase"
                                  placeholder="#6366F1"
                                />
                              </div>

                              {/* Apply Button - Full Width */}
                              <button
                                onClick={applyCustomColor}
                                className="w-full h-10 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                              >
                                Apply Color
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* View All / Show Less Button */}
                    {themes.length > 7 && (
                      <button
                        onClick={() => setShowAll(!showAll)}
                        className="text-sm text-primary mt-3 hover:underline block"
                      >
                        {showAll ? 'Show less' : `View all (${themes.length})`}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* Custom styles for react-colorful */}
          <style jsx global>{`
            .color-picker-wrapper .react-colorful {
              width: 100%;
              height: auto;
            }
            .color-picker-wrapper .react-colorful__saturation {
              border-radius: 8px 8px 0 0;
              height: 150px;
            }
            .color-picker-wrapper .react-colorful__hue,
            .color-picker-wrapper .react-colorful__alpha {
              height: 14px;
              border-radius: 7px;
              margin-top: 12px;
            }
            .color-picker-wrapper .react-colorful__saturation-pointer,
            .color-picker-wrapper .react-colorful__hue-pointer,
            .color-picker-wrapper .react-colorful__alpha-pointer {
              width: 20px;
              height: 20px;
              border-width: 3px;
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );

  // Use portal to render at document body level
  if (!mounted) return null;
  
  return createPortal(sidebarContent, document.body);
}
