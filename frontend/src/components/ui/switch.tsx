'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  defaultChecked?: boolean;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked, onCheckedChange, defaultChecked, disabled, ...props }, ref) => {
    const [internalChecked, setInternalChecked] = React.useState(defaultChecked ?? false);
    
    const isChecked = checked !== undefined ? checked : internalChecked;
    
    const handleClick = () => {
      if (disabled) return;
      const newChecked = !isChecked;
      setInternalChecked(newChecked);
      onCheckedChange?.(newChecked);
    };

    return (
      <button
        type="button"
        role="switch"
        aria-checked={isChecked}
        data-state={isChecked ? 'checked' : 'unchecked'}
        disabled={disabled}
        ref={ref}
        onClick={handleClick}
        className={cn(
          'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isChecked ? 'bg-primary' : 'bg-input',
          className
        )}
        {...props}
      >
        <span
          data-state={isChecked ? 'checked' : 'unchecked'}
          className={cn(
            'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform',
            isChecked ? 'translate-x-4' : 'translate-x-0'
          )}
        />
      </button>
    );
  }
);
Switch.displayName = 'Switch';

export { Switch };

