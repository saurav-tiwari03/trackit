'use client';

import { useEffect, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Clock,
  Flag,
  Tag,
  Timer,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/sonner';
import { Modal, ModalHeader, ModalContent } from '@/components/ui/modal';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);

  // Avoid rendering duplicate portalled popovers (mobile + desktop) at the same time.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)'); // Tailwind `lg`
    const apply = () => setIsDesktop(mq.matches);
    apply();
    // Safari <14 fallback
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else mq.addListener(apply);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', apply);
      else mq.removeListener(apply);
    };
  }, []);

  // Close portalled popovers when layout mode changes (prevents “two calendars”).
  useEffect(() => {
    setProjectOpen(false);
    setDateOpen(false);
  }, [isDesktop]);

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

  // Update initial values when props change OR when opening.
  // (If we reset form on close, props may be unchanged next time; still want defaults prefilled.)
  useEffect(() => {
    if (!isOpen) return;
    if (initialProjectId) setSelectedProjectId(initialProjectId);
    if (initialSectionId) setSelectedSectionId(initialSectionId);
    if (initialDueDate) setDueDate(new Date(initialDueDate));
  }, [isOpen, initialProjectId, initialSectionId, initialDueDate]);

  const selectedProject = projects.find(p => p._id === selectedProjectId);

  const handleCreate = async () => {
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
      <div className="flex flex-col lg:flex-row h-dvh sm:h-[85vh]">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <ModalHeader onClose={handleClose}>Create Task</ModalHeader>

          <ModalContent className="flex-1 overflow-y-auto">
            {/* Title (top on mobile) */}
            <div className="mb-6 rounded-2xl border border-border/50 bg-card/40 p-4">
              <div className="text-sm font-medium text-muted-foreground mb-2">Title</div>
              <Input
                placeholder="Task title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus
                className="h-11"
              />
            </div>

            {/* Description (top on mobile) */}
            <div className="mb-6 rounded-2xl border border-border/50 bg-card/40 p-4">
              <div className="text-sm font-medium text-muted-foreground mb-3">
                Description
              </div>
              <TipTapEditor
                content={description}
                onChange={setDescription}
                placeholder="Add more details..."
                className="text-foreground min-h-[160px]"
              />
            </div>

            {/* Mobile: Task Details AFTER title/description */}
            <div className="lg:hidden mb-6">
              <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn('w-2 h-2 rounded-full', priorityColors[priority])}
                    />
                    <span className="text-sm font-medium">Task Details</span>
                    {dueDate && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(dueDate, 'MMM d')}
                      </span>
                    )}
                  </div>
                  {isDetailsOpen ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="mt-3 p-4 bg-muted/30 rounded-xl space-y-4">
                    {/* Project (optional) */}
                    {showProjectSelector && !isDesktop && (
                      <div className="rounded-xl border border-border/50 bg-card/30 p-3">
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                          Project
                        </div>
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
                                            selectedProjectId === project._id
                                              ? 'opacity-100'
                                              : 'opacity-0'
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

                    {/* Priority */}
                    <div>
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                        <Flag className="w-3 h-3" />
                        Priority
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(['P1', 'P2', 'P3', 'P4'] as const).map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPriority(p)}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                              priority === p
                                ? cn(priorityColors[p], 'text-white shadow-sm')
                                : 'bg-muted text-muted-foreground hover:bg-accent'
                            )}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Section/Status */}
                    <div className="rounded-xl border border-border/50 bg-card/30 p-3">
                      <div className="text-xs font-medium text-muted-foreground mb-2">Status</div>
                      <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                        <SelectTrigger className="w-full h-8">
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

                    {/* Due Date & Time (mobile only; prevent duplicate portalled calendars) */}
                    {!isDesktop && (
                      <div className="rounded-xl border border-border/50 bg-card/30 p-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                          <CalendarIcon className="w-3 h-3" />
                          Due Date & Time
                        </div>
                        <Popover open={dateOpen} onOpenChange={setDateOpen} modal={true}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={cn(
                                'w-full justify-start text-left font-normal overflow-hidden',
                                !dueDate && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              <span className="truncate">
                                {dueDate ? format(dueDate, 'PPP p') : 'Pick date & time'}
                              </span>
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
                                <Timer className="h-4 w-4 text-muted-foreground" />
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
                              <Button type="button" size="sm" onClick={() => setDateOpen(false)}>
                                Done
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}

                    {/* Labels */}
                    <div className="rounded-xl border border-border/50 bg-card/30 p-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                        <Tag className="w-3 h-3" />
                        Labels
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={labelInput}
                          onChange={(e) => setLabelInput(e.target.value)}
                          placeholder="Add label…"
                          className="h-8"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addLabel(labelInput);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={!labelInput.trim()}
                          onClick={() => addLabel(labelInput)}
                        >
                          Add
                        </Button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
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
                                aria-label="Remove label"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </ModalContent>

          {/* Mobile sticky actions (always bottom) */}
          <div className="lg:hidden border-t bg-background/95 backdrop-blur px-4 py-3 flex items-center gap-3">
            <Button type="button" variant="ghost" className="flex-1" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={() => void handleCreate()}
              disabled={isLoading || !title.trim() || !selectedProjectId || !selectedSectionId}
            >
              {isLoading ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </div>

        {/* Desktop Sidebar (match TaskModal) */}
        <div className="hidden lg:block w-72 border-l p-4 bg-muted/30 overflow-hidden shrink-0">
          <div className="space-y-5">
            {/* Project (optional) */}
            {showProjectSelector && isDesktop && (
              <div className="rounded-xl border border-border/50 bg-card/30 p-3">
                <div className="text-xs font-medium text-muted-foreground mb-2">Project</div>
                <Popover open={projectOpen} onOpenChange={setProjectOpen} modal={true}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
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
                                    selectedProjectId === project._id
                                      ? 'opacity-100'
                                      : 'opacity-0'
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

            {/* Priority */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Flag className="w-3 h-3" />
                Priority
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(['P1', 'P2', 'P3', 'P4'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      priority === p
                        ? cn(priorityColors[p], 'text-white shadow-sm')
                        : 'bg-muted text-muted-foreground hover:bg-accent'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Section/Status */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Status</h4>
              <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
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

            {/* Due Date & Time (desktop only; prevent duplicate portalled calendars) */}
            {isDesktop && (
              <div className="rounded-xl border border-border/50 bg-card/30 p-3">
                <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <CalendarIcon className="w-3 h-3" />
                  Due Date & Time
                </h4>
                <Popover open={dateOpen} onOpenChange={setDateOpen} modal={true}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        'w-full justify-start text-left font-normal overflow-hidden',
                        !dueDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      <span className="truncate">
                        {dueDate ? format(dueDate, 'PPP p') : 'Pick date & time'}
                      </span>
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
                        <Timer className="h-4 w-4 text-muted-foreground" />
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
                      <Button type="button" size="sm" onClick={() => setDateOpen(false)}>
                        Done
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Labels */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Tag className="w-3 h-3" />
                Labels
              </h4>
              <div className="flex gap-2">
                <Input
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  placeholder="Add label…"
                  className="h-8"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addLabel(labelInput);
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!labelInput.trim()}
                  onClick={() => addLabel(labelInput)}
                >
                  Add
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
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
                        aria-label="Remove label"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t space-y-2">
              <Button type="button" variant="ghost" className="w-full" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="button"
                className="w-full"
                onClick={() => void handleCreate()}
                disabled={isLoading || !title.trim() || !selectedProjectId || !selectedSectionId}
              >
                {isLoading ? 'Creating…' : 'Create Task'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
