'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import {
  List as ListIcon,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { TipTapEditor } from '@/components/ui/tiptap-editor';
import { cn } from '@/lib/utils';
import { listsAPI } from '@/lib/api';
import { List, ListItem } from '@/types';
import { ListItemCard } from '@/components/lists/list-item-card';
import { toast } from '@/components/ui/sonner';

export default function ListsPage() {
  const [lists, setLists] = useState<List[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAddingList, setIsAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  const [addItemToListId, setAddItemToListId] = useState<string | null>(null);

  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');

  const [editingItem, setEditingItem] = useState<{
    listId: string;
    item: ListItem;
  } | null>(null);
  const [editingItemName, setEditingItemName] = useState('');
  const [editingItemDescription, setEditingItemDescription] = useState('');

  const [viewingItem, setViewingItem] = useState<{
    listId: string;
    item: ListItem;
  } | null>(null);

  const fetchLists = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await listsAPI.getLists();
      setLists(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load lists');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    try {
      const res = await listsAPI.createList({ name: newListName.trim() });
      setLists((prev) => [...prev, res.data.data]);
      setNewListName('');
      setIsAddingList(false);
      toast.success('List created');
    } catch (err) {
      console.error(err);
      toast.error('Failed to create list');
    }
  };

  const handleDeleteList = async (listId: string) => {
    try {
      await listsAPI.deleteList(listId);
      setLists((prev) => prev.filter((l) => l._id !== listId));
      toast.success('List deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete list');
    }
  };

  const handleUpdateListName = async (listId: string) => {
    if (!editingListName.trim()) {
      setEditingListId(null);
      return;
    }
    try {
      const res = await listsAPI.updateList(listId, {
        name: editingListName.trim(),
      });
      setLists((prev) =>
        prev.map((l) => (l._id === listId ? res.data.data : l))
      );
      setEditingListId(null);
      setEditingListName('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update list');
    }
  };

  const handleAddItemFromModal = async () => {
    if (!addItemToListId || !editingItemName.trim()) return;
    try {
      const res = await listsAPI.addItem(addItemToListId, {
        name: editingItemName.trim(),
        description: editingItemDescription.trim() || undefined,
      });
      setLists((prev) =>
        prev.map((l) => (l._id === addItemToListId ? res.data.data : l))
      );
      setAddItemToListId(null);
      setEditingItemName('');
      setEditingItemDescription('');
      toast.success('Item added');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add item');
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    if (!editingItemName.trim()) {
      setEditingItem(null);
      return;
    }
    try {
      const res = await listsAPI.updateItem(
        editingItem.listId,
        editingItem.item._id,
        {
          name: editingItemName.trim(),
          description: editingItemDescription.trim() || undefined,
        }
      );
      setLists((prev) =>
        prev.map((l) => (l._id === editingItem.listId ? res.data.data : l))
      );
      setEditingItem(null);
      setAddItemToListId(null);
      setEditingItemName('');
      setEditingItemDescription('');
      toast.success('Item updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update item');
    }
  };

  const handleDeleteItem = async (listId: string, itemId: string) => {
    try {
      const res = await listsAPI.deleteItem(listId, itemId);
      setLists((prev) =>
        prev.map((l) => (l._id === listId ? res.data.data : l))
      );
      setEditingItem(null);
      toast.success('Item deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete item');
    }
  };

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, draggableId } = result;
      if (!destination) return;
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) {
        return;
      }

      const listId = destination.droppableId;
      const sameList = source.droppableId === destination.droppableId;

      if (sameList) {
        const list = lists.find((l) => l._id === listId);
        if (!list) return;
        const sorted = [...list.items].sort((a, b) => a.order - b.order);
        const [removed] = sorted.splice(source.index, 1);
        sorted.splice(destination.index, 0, removed);
        const orderedIds = sorted.map((i) => i._id);
        try {
          const res = await listsAPI.reorderItems(listId, orderedIds);
          setLists((prev) =>
            prev.map((l) => (l._id === listId ? res.data.data : l))
          );
        } catch (err) {
          console.error(err);
          toast.error('Failed to reorder');
        }
      } else {
        try {
          const res = await listsAPI.moveItem(
            source.droppableId,
            draggableId,
            destination.droppableId
          );
          const { sourceList, targetList } = res.data.data;
          setLists((prev) =>
            prev.map((l) => {
              if (l._id === source.droppableId) return sourceList;
              if (l._id === destination.droppableId) return targetList;
              return l;
            })
          );
          toast.success('Item moved');
        } catch (err) {
          console.error(err);
          toast.error('Failed to move item');
        }
      }
    },
    [lists]
  );

  const getItemsForList = useCallback(
    (listId: string) => {
      const list = lists.find((l) => l._id === listId);
      if (!list) return [];
      return [...list.items].sort((a, b) => a.order - b.order);
    },
    [lists]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading lists...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div className="flex items-center gap-3">
          <ListIcon className="h-6 w-6 text-lime-500" />
          <div>
            <h1 className="text-xl font-semibold">Lists</h1>
            <p className="text-sm text-muted-foreground">
              Create lists and add items in kanban view
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        {(lists.length > 0 || isAddingList) && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full min-h-[calc(100vh-140px)]">
            {lists.map((list, index) => {
              const items = getItemsForList(list._id);
              return (
                <motion.div
                  key={list._id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                  className="shrink-0 w-80 flex flex-col"
                >
                  <div
                    className="bg-card/50 border border-border rounded-xl p-3 flex flex-col flex-1 min-h-0"
                    style={{
                      borderTopWidth: 3,
                      borderTopColor: list.color || '#6b7280',
                    }}
                  >
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2 min-w-0">
                        {editingListId === list._id ? (
                          <Input
                            value={editingListName}
                            onChange={(e) => setEditingListName(e.target.value)}
                            onBlur={() => handleUpdateListName(list._id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter')
                                handleUpdateListName(list._id);
                              if (e.key === 'Escape') setEditingListId(null);
                            }}
                            className="h-8 flex-1 text-sm font-medium"
                            autoFocus
                          />
                        ) : (
                          <>
                            <h3
                              className="font-medium text-sm truncate cursor-pointer hover:text-primary"
                              onClick={() => {
                                setEditingListId(list._id);
                                setEditingListName(list.name);
                              }}
                            >
                              {list.name}
                            </h3>
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                              {items.length}
                            </span>
                          </>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingListId(list._id);
                              setEditingListName(list.name);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteList(list._id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete list
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Add item at top */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start mb-2 text-muted-foreground hover:text-foreground h-8 px-2"
                      onClick={() => {
                        setAddItemToListId(list._id);
                        setEditingItemName('');
                        setEditingItemDescription('');
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add item
                    </Button>

                    <Droppable droppableId={list._id} type="ITEM">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={cn(
                            'flex-1 space-y-2 rounded-lg p-1 overflow-y-auto min-h-[120px] transition-colors',
                            snapshot.isDraggingOver &&
                              'bg-primary/10 ring-2 ring-primary/30'
                          )}
                        >
                          {items.map((item, itemIndex) => (
                            <Draggable
                              key={item._id}
                              draggableId={item._id}
                              index={itemIndex}
                            >
                              {(provided, snapshot) => {
                                const card = (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={provided.draggableProps.style}
                                    className={cn(
                                      snapshot.isDragging && 'z-50'
                                    )}
                                  >
                                    <ListItemCard
                                      item={item}
                                      isDragging={snapshot.isDragging}
                                      onView={() =>
                                        setViewingItem({ listId: list._id, item })
                                      }
                                      onEdit={() => {
                                        setEditingItem({
                                          listId: list._id,
                                          item,
                                        });
                                        setEditingItemName(item.name);
                                        setEditingItemDescription(
                                          (() => {
                                            const d = item.description || '';
                                            if (!d.trim()) return '';
                                            return d.trim().startsWith('<') ? d : `<p>${d}</p>`;
                                          })()
                                        );
                                      }}
                                      onDelete={() =>
                                        handleDeleteItem(list._id, item._id)
                                      }
                                    />
                                  </div>
                                );
                                return snapshot.isDragging &&
                                  typeof document !== 'undefined'
                                  ? createPortal(card, document.body)
                                  : card;
                              }}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>

                    {/* Add item after last list item */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start mt-2 text-muted-foreground hover:text-foreground h-8 px-2"
                      onClick={() => {
                        setAddItemToListId(list._id);
                        setEditingItemName('');
                        setEditingItemDescription('');
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add item
                    </Button>
                  </div>
                </motion.div>
              );
            })}

            {isAddingList ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="shrink-0 w-80"
              >
                <div className="border border-dashed border-border rounded-xl p-4 bg-muted/20 h-full min-h-[200px] flex flex-col">
                  <Input
                    placeholder="List name"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateList();
                      if (e.key === 'Escape') {
                        setIsAddingList(false);
                        setNewListName('');
                      }
                    }}
                    className="mb-2"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCreateList}
                      disabled={!newListName.trim()}
                    >
                      Create
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsAddingList(false);
                        setNewListName('');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="shrink-0 w-80"
              >
                <Button
                  variant="outline"
                  className="w-full h-12 border-dashed border-border"
                  onClick={() => setIsAddingList(true)}
                >
                  <Plus className="size-4 mr-2" />
                  New list
                </Button>
              </motion.div>
            )}
          </div>
        </DragDropContext>
        )}
      </div>

      <Dialog
        open={!!editingItem || !!addItemToListId}
        onOpenChange={(open) => {
          if (!open) {
            setEditingItem(null);
            setAddItemToListId(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit item' : 'Add item'}
            </DialogTitle>
          </DialogHeader>
          {(editingItem || addItemToListId) && (
            <div className="space-y-4 py-2 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={editingItemName}
                  onChange={(e) => setEditingItemName(e.target.value)}
                  className="mt-1"
                  placeholder="Item name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <div className="mt-1 rounded-lg border border-input overflow-hidden bg-card min-h-[140px]">
                  <TipTapEditor
                    content={editingItemDescription}
                    onChange={(html) => setEditingItemDescription(html)}
                    placeholder="Description (optional)"
                    editable={true}
                    allowImages={true}
                    className="min-h-[120px]"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingItem(null);
                setAddItemToListId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                editingItem ? handleUpdateItem() : handleAddItemFromModal()
              }
              disabled={!editingItemName.trim()}
            >
              {editingItem ? 'Save' : 'Add'}
            </Button>
            {editingItem && (
              <Button
                variant="destructive"
                onClick={() =>
                  handleDeleteItem(editingItem.listId, editingItem.item._id)
                }
              >
                Delete
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!viewingItem}
        onOpenChange={(open) => !open && setViewingItem(null)}
      >
        <DialogContent className="max-h-[90vh] flex flex-col max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {viewingItem?.item.name ?? 'View item'}
            </DialogTitle>
          </DialogHeader>
          {viewingItem && (
            <div className="space-y-3 py-2 overflow-y-auto flex-1 min-h-0">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="font-medium mt-0.5">{viewingItem.item.name}</p>
              </div>
              {viewingItem.item.description?.trim() ? (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Description
                  </p>
                  <div
                    className="text-sm text-foreground prose prose-sm prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-1 prose-img:rounded-lg prose-img:max-w-full"
                    dangerouslySetInnerHTML={{
                      __html: viewingItem.item.description,
                    }}
                  />
                </div>
              ) : null}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingItem(null)}>
              Close
            </Button>
            {viewingItem && (
              <Button
                onClick={() => {
                  setViewingItem(null);
                  setEditingItem({ listId: viewingItem.listId, item: viewingItem.item });
                  setEditingItemName(viewingItem.item.name);
                  setEditingItemDescription(
                    (() => {
                      const d = viewingItem.item.description || '';
                      if (!d.trim()) return '';
                      return d.trim().startsWith('<') ? d : `<p>${d}</p>`;
                    })()
                  );
                }}
              >
                Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {lists.length === 0 && !isAddingList && (
        <div className="absolute inset-0 flex items-center justify-center p-6 pt-24">
          <div className="text-center">
            <ListIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-xl font-semibold mb-2">No lists yet</h2>
            <p className="text-muted-foreground mb-6">
              Create a list to start adding items in kanban view
            </p>
            <Button onClick={() => setIsAddingList(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create your first list
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
