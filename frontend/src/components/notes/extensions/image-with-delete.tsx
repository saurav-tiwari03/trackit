'use client';

import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { X } from 'lucide-react';

export function ImageNodeView({ node, deleteNode, selected }: NodeViewProps) {
  return (
    <NodeViewWrapper className="relative inline-block my-4 group">
      <div className={`relative ${selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg' : ''}`}>
        {/* Delete button - glass morphism style */}
        <button
          onClick={deleteNode}
          className="absolute -top-2 -right-2 z-10 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg backdrop-blur-md bg-white/20 border border-white/30 hover:bg-white/30 hover:scale-110 cursor-pointer"
          title="Remove image"
          type="button"
        >
          <X className="h-4 w-4 text-red-500 stroke-[3]" />
        </button>
        
        {/* Image */}
        <img
          src={node.attrs.src}
          alt={node.attrs.alt || ''}
          title={node.attrs.title || ''}
          className="rounded-lg max-w-full h-auto block mx-auto"
          draggable={false}
        />
      </div>
    </NodeViewWrapper>
  );
}

