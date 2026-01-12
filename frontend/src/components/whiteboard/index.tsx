'use client';

import dynamic from 'next/dynamic';
import type { WhiteboardElement, Tool } from './Whiteboard';

// Dynamic import to avoid SSR issues with canvas
const Whiteboard = dynamic(() => import('./Whiteboard'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-muted/30">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Loading whiteboard...</p>
      </div>
    </div>
  ),
});

export default Whiteboard;
export type { WhiteboardElement, Tool };
