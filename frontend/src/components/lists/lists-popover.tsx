'use client';

import { useRouter } from 'next/navigation';
import { List as ListIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface ListsPopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ListsPopover({ open, onOpenChange }: ListsPopoverProps) {
  const router = useRouter();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <ListIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Lists</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[90vw] sm:max-w-sm">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <ListIcon className="h-5 w-5" />
            Lists
          </SheetTitle>
        </SheetHeader>
        <div className="py-6">
          <p className="text-sm text-muted-foreground mb-4">
            Create multiple lists and add items with name and description in the
            kanban view.
          </p>
          <Button
            className="w-full gap-2"
            onClick={() => {
              onOpenChange?.(false);
              router.push('/lists');
            }}
          >
            <ListIcon className="h-4 w-4" />
            Open Lists
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
