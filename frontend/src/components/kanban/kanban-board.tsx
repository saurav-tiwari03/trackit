'use client';

import { useState, useCallback } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DragStart,
} from '@hello-pangea/dnd';
import { motion } from 'framer-motion';
import { Plus, MoreHorizontal, Pencil } from 'lucide-react';
import { Project, Task } from '@/types';
import { useProjectsStore } from '@/store/projects';
import { KanbanCard } from './kanban-card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface KanbanBoardProps {
  project: Project;
  onTaskClick: (task: Task) => void;
  onCreateTask: (sectionId: string) => void;
}

// Section names that indicate completion
const COMPLETED_SECTION_NAMES = ['completed', 'done', 'finished'];

export function KanbanBoard({ project, onTaskClick, onCreateTask }: KanbanBoardProps) {
  const { tasks, moveTask, updateTask } = useProjectsStore();
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  const findSectionForQuickStatus = useCallback(
    (next: 'open' | 'in_progress' | 'completed') => {
      const sections = project.sections || [];
      const byName = (pred: (n: string) => boolean) =>
        sections.find(s => pred(s.name.toLowerCase()));

      if (next === 'in_progress') {
        return (
          byName(n => n.includes('in progress') || n.includes('progress')) || sections[0]
        );
      }
      if (next === 'completed') {
        return (
          byName(n => COMPLETED_SECTION_NAMES.includes(n) || n.includes('done')) ||
          sections[sections.length - 1]
        );
      }
      // open -> To Do
      return byName(n => n.includes('to do') || n === 'todo' || n.includes('backlog')) || sections[0];
    },
    [project.sections]
  );

  const quickSetStatus = useCallback(
    async (taskId: string, next: 'open' | 'in_progress' | 'completed') => {
      const section = findSectionForQuickStatus(next);
      if (!section) return;
      try {
        // move to the top of the target column
        await moveTask(taskId, section._id, 0);
        await updateTask(taskId, {
          status: next,
          isCompleted: next === 'completed',
        });
        toast.success('Task status updated');
      } catch (error) {
        console.error('Failed to update status:', error);
        toast.error('Failed to update task status');
      }
    },
    [findSectionForQuickStatus, moveTask, updateTask]
  );

  const handleDragStart = useCallback((start: DragStart) => {
    setDraggingTaskId(start.draggableId);
  }, []);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    setDraggingTaskId(null);

    const { destination, source, draggableId } = result;

    // If no destination, do nothing
    if (!destination) return;

    // If dropped in the same place, do nothing
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newSectionId = destination.droppableId;
    const newOrder = destination.index;

    // Find the destination section to check if it's a "completed" section
    const destinationSection = project.sections.find(s => s._id === newSectionId);
    const isCompletedSection = destinationSection &&
      COMPLETED_SECTION_NAMES.includes(destinationSection.name.toLowerCase());

    try {
      await moveTask(draggableId, newSectionId, newOrder);

      // Auto-complete task if dropped in "Completed" section
      if (isCompletedSection) {
        await updateTask(draggableId, { isCompleted: true, status: 'completed' });
      }
    } catch (error) {
      console.error('Failed to move task:', error);
    }
  }, [moveTask, updateTask, project.sections]);

  const getTasksForSection = useCallback((sectionId: string) => {
    return tasks
      .filter(task => task.section === sectionId)
      .sort((a, b) => a.order - b.order);
  }, [tasks]);

  // Helper to get display name (rename "Done" to "Completed")
  const getSectionDisplayName = (name: string) => {
    if (name.toLowerCase() === 'done') return 'Completed';
    return name;
  };

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 p-6 h-full overflow-x-auto min-h-[calc(100vh-120px)]">
        {project.sections
          .sort((a, b) => a.order - b.order)
          .map((section, index) => {
            const sectionTasks = getTasksForSection(section._id);
            const isCompletedSection = COMPLETED_SECTION_NAMES.includes(section.name.toLowerCase());

            return (
              <motion.div
                key={section._id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
                className="shrink-0 w-80"
              >
                <div className="bg-card/50 border border-border rounded-xl p-3 h-full flex flex-col max-h-[calc(100vh-160px)]">
                  {/* Section Header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: section.color }}
                      />
                      <h3 className="font-medium text-sm">
                        {getSectionDisplayName(section.name)}
                      </h3>
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {sectionTasks.length}
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit section
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Tasks Droppable Area */}
                  <Droppable droppableId={section._id} type="TASK">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          'flex-1 space-y-2 rounded-lg p-1 overflow-y-auto transition-colors duration-200',
                          'min-h-[120px]',
                          snapshot.isDraggingOver && (
                            isCompletedSection
                              ? 'bg-green-500/10 ring-2 ring-green-500/30'
                              : 'bg-primary/10 ring-2 ring-primary/30'
                          )
                        )}
                      >
                        {sectionTasks.map((task, taskIndex) => (
                          <Draggable
                            key={task._id}
                            draggableId={task._id}
                            index={taskIndex}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  'transition-transform duration-150',
                                  snapshot.isDragging && 'z-50'
                                )}
                                style={{
                                  ...provided.draggableProps.style,
                                }}
                              >
                                <KanbanCard
                                  task={task}
                                  onClick={() => !snapshot.isDragging && onTaskClick(task)}
                                  onQuickStatusChange={(next) => void quickSetStatus(task._id, next)}
                                  isDragging={snapshot.isDragging}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>

                  {/* Add Task Button */}
                  <Button
                    variant="ghost"
                    className="w-full justify-start mt-2 text-muted-foreground hover:text-foreground"
                    onClick={() => onCreateTask(section._id)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add task
                  </Button>
                </div>
              </motion.div>
            );
          })}

        {/* Add Section Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="shrink-0 w-80"
        >
          <Button
            variant="outline"
            className="w-full h-12 border-dashed border-border"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add section
          </Button>
        </motion.div>
      </div>
    </DragDropContext>
  );
}
