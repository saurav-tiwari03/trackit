'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, FolderKanban, MoreHorizontal, Trash2, Settings2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/sonner';
import { useProjectsStore } from '@/store/projects';
import { tasksAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface ProjectProgress {
  totalTasks: number;
  completedTasks: number;
  totalItems: number;
  completedItems: number;
}

export default function ProjectsPage() {
  const { projects, deleteProject, fetchProjects } = useProjectsStore();
  const { user } = useAuthStore();
  const [projectProgress, setProjectProgress] = useState<Record<string, ProjectProgress>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchProjectProgress();
  }, [projects]);

  const fetchProjectProgress = async () => {
    setIsLoading(true);
    try {
      const response = await tasksAPI.getAll();
      const tasks = response.data.data;

      const progress: Record<string, ProjectProgress> = {};

      // Initialize all projects with zero progress
      projects.forEach((project) => {
        progress[project._id] = {
          totalTasks: 0,
          completedTasks: 0,
          totalItems: 0,
          completedItems: 0,
        };
      });

      // Calculate progress from tasks
      tasks.forEach((task: any) => {
        const projectId = typeof task.project === 'string' ? task.project : task.project._id;
        if (!progress[projectId]) {
          progress[projectId] = {
            totalTasks: 0,
            completedTasks: 0,
            totalItems: 0,
            completedItems: 0,
          };
        }

        progress[projectId].totalTasks++;
        progress[projectId].totalItems++;

        if (task.isCompleted) {
          progress[projectId].completedTasks++;
          progress[projectId].completedItems++;
        }

        // Count subtasks
        if (task.subtasks && task.subtasks.length > 0) {
          progress[projectId].totalItems += task.subtasks.length;
          progress[projectId].completedItems += task.subtasks.filter(
            (s: any) => s.isCompleted
          ).length;
        }
      });

      setProjectProgress(progress);
    } catch (error) {
      console.error('Failed to fetch project progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    try {
      await deleteProject(projectToDelete.id);
      await fetchProjects();
      toast.success('Project deleted successfully');
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('Failed to delete project');
    }
  };

  const openDeleteDialog = (projectId: string, projectName: string) => {
    setProjectToDelete({ id: projectId, name: projectName });
    setDeleteDialogOpen(true);
  };

  const getProgressPercentage = (projectId: string) => {
    const progress = projectProgress[projectId];
    if (!progress || progress.totalItems === 0) return 0;
    return Math.round((progress.completedItems / progress.totalItems) * 100);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">Projects</h1>
            <p className="text-sm text-muted-foreground">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Link>
          </Button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="p-4 sm:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground mb-4">No projects yet</p>
            <Button asChild>
              <Link href="/projects/new">
                <Plus className="h-4 w-4 mr-2" />
                Create your first project
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project, index) => {
              const progress = projectProgress[project._id];
              const percentage = getProgressPercentage(project._id);
              const ownerId = (project.owner as any)?.id || (project.owner as any)?._id;
              const isOwner = !!user?.id && String(user.id) === String(ownerId);

              return (
                <motion.div
                  key={project._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link href={`/projects/${project._id}`}>
                    <Card className="p-4 hover:shadow-lg hover:border-border/80 transition-all cursor-pointer group">
                      {/* Project Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-10 w-10 rounded-lg flex items-center justify-center text-white text-lg"
                            style={{ backgroundColor: project.color }}
                          >
                            📋
                          </div>
                          <div>
                            <h3 className="font-semibold group-hover:text-primary transition-colors">
                              {project.name}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {project.description || 'No description'}
                            </p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.preventDefault()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/projects/${project._id}`}>
                                <Settings2 className="h-4 w-4 mr-2" />
                                Open Project
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.preventDefault();
                                if (!isOwner) return;
                                openDeleteDialog(project._id, project.name);
                              }}
                              className="text-destructive"
                              disabled={!isOwner}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {isOwner ? 'Delete' : 'Only owner can delete'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{percentage}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: project.color,
                            }}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {progress?.completedItems || 0} of {progress?.totalItems || 0} items
                        </p>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}

            {/* Add New Project Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: projects.length * 0.05 }}
            >
              <Link href="/projects/new">
                <Card className="p-4 h-full min-h-[160px] border-dashed hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary">
                  <Plus className="h-8 w-8" />
                  <span className="font-medium">New Project</span>
                </Card>
              </Link>
            </motion.div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{projectToDelete?.name}&quot;? All tasks in this project will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProjectToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
