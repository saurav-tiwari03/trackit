'use client';

import { create } from 'zustand';
import { Project, Task, TaskStats } from '@/types';
import { projectsAPI, tasksAPI } from '@/lib/api';
import { offlineProjectsAPI, offlineTasksAPI } from '@/lib/offline-api';

interface ProjectsState {
  projects: Project[];
  currentProject: Project | null;
  tasks: Task[];
  stats: TaskStats | null;
  isLoading: boolean;
  isOffline: boolean;
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  createProject: (data: { name: string; description?: string; color?: string }) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  leaveProject: (id: string) => Promise<void>;
  addSection: (projectId: string, name: string, color?: string) => Promise<void>;
  inviteToProject: (projectId: string, email: string) => Promise<Project>;
  fetchStats: () => Promise<void>;
  createTask: (data: {
    title: string;
    description?: string;
    project: string;
    section: string;
    priority?: string;
    dueDate?: string;
    labels?: string[];
  }) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  moveTask: (id: string, section: string, order: number) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  currentProject: null,
  tasks: [],
  stats: null,
  isLoading: false,
  isOffline: false,

  fetchProjects: async () => {
    set({ isLoading: true });
    try {
      // Use offline-aware API
      const result = await offlineProjectsAPI.getAll();
      set({ 
        projects: result.data.data as unknown as Project[], 
        isLoading: false,
        isOffline: result.fromCache,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchProject: async (id: string) => {
    set({ isLoading: true });
    try {
      // Use offline-aware API
      const result = await offlineProjectsAPI.getOne(id);
      const project = result.data.data;
      set({
        currentProject: project as unknown as Project,
        tasks: (project.tasks || []) as unknown as Task[],
        isLoading: false,
        isOffline: result.fromCache,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  createProject: async (data) => {
    const response = await projectsAPI.create(data);
    const project = response.data.data;
    set(state => ({
      projects: [project, ...state.projects],
    }));
    return project;
  },

  updateProject: async (id, data) => {
    const response = await projectsAPI.update(id, data);
    const updatedProject = response.data.data;
    set(state => ({
      projects: state.projects.map(p =>
        p._id === id ? updatedProject : p
      ),
      currentProject:
        state.currentProject?._id === id
          ? { ...state.currentProject, ...updatedProject }
          : state.currentProject,
    }));
  },

  deleteProject: async (id) => {
    await projectsAPI.delete(id);
    set(state => ({
      projects: state.projects.filter(p => p._id !== id),
      currentProject:
        state.currentProject?._id === id ? null : state.currentProject,
    }));
  },

  leaveProject: async (id) => {
    await projectsAPI.leave(id);
    set(state => ({
      projects: state.projects.filter(p => p._id !== id),
      currentProject: state.currentProject?._id === id ? null : state.currentProject,
      tasks: state.currentProject?._id === id ? [] : state.tasks,
    }));
  },

  addSection: async (projectId, name, color) => {
    const response = await projectsAPI.addSection(projectId, { name, color });
    const updatedProject = response.data.data;
    set(state => ({
      projects: state.projects.map(p =>
        p._id === projectId ? { ...p, ...updatedProject } : p
      ),
      currentProject:
        state.currentProject?._id === projectId
          ? {
            ...state.currentProject,
            ...updatedProject,
            // keep tasks if backend doesn't include them on section update
            tasks: state.currentProject.tasks || [],
          }
          : state.currentProject,
    }));
  },

  inviteToProject: async (projectId, email) => {
    const response = await projectsAPI.invite(projectId, { email });
    const updatedProject = response.data.data;
    set(state => ({
      projects: state.projects.map(p =>
        p._id === projectId ? { ...p, ...updatedProject } : p
      ),
      currentProject:
        state.currentProject?._id === projectId
          ? { ...state.currentProject, ...updatedProject }
          : state.currentProject,
    }));
    return updatedProject;
  },

  fetchStats: async () => {
    try {
      const response = await tasksAPI.getStats();
      set({ stats: response.data.data });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  },

  createTask: async (data) => {
    const response = await tasksAPI.create(data);
    const task = response.data.data;
    set(state => ({
      tasks: [...state.tasks, task],
    }));
    return task;
  },

  updateTask: async (id, data) => {
    try {
      // Use offline-aware API
      const result = await offlineTasksAPI.update(id, data);
      const updatedTask = result.data.data;
      set(state => ({
        tasks: state.tasks.map(t => (t._id === id ? updatedTask as unknown as Task : t)),
        isOffline: result.offline,
      }));
    } catch (error) {
      // Fallback to online API if offline API fails
      const response = await tasksAPI.update(id, data);
      const updatedTask = response.data.data;
      set(state => ({
        tasks: state.tasks.map(t => (t._id === id ? updatedTask : t)),
      }));
    }
  },

  moveTask: async (id, section, order) => {
    // Optimistic update - update local state immediately
    const currentTasks = get().tasks;
    const taskToMove = currentTasks.find(t => t._id === id);

    if (!taskToMove) return;

    const oldSection = taskToMove.section;

    // Create updated tasks array with new order
    const updatedTasks = currentTasks.map(task => {
      if (task._id === id) {
        // Update the moved task
        return { ...task, section, order };
      }

      if (task.section === section && task._id !== id) {
        // Shift other tasks in the destination section
        if (oldSection === section) {
          // Moving within same section
          const oldOrder = taskToMove.order;
          if (order > oldOrder && task.order > oldOrder && task.order <= order) {
            return { ...task, order: task.order - 1 };
          } else if (order < oldOrder && task.order >= order && task.order < oldOrder) {
            return { ...task, order: task.order + 1 };
          }
        } else {
          // Moving to different section - shift tasks at and after the drop position
          if (task.order >= order) {
            return { ...task, order: task.order + 1 };
          }
        }
      }

      return task;
    });

    // Apply optimistic update
    set({ tasks: updatedTasks });

    try {
      // Sync with server
      await tasksAPI.move(id, { section, order });
    } catch (error) {
      // Rollback on error
      set({ tasks: currentTasks });
      throw error;
    }
  },

  deleteTask: async (id) => {
    try {
      // Use offline-aware API
      const result = await offlineTasksAPI.delete(id);
      set(state => ({
        tasks: state.tasks.filter(t => t._id !== id),
        isOffline: result.offline,
      }));
    } catch (error) {
      // Fallback to online API
      await tasksAPI.delete(id);
      set(state => ({
        tasks: state.tasks.filter(t => t._id !== id),
      }));
    }
  },

  setCurrentProject: (project) => {
    set({ currentProject: project, tasks: project?.tasks || [] });
  },
}));

