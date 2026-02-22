'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Link as LinkIcon,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  MoreHorizontal,
  Undo,
  Redo,
  ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './popover';
import { Input } from './input';
import { useState, useRef } from 'react';
import { uploadAPI } from '@/lib/api';
import { compressImageToBlob } from '@/lib/image-compressor';

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  allowImages?: boolean;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  tooltip?: string;
}

function ToolbarButton({ onClick, isActive, disabled, children, tooltip }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={cn(
        'p-1.5 rounded hover:bg-accent transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        isActive && 'bg-accent text-accent-foreground'
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-border mx-1" />;
}

export function TipTapEditor({
  content,
  onChange,
  placeholder = 'Write something...',
  editable = true,
  className,
  allowImages = false,
}: TipTapEditorProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Underline,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      Highlight.configure({
        multicolor: false,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      ...(allowImages ? [Image.configure({ allowBase64: true })] : []),
    ],
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm prose-invert max-w-none focus:outline-none min-h-[120px] px-3 py-3',
          'prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0',
          'prose-headings:mb-2 prose-headings:mt-4',
          'prose-blockquote:border-l-primary prose-blockquote:bg-muted/50 prose-blockquote:py-1 prose-blockquote:px-4',
          'prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm',
          'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
          'prose-img:rounded-lg prose-img:max-w-full',
          className
        ),
      },
      ...(allowImages && {
        handlePaste(view, event) {
          const items = event.clipboardData?.items;
          if (!items) return false;
          for (const item of items) {
            if (item.type.startsWith('image/')) {
              event.preventDefault();
              const file = item.getAsFile();
              if (!file) return false;
              compressImageToBlob(file, 1200, 1200, 0.8)
                .then((blob) => uploadAPI.uploadImage(blob as File))
                .then((url) => {
                  view.dispatch(
                    view.state.tr.replaceSelectionWith(
                      view.state.schema.nodes.image.create({ src: url })
                    )
                  );
                })
                .catch((e) => console.error('Image upload failed', e));
              return true;
            }
          }
          return false;
        },
        handleDrop(view, event) {
          const files = event.dataTransfer?.files;
          if (!files?.length) return false;
          for (const file of files) {
            if (file.type.startsWith('image/')) {
              event.preventDefault();
              const pos = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });
              compressImageToBlob(file, 1200, 1200, 0.8)
                .then((blob) => uploadAPI.uploadImage(blob as File))
                .then((url) => {
                  const insertPos = pos ? pos.pos : view.state.selection.from;
                  view.dispatch(
                    view.state.tr.insert(insertPos, view.state.schema.nodes.image.create({ src: url }))
                  );
                })
                .catch((e) => console.error('Image upload failed', e));
              return true;
            }
          }
          return false;
        },
      }),
    },
  });

  const setLink = () => {
    if (!editor) return;
    
    if (linkUrl === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    }
    setLinkUrl('');
    setIsLinkOpen(false);
  };

  if (!editor) {
    return (
      <div className="rounded-lg border border-input bg-card min-h-[120px] px-3 py-3">
        <p className="text-muted-foreground text-sm">{placeholder}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-input bg-card overflow-hidden">
      {editable && (
        <div className="flex items-center gap-0.5 border-b border-input px-2 py-1.5 bg-muted/30 flex-wrap">
          {/* Text Formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            tooltip="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            tooltip="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            tooltip="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="w-4 h-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            tooltip="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            tooltip="Bullet List"
          >
            <List className="w-4 h-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            tooltip="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive('taskList')}
            tooltip="Task List"
          >
            <CheckSquare className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Highlight */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            isActive={editor.isActive('highlight')}
            tooltip="Highlight"
          >
            <Highlighter className="w-4 h-4" />
          </ToolbarButton>

          {/* Alignment */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            tooltip="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            tooltip="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            tooltip="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Quote & Code */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            tooltip="Quote"
          >
            <Quote className="w-4 h-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            tooltip="Code Block"
          >
            <Code className="w-4 h-4" />
          </ToolbarButton>

          {/* Link */}
          <Popover open={isLinkOpen} onOpenChange={setIsLinkOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'p-1.5 rounded hover:bg-accent transition-colors cursor-pointer',
                  editor.isActive('link') && 'bg-accent text-accent-foreground'
                )}
                title="Insert Link"
              >
                <LinkIcon className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="start">
              <div className="space-y-2">
                <label className="text-sm font-medium">URL</label>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  onKeyDown={(e) => e.key === 'Enter' && setLink()}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={setLink}>
                    {editor.isActive('link') ? 'Update' : 'Add'} Link
                  </Button>
                  {editor.isActive('link') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        editor.chain().focus().unsetLink().run();
                        setIsLinkOpen(false);
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {allowImages && (
            <>
              <ToolbarDivider />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file || !editor) return;
                  compressImageToBlob(file, 1200, 1200, 0.8)
                    .then((blob) => uploadAPI.uploadImage(blob as File))
                    .then((url) => editor.chain().focus().setImage({ src: url }).run())
                    .catch((err) => console.error('Image upload failed', err));
                  e.target.value = '';
                }}
              />
              <ToolbarButton
                onClick={() => fileInputRef.current?.click()}
                tooltip="Upload image"
              >
                <ImageIcon className="w-4 h-4" />
              </ToolbarButton>
            </>
          )}

          <ToolbarDivider />

          {/* Undo/Redo */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            tooltip="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            tooltip="Redo (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </ToolbarButton>

          {/* More Options */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="p-1.5 rounded hover:bg-accent transition-colors cursor-pointer ml-auto"
                title="More options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="end">
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  className={cn(
                    'w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent cursor-pointer',
                    editor.isActive('heading', { level: 1 }) && 'bg-accent'
                  )}
                >
                  Heading 1
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={cn(
                    'w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent cursor-pointer',
                    editor.isActive('heading', { level: 2 }) && 'bg-accent'
                  )}
                >
                  Heading 2
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  className={cn(
                    'w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent cursor-pointer',
                    editor.isActive('heading', { level: 3 }) && 'bg-accent'
                  )}
                >
                  Heading 3
                </button>
                <div className="border-t my-1" />
                <button
                  type="button"
                  onClick={() => editor.chain().focus().setHorizontalRule().run()}
                  className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent cursor-pointer"
                >
                  Horizontal Rule
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
                  className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent cursor-pointer"
                >
                  Clear Formatting
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

// Simple display component for viewing content
export function TipTapViewer({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TaskList,
      TaskItem,
      Link.configure({
        openOnClick: true,
      }),
      Highlight,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm prose-invert max-w-none',
          'prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0',
          'prose-a:text-primary',
          className
        ),
      },
    },
  });

  if (!editor) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  return <EditorContent editor={editor} />;
}
