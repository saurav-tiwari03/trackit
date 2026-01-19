'use client';

import { 
  initOfflineDB,
  saveNotesOffline,
  saveNoteOffline,
  getOfflineNotes,
  getOfflineNote,
  deleteOfflineNote,
  saveProjectsOffline,
  saveProjectOffline,
  getOfflineProjects,
  getOfflineProject,
  saveTasksOffline,
  saveTaskOffline,
  getOfflineTasks,
  deleteOfflineTask,
  saveFoldersOffline,
  getOfflineFolders,
  queuePendingAction,
  type OfflineNote,
  type OfflineTask,
  type OfflineProject,
  type OfflineFolder,
  type PendingActionType,
} from './offline-storage';
import { notesAPI, tasksAPI, projectsAPI, foldersAPI } from './api';

// Initialize offline database
let dbInitialized = false;

async function ensureDBInitialized() {
  if (!dbInitialized && typeof window !== 'undefined') {
    await initOfflineDB();
    dbInitialized = true;
  }
}

// Check if we're online
function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

// Generate a temporary offline ID
function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Queue an action for later sync
async function queueAction(
  type: PendingActionType,
  entityId: string,
  data: Record<string, unknown>
) {
  await ensureDBInitialized();
  await queuePendingAction({
    type,
    entityId,
    data,
    timestamp: Date.now(),
    retryCount: 0,
  });
}

// ==================== NOTES OFFLINE API ====================

