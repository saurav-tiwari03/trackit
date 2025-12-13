'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Modal, ModalHeader, ModalContent, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TipTapEditor } from '@/components/ui/tiptap-editor';
import { useProjectsStore } from '@/store/projects';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  sectionId?: string;
  initialDueDate?: string;
  showProjectSelector?: boolean;
}

const priorityColors: Record<string, string> = {
  P1: 'bg-red-500',
  P2: 'bg-orange-500',
  P3: 'bg-yellow-500',
  P4: 'bg-gray-400',
};

export function CreateTaskModal({
  isOpen,
  onClose,
  projectId: initialProjectId,
  sectionId: initialSectionId,
  initialDueDate,
  showProjectSelector = false,
}: CreateTaskModalProps) {
  const { projects, createTask, fetchProject } = useProjectsStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('P4');
  const [dueDate, setDueDate] = useState<Date | undefined>(
    initialDueDate ? new Date(initialDueDate) : undefined
  );
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || '');
  const [selectedSectionId, setSelectedSectionId] = useState(initialSectionId || '');
  const [projectOpen, setProjectOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  // Auto-select project if only one exists
  useEffect(() => {
    if (showProjectSelector && projects.length === 1 && !selectedProjectId) {
      setSelectedProjectId(projects[0]._id);
      if (projects[0].sections.length > 0) {
        setSelectedSectionId(projects[0].sections[0]._id);
      }
    }
  }, [projects, showProjectSelector, selectedProjectId]);

  // Update section when project changes
  useEffect(() => {
    if (selectedProjectId) {
      const project = projects.find(p => p._id === selectedProjectId);
      if (project && project.sections.length > 0) {
        setSelectedSectionId(project.sections[0]._id);
      }
    }
  }, [selectedProjectId, projects]);

  // Update initial values when props change
  useEffect(() => {
    if (initialProjectId) setSelectedProjectId(initialProjectId);
    if (initialSectionId) setSelectedSectionId(initialSectionId);
    if (initialDueDate) setDueDate(new Date(initialDueDate));
  }, [initialProjectId, initialSectionId, initialDueDate]);

  const selectedProject = projects.find(p => p._id === selectedProjectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedProjectId || !selectedSectionId) return;

    setIsLoading(true);
    try {
      await createTask({
        title,
        description,
        project: selectedProjectId,
        section: selectedSectionId,
        priority,
        dueDate: dueDate ? dueDate.toISOString() : undefined,
      });
      await fetchProject(selectedProjectId);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('P4');
    setDueDate(undefined);
    if (showProjectSelector) {
      setSelectedProjectId('');
      setSelectedSectionId('');
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <form onSubmit={handleSubmit}>
        <ModalHeader onClose={handleClose}>Create New Task</ModalHeader>

        <ModalContent>
          <div className="space-y-4">
            <Input
              placeholder="Task title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              autoFocus
              className="text-lg font-medium border-0 border-b rounded-none px-0 focus-visible:ring-0"
            />

            {/* Project Selector */}
            {showProjectSelector && (
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Project
                </label>
                <Popover open={projectOpen} onOpenChange={setProjectOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={projectOpen}
                      className="w-full justify-between"
                    >
                      {selectedProject ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: selectedProject.color }}
                          />
                          {selectedProject.name}
                        </div>
                      ) : (
                        'Select project...'
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search project..." />
                      <CommandList>
                        <CommandEmpty>No project found.</CommandEmpty>
                        <CommandGroup>
                          {projects.map((project) => (
                            <CommandItem
                              key={project._id}
                              value={project.name}
                              onSelect={() => {
                                setSelectedProjectId(project._id);
                                setProjectOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  selectedProjectId === project._id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <span
                                className="h-3 w-3 rounded-full shrink-0 mr-2"
                                style={{ backgroundColor: project.color }}
                              />
                              {project.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Section Selector - only show if project is selected */}
            {selectedProject && selectedProject.sections.length > 1 && (
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Section
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedProject.sections.map((section) => (
                    <button
                      key={section._id}
                      type="button"
                      onClick={() => setSelectedSectionId(section._id)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                        selectedSectionId === section._id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-accent'
                      )}
                    >
                      {section.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Description
              </label>
              <TipTapEditor
                content={description}
                onChange={setDescription}
                placeholder="Add more details..."
              />
            </div>

            <div className="flex gap-4">
              {/* Priority */}
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1.5">
                  Priority
                </label>
                <div className="flex gap-1">
                  {(['P1', 'P2', 'P3', 'P4'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={cn(
                        'flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                        priority === p
                          ? cn(priorityColors[p], 'text-white')
                          : 'bg-muted text-muted-foreground hover:bg-accent'
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Due Date */}
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1.5">
                  Due Date
                </label>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !dueDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={(date) => {
                        setDueDate(date);
                        setDateOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </ModalContent>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading || !title.trim() || !selectedProjectId || !selectedSectionId}
          >
            {isLoading ? 'Creating...' : 'Create Task'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
