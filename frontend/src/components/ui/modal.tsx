'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function Modal({ isOpen, onClose, children, className, size = 'md' }: ModalProps) {
  const sizes = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
    full: 'sm:max-w-[90vw]',
  };

  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'fixed z-50',
              // Mobile: full screen
              'inset-0 sm:inset-auto',
              // Desktop: centered
              'sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2',
              'w-full sm:p-4',
              sizes[size]
            )}
          >
            <div
              className={cn(
                'relative shadow-2xl h-full sm:h-auto',
                'bg-white dark:bg-neutral-900',
                // Mobile: no rounded corners, Desktop: rounded
                'sm:rounded-2xl',
                'border-0 sm:border border-neutral-200 dark:border-neutral-800',
                'sm:max-h-[85vh] overflow-hidden',
                className
              )}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function ModalHeader({
  children,
  onClose,
  className,
}: {
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4',
        'border-b border-neutral-200 dark:border-neutral-800',
        'sticky top-0 bg-white dark:bg-neutral-900 z-10',
        className
      )}
    >
      <h2 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-white line-clamp-1">
        {children}
      </h2>
      {onClose && (
        <button
          onClick={onClose}
          className="p-2 -mr-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <X className="w-5 h-5 text-neutral-500" />
        </button>
      )}
    </div>
  );
}

export function ModalContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('p-4 sm:p-6 overflow-y-auto', className)}>
      {children}
    </div>
  );
}

export function ModalFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 px-4 sm:px-6 py-3 sm:py-4',
        'border-t border-neutral-200 dark:border-neutral-800',
        'sticky bottom-0 bg-white dark:bg-neutral-900',
        className
      )}
    >
      {children}
    </div>
  );
}
