'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  MoveRight,
  Pencil,
  Circle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { groceryAPI } from '@/lib/api';
import { GroceryList, GroceryItem } from '@/types';
import { toast } from '@/components/ui/sonner';

const listColors = [
  { name: 'Gray', value: '#6b7280' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
];

export function GroceryListPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());
  
  // New list state
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  
  // New item state
  const [addingItemToList, setAddingItemToList] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  
  // Edit state
  const [editingList, setEditingList] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');
  const [editingItem, setEditingItem] = useState<{ listId: string; itemId: string } | null>(null);
  const [editingItemName, setEditingItemName] = useState('');

  const newItemInputRef = useRef<HTMLInputElement>(null);
  const newListInputRef = useRef<HTMLInputElement>(null);

  // Fetch lists when opened
  useEffect(() => {
    if (isOpen) {
      fetchLists();
    }
  }, [isOpen]);

  const fetchLists = async () => {
    setIsLoading(true);
    try {
      const response = await groceryAPI.getLists();
      setLists(response.data.data);
      // Expand all lists by default
      setExpandedLists(new Set(response.data.data.map((l: GroceryList) => l._id)));
    } catch (error) {
      console.error('Error fetching grocery lists:', error);
      toast.error('Failed to load grocery lists');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;

    try {
      const response = await groceryAPI.createList({ name: newListName.trim() });
      setLists((prev) => [...prev, response.data.data]);
      setExpandedLists((prev) => new Set([...prev, response.data.data._id]));
      setNewListName('');
      setIsAddingList(false);
      toast.success('List created');
    } catch (error) {
      console.error('Error creating list:', error);
      toast.error('Failed to create list');
    }
  };

  const handleDeleteList = async (listId: string) => {
    try {
      await groceryAPI.deleteList(listId);
      setLists((prev) => prev.filter((l) => l._id !== listId));
      toast.success('List deleted');
    } catch (error) {
      console.error('Error deleting list:', error);
      toast.error('Failed to delete list');
    }
  };

  const handleUpdateListName = async (listId: string) => {
    if (!editingListName.trim()) {
      setEditingList(null);
      return;
    }

    try {
      const response = await groceryAPI.updateList(listId, { name: editingListName.trim() });
      setLists((prev) =>
        prev.map((l) => (l._id === listId ? response.data.data : l))
      );
      setEditingList(null);
      setEditingListName('');
    } catch (error) {
      console.error('Error updating list:', error);
      toast.error('Failed to update list');
    }
  };

  const handleUpdateListColor = async (listId: string, color: string) => {
    try {
      const response = await groceryAPI.updateList(listId, { color });
      setLists((prev) =>
        prev.map((l) => (l._id === listId ? response.data.data : l))
      );
    } catch (error) {
      console.error('Error updating list color:', error);
      toast.error('Failed to update color');
    }
  };

  const handleAddItem = async (listId: string) => {
    if (!newItemName.trim()) return;

    try {
      const response = await groceryAPI.addItem(listId, { name: newItemName.trim() });
      setLists((prev) =>
        prev.map((l) => (l._id === listId ? response.data.data : l))
      );
      setNewItemName('');
      // Keep focus on input for quick entry
      newItemInputRef.current?.focus();
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    }
  };

  const handleToggleItem = async (listId: string, item: GroceryItem) => {
    try {
      const response = await groceryAPI.updateItem(listId, item._id, {
        isCompleted: !item.isCompleted,
      });
      setLists((prev) =>
        prev.map((l) => (l._id === listId ? response.data.data : l))
      );
    } catch (error) {
      console.error('Error toggling item:', error);
      toast.error('Failed to update item');
    }
  };

  const handleDeleteItem = async (listId: string, itemId: string) => {
    try {
      const response = await groceryAPI.deleteItem(listId, itemId);
      setLists((prev) =>
        prev.map((l) => (l._id === listId ? response.data.data : l))
      );
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const handleUpdateItemName = async (listId: string, itemId: string) => {
    if (!editingItemName.trim()) {
      setEditingItem(null);
      return;
    }

    try {
      const response = await groceryAPI.updateItem(listId, itemId, {
        name: editingItemName.trim(),
      });
      setLists((prev) =>
        prev.map((l) => (l._id === listId ? response.data.data : l))
      );
      setEditingItem(null);
      setEditingItemName('');
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    }
  };

  const handleMoveItem = async (
    sourceListId: string,
    itemId: string,
    targetListId: string
  ) => {
    try {
      const response = await groceryAPI.moveItem(sourceListId, itemId, targetListId);
      const { sourceList, targetList } = response.data.data;
      setLists((prev) =>
        prev.map((l) => {
          if (l._id === sourceListId) return sourceList;
          if (l._id === targetListId) return targetList;
          return l;
        })
      );
      toast.success('Item moved');
    } catch (error) {
      console.error('Error moving item:', error);
      toast.error('Failed to move item');
    }
  };

  const handleClearCompleted = async (listId: string) => {
    try {
      const response = await groceryAPI.clearCompleted(listId);
      setLists((prev) =>
        prev.map((l) => (l._id === listId ? response.data.data : l))
      );
      toast.success('Completed items cleared');
    } catch (error) {
      console.error('Error clearing completed:', error);
      toast.error('Failed to clear completed items');
    }
  };

  const toggleExpanded = (listId: string) => {
    setExpandedLists((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(listId)) {
        newSet.delete(listId);
      } else {
        newSet.add(listId);
      }
      return newSet;
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <ShoppingCart className="h-4 w-4" />
          <span className="hidden sm:inline">Grocery</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[450px] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Grocery Lists
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Lists */}
            {lists.map((list) => {
              const isExpanded = expandedLists.has(list._id);
              const completedCount = list.items.filter((i) => i.isCompleted).length;
              const totalCount = list.items.length;

              return (
                <Collapsible
                  key={list._id}
                  open={isExpanded}
                  onOpenChange={() => toggleExpanded(list._id)}
                >
                  <div className="border rounded-lg overflow-hidden">
                    {/* List Header */}
                    <div
                      className="flex items-center gap-2 px-3 py-2 bg-muted/30 group"
                      style={{ borderLeft: `3px solid ${list.color || '#6b7280'}` }}
                    >
                      <CollapsibleTrigger asChild>
                        <button className="p-0.5 hover:bg-muted rounded transition-colors">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </CollapsibleTrigger>

                      {editingList === list._id ? (
                        <Input
                          value={editingListName}
                          onChange={(e) => setEditingListName(e.target.value)}
                          onBlur={() => handleUpdateListName(list._id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateListName(list._id);
                            if (e.key === 'Escape') setEditingList(null);
                          }}
                          className="h-7 flex-1"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="font-medium flex-1 cursor-pointer hover:text-primary transition-colors"
                          onClick={() => {
                            setEditingList(list._id);
                            setEditingListName(list.name);
                          }}
                        >
                          {list.name}
                        </span>
                      )}

                      <span className="text-xs text-muted-foreground">
                        {completedCount}/{totalCount}
                      </span>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 opacity-0 group-hover:opacity-100 hover:bg-muted rounded transition-all">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingList(list._id);
                              setEditingListName(list.name);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <div
                                className="h-4 w-4 rounded mr-2"
                                style={{ backgroundColor: list.color || '#6b7280' }}
                              />
                              Color
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {listColors.map((color) => (
                                <DropdownMenuItem
                                  key={color.value}
                                  onClick={() => handleUpdateListColor(list._id, color.value)}
                                >
                                  <div
                                    className="h-4 w-4 rounded mr-2"
                                    style={{ backgroundColor: color.value }}
                                  />
                                  {color.name}
                                  {list.color === color.value && (
                                    <Check className="h-4 w-4 ml-auto" />
                                  )}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          {completedCount > 0 && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleClearCompleted(list._id)}>
                                <Check className="h-4 w-4 mr-2" />
                                Clear completed
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteList(list._id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete list
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* List Items */}
                    <CollapsibleContent>
                      <div className="divide-y">
                        {list.items
                          .sort((a, b) => a.order - b.order)
                          .map((item) => (
                            <div
                              key={item._id}
                              className="flex items-center gap-2 px-3 py-2 group/item hover:bg-muted/20"
                            >
                              <button
                                onClick={() => handleToggleItem(list._id, item)}
                                className="shrink-0"
                              >
                                {item.isCompleted ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                ) : (
                                  <Circle className="h-5 w-5 text-muted-foreground hover:text-green-500 transition-colors" />
                                )}
                              </button>

                              {editingItem?.listId === list._id &&
                              editingItem?.itemId === item._id ? (
                                <Input
                                  value={editingItemName}
                                  onChange={(e) => setEditingItemName(e.target.value)}
                                  onBlur={() => handleUpdateItemName(list._id, item._id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter')
                                      handleUpdateItemName(list._id, item._id);
                                    if (e.key === 'Escape') setEditingItem(null);
                                  }}
                                  className="h-7 flex-1"
                                  autoFocus
                                />
                              ) : (
                                <span
                                  className={cn(
                                    'flex-1 text-sm cursor-pointer',
                                    item.isCompleted && 'line-through text-muted-foreground'
                                  )}
                                  onClick={() => {
                                    setEditingItem({ listId: list._id, itemId: item._id });
                                    setEditingItemName(item.name);
                                  }}
                                >
                                  {item.name}
                                  {item.quantity && item.quantity > 1 && (
                                    <span className="text-muted-foreground ml-1">
                                      x{item.quantity}
                                    </span>
                                  )}
                                  {item.unit && (
                                    <span className="text-muted-foreground ml-1">
                                      {item.unit}
                                    </span>
                                  )}
                                </span>
                              )}

                              <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                {lists.length > 1 && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="p-1 hover:bg-muted rounded transition-colors">
                                        <MoveRight className="h-3.5 w-3.5 text-muted-foreground" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                        Move to...
                                      </div>
                                      {lists
                                        .filter((l) => l._id !== list._id)
                                        .map((targetList) => (
                                          <DropdownMenuItem
                                            key={targetList._id}
                                            onClick={() =>
                                              handleMoveItem(list._id, item._id, targetList._id)
                                            }
                                          >
                                            <div
                                              className="h-3 w-3 rounded mr-2"
                                              style={{
                                                backgroundColor: targetList.color || '#6b7280',
                                              }}
                                            />
                                            {targetList.name}
                                          </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                                <button
                                  onClick={() => handleDeleteItem(list._id, item._id)}
                                  className="p-1 hover:bg-muted rounded transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                                </button>
                              </div>
                            </div>
                          ))}

                        {/* Add Item Input */}
                        {addingItemToList === list._id ? (
                          <div className="flex items-center gap-2 px-3 py-2">
                            <Circle className="h-5 w-5 text-muted-foreground/50 shrink-0" />
                            <Input
                              ref={newItemInputRef}
                              value={newItemName}
                              onChange={(e) => setNewItemName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleAddItem(list._id);
                                }
                                if (e.key === 'Escape') {
                                  setAddingItemToList(null);
                                  setNewItemName('');
                                }
                              }}
                              onBlur={() => {
                                if (!newItemName.trim()) {
                                  setAddingItemToList(null);
                                }
                              }}
                              placeholder="Add item..."
                              className="h-7 flex-1 border-0 bg-transparent focus-visible:ring-0 px-0"
                              autoFocus
                            />
                            <button
                              onClick={() => {
                                setAddingItemToList(null);
                                setNewItemName('');
                              }}
                              className="p-1 hover:bg-muted rounded"
                            >
                              <X className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setAddingItemToList(list._id);
                              setNewItemName('');
                            }}
                            className="flex items-center gap-2 px-3 py-2 w-full text-sm text-primary hover:bg-muted/20 transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                            Add item
                          </button>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}

            {/* Add New List */}
            {isAddingList ? (
              <div className="flex items-center gap-2 p-3 border rounded-lg">
                <Input
                  ref={newListInputRef}
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateList();
                    if (e.key === 'Escape') {
                      setIsAddingList(false);
                      setNewListName('');
                    }
                  }}
                  placeholder="List name..."
                  className="flex-1"
                  autoFocus
                />
                <Button size="sm" onClick={handleCreateList} disabled={!newListName.trim()}>
                  Create
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAddingList(false);
                    setNewListName('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setIsAddingList(true)}
              >
                <Plus className="h-4 w-4" />
                Add new list
              </Button>
            )}

            {/* Empty State */}
            {lists.length === 0 && !isAddingList && (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No grocery lists yet</p>
                <p className="text-xs">Create a list to get started</p>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