export const offlineNotesAPI = {
  // Get all notes - tries network first, falls back to cache
  async getAll(params?: {
    search?: string;
    project?: string;
    folder?: string;
    noFolder?: boolean;
    tag?: string;
    isPinned?: boolean;
    isFavorite?: boolean;
    isArchived?: boolean;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ data: { data: OfflineNote[] }; fromCache: boolean }> {
    await ensureDBInitialized();

    if (isOnline()) {
      try {
        const response = await notesAPI.getAll(params);
        const notes = response.data.data;
        // Cache the notes
        await saveNotesOffline(notes);
        return { data: { data: notes }, fromCache: false };
      } catch (error) {
        console.log('[Offline] Network failed, using cached notes');
      }
    }

    // Fallback to cached notes
    const cachedNotes = await getOfflineNotes({
      folderId: params?.folder,
      projectId: params?.project,
      search: params?.search,
      isFavorite: params?.isFavorite,
      isArchived: params?.isArchived,
    });

    return { data: { data: cachedNotes }, fromCache: true };
  },

  // Get single note
  async getOne(id: string): Promise<{ data: { data: OfflineNote }; fromCache: boolean }> {
    await ensureDBInitialized();

    if (isOnline()) {
      try {
        const response = await notesAPI.getOne(id);
        const note = response.data.data;
        // Cache the note
        await saveNoteOffline(note);
        return { data: { data: note }, fromCache: false };
      } catch (error) {
        console.log('[Offline] Network failed, using cached note');
      }
    }

    // Fallback to cached note
    const cachedNote = await getOfflineNote(id);
    if (!cachedNote) {
      throw new Error('Note not found in offline cache');
    }

    return { data: { data: cachedNote }, fromCache: true };
  },

  // Create a note
  async create(data: {
    title?: string;
    content?: string;
    plainText?: string;
    project?: string;
    folder?: string;
    color?: string;
    tags?: string[];
  }): Promise<{ data: { data: OfflineNote }; offline: boolean }> {
    await ensureDBInitialized();

    if (isOnline()) {
      try {
        const response = await notesAPI.create(data);
        const note = response.data.data;
        await saveNoteOffline(note);
        return { data: { data: note }, offline: false };
      } catch (error) {
        console.log('[Offline] Create failed, saving offline');
      }
    }

    // Create note offline
    const tempId = generateTempId();
    const now = new Date().toISOString();
    const offlineNote: OfflineNote = {
      _id: tempId,
      title: data.title || 'Untitled',
      content: data.content || '',
      plainText: data.plainText || '',
      user: '',
      project: undefined,
      folder: undefined,
      color: data.color,
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      tags: data.tags || [],
      lastEditedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await saveNoteOffline(offlineNote);
    await queueAction('CREATE_NOTE', tempId, data);

    return { data: { data: offlineNote }, offline: true };
  },

  // Update a note
  async update(
    id: string,
    data: {
      title?: string;
      content?: string;
      plainText?: string;
      project?: string;
      folder?: string;
      color?: string;
      tags?: string[];
    }
  ): Promise<{ data: { data: OfflineNote }; offline: boolean }> {
    await ensureDBInitialized();

    if (isOnline()) {
      try {
        const response = await notesAPI.update(id, data);
        const note = response.data.data;
        await saveNoteOffline(note);
        return { data: { data: note }, offline: false };
      } catch (error) {
        console.log('[Offline] Update failed, saving offline');
      }
    }

    // Update note offline
    const existingNote = await getOfflineNote(id);
    if (!existingNote) {
      throw new Error('Note not found');
    }

    // Only update fields that are provided, keeping existing structure
    const updatedNote: OfflineNote = {
      ...existingNote,
      title: data.title ?? existingNote.title,
      content: data.content ?? existingNote.content,
      plainText: data.plainText ?? existingNote.plainText,
      color: data.color ?? existingNote.color,
      tags: data.tags ?? existingNote.tags,
      // Keep project and folder as-is (don't update from string)
      lastEditedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveNoteOffline(updatedNote);
    await queueAction('UPDATE_NOTE', id, data);

    return { data: { data: updatedNote }, offline: true };
  },

  // Delete a note
  async delete(id: string): Promise<{ offline: boolean }> {
    await ensureDBInitialized();

    if (isOnline()) {
      try {
        await notesAPI.delete(id);
        await deleteOfflineNote(id);
        return { offline: false };
      } catch (error) {
        console.log('[Offline] Delete failed, queuing for later');
      }
    }

    // Delete offline and queue
    await deleteOfflineNote(id);
    await queueAction('DELETE_NOTE', id, {});

    return { offline: true };
  },

  // Toggle pin (works same as update)
  async togglePin(id: string): Promise<{ data: { data: OfflineNote }; offline: boolean }> {
    await ensureDBInitialized();

    const note = await getOfflineNote(id);
    if (!note) {
      throw new Error('Note not found');
    }

    if (isOnline()) {
      try {
        const response = await notesAPI.togglePin(id);
        const updatedNote = response.data.data;
        await saveNoteOffline(updatedNote);
        return { data: { data: updatedNote }, offline: false };
      } catch (error) {
        console.log('[Offline] Toggle pin failed, saving offline');
      }
    }

    // Toggle offline
    const updatedNote: OfflineNote = {
      ...note,
      isPinned: !note.isPinned,
      updatedAt: new Date().toISOString(),
    };

    await saveNoteOffline(updatedNote);
    await queueAction('UPDATE_NOTE', id, { isPinned: updatedNote.isPinned });

    return { data: { data: updatedNote }, offline: true };
  },

  // Toggle favorite
  async toggleFavorite(id: string): Promise<{ data: { data: OfflineNote }; offline: boolean }> {
    await ensureDBInitialized();

    const note = await getOfflineNote(id);
    if (!note) {
      throw new Error('Note not found');
    }

    if (isOnline()) {
      try {
        const response = await notesAPI.toggleFavorite(id);
        const updatedNote = response.data.data;
        await saveNoteOffline(updatedNote);
        return { data: { data: updatedNote }, offline: false };
      } catch (error) {
        console.log('[Offline] Toggle favorite failed, saving offline');
      }
    }

    // Toggle offline
    const updatedNote: OfflineNote = {
      ...note,
      isFavorite: !note.isFavorite,
      updatedAt: new Date().toISOString(),
    };

    await saveNoteOffline(updatedNote);
    await queueAction('UPDATE_NOTE', id, { isFavorite: updatedNote.isFavorite });

    return { data: { data: updatedNote }, offline: true };
  },

  // Toggle archive
  async toggleArchive(id: string): Promise<{ data: { data: OfflineNote }; offline: boolean }> {
    await ensureDBInitialized();

    const note = await getOfflineNote(id);
    if (!note) {
      throw new Error('Note not found');
    }

    if (isOnline()) {
      try {
        const response = await notesAPI.toggleArchive(id);
        const updatedNote = response.data.data;
        await saveNoteOffline(updatedNote);
        return { data: { data: updatedNote }, offline: false };
      } catch (error) {
        console.log('[Offline] Toggle archive failed, saving offline');
      }
    }

    // Toggle offline
    const updatedNote: OfflineNote = {
      ...note,
      isArchived: !note.isArchived,
      updatedAt: new Date().toISOString(),
    };

    await saveNoteOffline(updatedNote);
    await queueAction('UPDATE_NOTE', id, { isArchived: updatedNote.isArchived });

    return { data: { data: updatedNote }, offline: true };
  },
};

// ==================== PROJECTS/TASKS OFFLINE API ====================

export const offlineProjectsAPI = {
  // Get all projects
  async getAll(): Promise<{ data: { data: OfflineProject[] }; fromCache: boolean }> {
    await ensureDBInitialized();

    if (isOnline()) {
      try {
        const response = await projectsAPI.getAll();
        const projects = response.data.data;
        // Cache projects (simplified - without tasks)
        const offlineProjects: OfflineProject[] = projects.map((p: OfflineProject & { owner?: unknown; members?: unknown; tasks?: unknown }) => ({
          _id: p._id,
          name: p.name,
          description: p.description,
          color: p.color,
          icon: p.icon,
          sections: p.sections,
          isArchived: p.isArchived,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        }));
        await saveProjectsOffline(offlineProjects);
        return { data: { data: projects }, fromCache: false };
      } catch (error) {
        console.log('[Offline] Network failed, using cached projects');
      }
    }

    // Fallback to cached projects
    const cachedProjects = await getOfflineProjects();
    return { data: { data: cachedProjects as OfflineProject[] }, fromCache: true };
  },

  // Get single project with tasks
  async getOne(id: string): Promise<{ 
    data: { data: OfflineProject & { tasks: OfflineTask[] } }; 
    fromCache: boolean 
  }> {
    await ensureDBInitialized();

    if (isOnline()) {
      try {
        const response = await projectsAPI.getOne(id);
        const project = response.data.data;
        
        // Cache project
        const offlineProject: OfflineProject = {
          _id: project._id,
          name: project.name,
          description: project.description,
          color: project.color,
          icon: project.icon,
          sections: project.sections,
          isArchived: project.isArchived,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        };
        await saveProjectOffline(offlineProject);

        // Cache tasks
        if (project.tasks && project.tasks.length > 0) {
          const offlineTasks: OfflineTask[] = project.tasks.map((t: OfflineTask & { creator?: unknown; assignee?: unknown }) => ({
            _id: t._id,
            title: t.title,
            description: t.description,
            project: id,
            section: t.section,
            priority: t.priority,
            status: t.status,
            progress: t.progress,
            startDate: t.startDate,
            dueDate: t.dueDate,
            labels: t.labels,
            subtasks: t.subtasks,
            order: t.order,
            isCompleted: t.isCompleted,
            completedAt: t.completedAt,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
          }));
          await saveTasksOffline(offlineTasks);
        }

        return { data: { data: project }, fromCache: false };
      } catch (error) {
        console.log('[Offline] Network failed, using cached project');
      }
    }

    // Fallback to cached data
    const cachedProject = await getOfflineProject(id);
    if (!cachedProject) {
      throw new Error('Project not found in offline cache');
    }

    const cachedTasks = await getOfflineTasks({ projectId: id });

    return { 
      data: { 
        data: { ...cachedProject, tasks: cachedTasks } as OfflineProject & { tasks: OfflineTask[] }
      }, 
      fromCache: true 
    };
  },
};

export const offlineTasksAPI = {
  // Update task
  async update(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      section: string;
      priority: string;
      progress: string;
      status: string;
      isCompleted: boolean;
      order: number;
      startDate: string;
      dueDate: string;
      labels: string[];
    }>
  ): Promise<{ data: { data: OfflineTask }; offline: boolean }> {
    await ensureDBInitialized();

    if (isOnline()) {
      try {
        const response = await tasksAPI.update(id, data);
        const task = response.data.data;
        // Save to cache
        const offlineTask: OfflineTask = {
          _id: task._id,
          title: task.title,
          description: task.description,
          project: typeof task.project === 'string' ? task.project : task.project._id,
          section: task.section,
          priority: task.priority,
          status: task.status,
          progress: task.progress,
          startDate: task.startDate,
          dueDate: task.dueDate,
          labels: task.labels,
          subtasks: task.subtasks,
          order: task.order,
          isCompleted: task.isCompleted,
          completedAt: task.completedAt,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        };
        await saveTaskOffline(offlineTask);
        return { data: { data: task }, offline: false };
      } catch (error) {
        console.log('[Offline] Task update failed, saving offline');
      }
    }

    // Get existing task from cache
    const tasks = await getOfflineTasks();
    const existingTask = tasks.find(t => t._id === id);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Update locally
    const updatedTask: OfflineTask = {
      ...existingTask,
      ...data,
      updatedAt: new Date().toISOString(),
    } as OfflineTask;

    await saveTaskOffline(updatedTask);
    await queueAction('UPDATE_TASK', id, data);

    return { data: { data: updatedTask }, offline: true };
  },

  // Complete task
  async complete(id: string): Promise<{ data: { data: OfflineTask }; offline: boolean }> {
    return this.update(id, { 
      isCompleted: true, 
      status: 'completed',
      progress: 'completed'
    });
  },

  // Delete task
  async delete(id: string): Promise<{ offline: boolean }> {
    await ensureDBInitialized();

    if (isOnline()) {
      try {
        await tasksAPI.delete(id);
        await deleteOfflineTask(id);
        return { offline: false };
      } catch (error) {
        console.log('[Offline] Delete failed, queuing for later');
      }
    }

    await deleteOfflineTask(id);
    await queueAction('DELETE_TASK', id, {});

    return { offline: true };
  },
};

// ==================== FOLDERS OFFLINE API ====================

export const offlineFoldersAPI = {
  async getAll(): Promise<{ data: { data: OfflineFolder[] }; fromCache: boolean }> {
    await ensureDBInitialized();

    if (isOnline()) {
      try {
        const response = await foldersAPI.getAll();
        const folders = response.data.data;
        await saveFoldersOffline(folders);
        return { data: { data: folders }, fromCache: false };
      } catch (error) {
        console.log('[Offline] Network failed, using cached folders');
      }
    }

    const cachedFolders = await getOfflineFolders();
    return { data: { data: cachedFolders }, fromCache: true };
  },
};
