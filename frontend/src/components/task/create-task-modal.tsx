'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Calendar as CalendarIcon, Clock, Tag, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/sonner';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const [labels, setLabels] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState('');

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
        labels: labels.length > 0 ? labels : undefined,
      });
      await fetchProject(selectedProjectId);
      toast.success('Task created successfully');
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to create task:', error);
      toast.error('Failed to create task');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('P4');
    setDueDate(undefined);
    setLabels([]);
    setLabelInput('');
    if (showProjectSelector) {
      setSelectedProjectId('');
      setSelectedSectionId('');
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const addLabel = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    const next = value.replace(/\s+/g, ' ');
    setLabels((prev) => (prev.includes(next) ? prev : [...prev, next]));
    setLabelInput('');
  };

  const removeLabel = (label: string) => {
    setLabels((prev) => prev.filter((l) => l !== label));
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <form onSubmit={handleSubmit}>
        <ModalHeader onClose={handleClose}>Create New Task</ModalHeader>

        <ModalContent className="p-0 overflow-hidden">
          <div className="flex flex-col lg:flex-row h-full">
            {/* Left: main content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 min-w-0">
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
                <div className="rounded-xl border border-border/50 bg-card/40 p-4">
                  <label className="block text-sm font-medium mb-2">
                    Project
                  </label>
                  <Popover open={projectOpen} onOpenChange={setProjectOpen} modal={true}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={projectOpen}
                        className="w-full justify-between"
                      >
                        {selectedProject ? (
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: selectedProject.color }}
                            />
                            <span className="truncate">{selectedProject.name}</span>
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
                            {projects
                              .filter((project) => project.name !== 'Inbox')
                              .map((project) => (
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

              {/* Description (make clearly visible) */}
              <div className="rounded-xl border border-border/50 bg-card/40 p-4">
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <TipTapEditor
                  content={description}
                  onChange={setDescription}
                  placeholder="Add more details..."
                  className="text-foreground min-h-[160px]"
                />
              </div>
            </div>

            {/* Right: sidebar controls (like Task modal) */}
            <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l bg-muted/30 p-4 overflow-y-auto shrink-0 space-y-4">
              {/* Priority */}
              <div className="rounded-xl border border-border/50 bg-card/40 p-4">
                <div className="text-xs font-medium text-muted-foreground mb-2">Priority</div>
                <div className="flex gap-2">
                  {(['P1', 'P2', 'P3', 'P4'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={cn(
                        'flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer',
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

              {/* Status/Section (bordered) */}
              <div className="rounded-xl border border-border/50 bg-card/40 p-4">
                <div className="text-xs font-medium text-muted-foreground mb-2">Status</div>
                <Select
                  value={selectedSectionId}
                  onValueChange={setSelectedSectionId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {(selectedProject?.sections || []).map((section) => (
                      <SelectItem key={section._id} value={section._id}>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: section.color }}
                          />
                          {section.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date & Time (bordered) */}
              <div className="rounded-xl border border-border/50 bg-card/40 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  Due Date & Time
                </div>
                <Popover open={dateOpen} onOpenChange={setDateOpen} modal={true}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !dueDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, 'PPP p') : 'Pick date & time'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 overflow-hidden" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={(date) => {
                        if (date) {
                          const hours = dueDate?.getHours() || 9;
                          const minutes = dueDate?.getMinutes() || 0;
                          date.setHours(hours, minutes, 0, 0);
                          setDueDate(new Date(date));
                        } else {
                          setDueDate(undefined);
                        }
                      }}
                      initialFocus
                    />
                    <div className="border-t p-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <input
                          type="time"
                          value={dueDate ? format(dueDate, 'HH:mm') : '09:00'}
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(':').map(Number);
                            const newDate = dueDate ? new Date(dueDate) : new Date();
                            newDate.setHours(hours, minutes, 0, 0);
                            setDueDate(newDate);
                          }}
                          className="flex-1 bg-transparent border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                    <div className="border-t p-2 flex justify-between">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDueDate(undefined);
                          setDateOpen(false);
                        }}
                      >
                        Clear
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setDateOpen(false)}
                      >
                        Done
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Labels (bordered) */}
              <div className="rounded-xl border border-border/50 bg-card/40 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                  <Tag className="h-3.5 w-3.5" />
                  Labels
                </div>
                <div className="flex gap-2">
                  <Input
                    value={labelInput}
                    onChange={(e) => setLabelInput(e.target.value)}
                    placeholder="Add label…"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addLabel(labelInput);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => addLabel(labelInput)}
                    disabled={!labelInput.trim()}
                  >
                    Add
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {labels.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No labels</span>
                  ) : (
                    labels.map((label) => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
                      >
                        {label}
                        <button
                          type="button"
                          onClick={() => removeLabel(label)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
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
