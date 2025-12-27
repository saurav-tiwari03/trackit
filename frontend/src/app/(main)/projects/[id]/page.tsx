'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Settings, Info, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useProjectsStore } from '@/store/projects';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { TaskModal } from '@/components/task/task-modal';
import { CreateTaskModal } from '@/components/task/create-task-modal';
import { ProjectSettingsModal } from '@/components/project/project-settings-modal';
import { TipTapViewer } from '@/components/ui/tiptap-editor';
import { Task } from '@/types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { currentProject, fetchProject, isLoading } = useProjectsStore();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [createSectionId, setCreateSectionId] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId);
    }
  }, [projectId, fetchProject]);

  const handleCreateTask = (sectionId: string) => {
    setCreateSectionId(sectionId);
    setIsCreateModalOpen(true);
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
    // Refresh project data after settings change
    if (projectId) {
      fetchProject(projectId);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get all members including owner (handle both id and _id fields)
  const getIdFromMember = (member: { id?: string; _id?: string }) => member.id || (member as unknown as { _id: string })._id;

  const allMembers = currentProject ? [
    currentProject.owner,
    ...currentProject.members.filter(m => getIdFromMember(m) !== getIdFromMember(currentProject.owner))
  ] : [];

  if (isLoading || !currentProject) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b px-6 py-4">
          <h1 className="text-lg font-semibold">Loading...</h1>
        </div>
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-muted border-t-foreground rounded-full"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
              style={{ backgroundColor: currentProject.color + '20' }}
            >
              {currentProject.icon || '📋'}
            </div>
            <div>
              <h1 className="text-lg font-semibold">{currentProject.name}</h1>
              {currentProject.description && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                      <Info className="w-3 h-3" />
                      View description
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96 max-h-64 overflow-y-auto" align="start">
                    <TipTapViewer content={currentProject.description} />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Members */}
            {allMembers.length > 0 && (
              <TooltipProvider>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {allMembers.slice(0, 5).map((member, index) => (
                      <Tooltip key={getIdFromMember(member)}>
                        <TooltipTrigger asChild>
                          <Avatar
                            className="w-8 h-8 border-2 border-background cursor-pointer hover:z-10 hover:scale-110 transition-transform"
                            style={{ zIndex: allMembers.length - index }}
                          >
                            <AvatarFallback
                              className="text-xs"
                              style={{
                                backgroundColor: `hsl(${(member.name.charCodeAt(0) * 37) % 360}, 70%, 50%)`,
                                color: 'white',
                              }}
                            >
                              {getInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                          {getIdFromMember(member) === getIdFromMember(currentProject.owner) && (
                            <p className="text-xs text-primary mt-1">Owner</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {allMembers.length > 5 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Avatar className="w-8 h-8 border-2 border-background cursor-pointer">
                            <AvatarFallback className="text-xs bg-muted">
                              +{allMembers.length - 5}
                            </AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{allMembers.length - 5} more members</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setIsSettingsOpen(true)}
                  >
                    <Users className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">{allMembers.length}</span>
                  </Button>
                </div>
              </TooltipProvider>
            )}

            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleCreateTask(currentProject.sections[0]?._id)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Task
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)}>
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          project={currentProject}
          onTaskClick={setSelectedTask}
          onCreateTask={handleCreateTask}
        />
      </div>

      {/* Task Detail Modal */}
      <TaskModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onOpenTask={setSelectedTask}
        onClose={() => {
          setSelectedTask(null);
          if (projectId) {
            fetchProject(projectId);
          }
        }}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setCreateSectionId(null);
        }}
        projectId={projectId}
        sectionId={createSectionId || ''}
      />

      {/* Project Settings Modal */}
      <ProjectSettingsModal
        project={currentProject}
        isOpen={isSettingsOpen}
        onClose={handleSettingsClose}
      />
    </div>
  );
}
