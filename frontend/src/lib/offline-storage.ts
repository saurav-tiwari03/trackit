'use client';

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Types for offline storage
export interface OfflineNote {
  _id: string;
  title: string;
  content: string;
  plainText: string;
  user: string;
  project?: {
    _id: string;
    name: string;
    color: string;
  };
  folder?: {
    _id: string;
    name: string;
    color?: string;
    icon?: string;
  };
  color?: string;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  tags: string[];
  lastEditedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineTask {
  _id: string;
  title: string;
  description?: string;
  project: string;
  section: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  status: 'open' | 'in_progress' | 'completed' | 'overdue';
  progress: 'not_started' | 'in_progress' | 'completed' | 'late';
  startDate?: string;
  dueDate?: string;
  labels: string[];
  subtasks: Array<{
    _id: string;
    title: string;
    isCompleted: boolean;
    order: number;
    dueDate?: string;
    priority?: 'P1' | 'P2' | 'P3' | 'P4';
  }>;
  order: number;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineProject {
  _id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  sections: Array<{
    _id: string;
    name: string;
    order: number;
    color: string;
  }>;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineFolder {
  _id: string;
  name: string;
  parent?: string;
  color?: string;
  icon?: string;
  isExpanded: boolean;
  order: number;
}

export type PendingActionType = 
  | 'CREATE_NOTE'
  | 'UPDATE_NOTE'
  | 'DELETE_NOTE'
  | 'CREATE_TASK'
  | 'UPDATE_TASK'
  | 'DELETE_TASK'
  | 'COMPLETE_TASK'
  | 'MOVE_TASK';

export interface PendingAction {
  id?: number;
  type: PendingActionType;
  entityId: string;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

interface TrackItDB extends DBSchema {
  notes: {
    key: string;
    value: OfflineNote;
    indexes: { 'by-folder': string; 'by-project': string };
  };
  tasks: {
    key: string;
    value: OfflineTask;
    indexes: { 'by-project': string; 'by-section': string };
  };
  projects: {
    key: string;
    value: OfflineProject;
  };
  folders: {
    key: string;
    value: OfflineFolder;
    indexes: { 'by-parent': string };
  };
  pendingActions: {
    key: number;
    value: PendingAction;
    autoIncrement: true;
  };
  metadata: {
    key: string;
    value: {
      key: string;
      value: string | number | boolean;
      updatedAt: number;
    };
  };
}

let db: IDBPDatabase<TrackItDB> | null = null;
let initPromise: Promise<IDBPDatabase<TrackItDB>> | null = null;

// Initialize the database
export async function initOfflineDB(): Promise<IDBPDatabase<TrackItDB>> {
  if (db) return db;
  
  if (initPromise) return initPromise;

  initPromise = openDB<TrackItDB>('trackit-offline', 1, {
    upgrade(database) {
      // Notes store
      if (!database.objectStoreNames.contains('notes')) {
        const notesStore = database.createObjectStore('notes', { keyPath: '_id' });
        notesStore.createIndex('by-folder', 'folder._id');
        notesStore.createIndex('by-project', 'project._id');
      }

      // Tasks store
      if (!database.objectStoreNames.contains('tasks')) {
        const tasksStore = database.createObjectStore('tasks', { keyPath: '_id' });
        tasksStore.createIndex('by-project', 'project');
        tasksStore.createIndex('by-section', 'section');
      }

      // Projects store
      if (!database.objectStoreNames.contains('projects')) {
        database.createObjectStore('projects', { keyPath: '_id' });
      }

      // Folders store
      if (!database.objectStoreNames.contains('folders')) {
        const foldersStore = database.createObjectStore('folders', { keyPath: '_id' });
        foldersStore.createIndex('by-parent', 'parent');
      }

      // Pending actions store (for offline sync)
      if (!database.objectStoreNames.contains('pendingActions')) {
        database.createObjectStore('pendingActions', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
      }

      // Metadata store (for sync timestamps, etc.)
      if (!database.objectStoreNames.contains('metadata')) {
        database.createObjectStore('metadata', { keyPath: 'key' });
      }
    },
  });

  db = await initPromise;
  return db;
}

// Get the database instance
async function getDB(): Promise<IDBPDatabase<TrackItDB>> {
  if (!db) {
    return initOfflineDB();
  }
  return db;
}

// ==================== NOTES ====================

export async function saveNotesOffline(notes: OfflineNote[]): Promise<void> {
  const database = await getDB();
  const tx = database.transaction('notes', 'readwrite');
  await Promise.all([
    ...notes.map(note => tx.store.put(note)),
    tx.done,
  ]);
  await updateMetadata('notes_last_sync', Date.now());
}

export async function saveNoteOffline(note: OfflineNote): Promise<void> {
  const database = await getDB();
  await database.put('notes', note);
}

export async function getOfflineNotes(params?: {
  folderId?: string;
  projectId?: string;
  search?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
}): Promise<OfflineNote[]> {
  const database = await getDB();
  let notes = await database.getAll('notes');

  // Apply filters
  if (params?.folderId) {
    notes = notes.filter(n => n.folder?._id === params.folderId);
  }
  if (params?.projectId) {
    notes = notes.filter(n => n.project?._id === params.projectId);
  }
  if (params?.isFavorite) {
    notes = notes.filter(n => n.isFavorite);
  }
  if (params?.isArchived !== undefined) {
    notes = notes.filter(n => n.isArchived === params.isArchived);
  }
  if (params?.search) {
    const searchLower = params.search.toLowerCase();
    notes = notes.filter(n => 
      n.title.toLowerCase().includes(searchLower) ||
      n.plainText.toLowerCase().includes(searchLower)
    );
  }

  // Sort by lastEditedAt descending
  return notes.sort((a, b) => 
    new Date(b.lastEditedAt).getTime() - new Date(a.lastEditedAt).getTime()
  );
}

export async function getOfflineNote(id: string): Promise<OfflineNote | undefined> {
  const database = await getDB();
  return database.get('notes', id);
}

export async function deleteOfflineNote(id: string): Promise<void> {
  const database = await getDB();
  await database.delete('notes', id);
}

// ==================== TASKS ====================

export async function saveTasksOffline(tasks: OfflineTask[]): Promise<void> {
  const database = await getDB();
  const tx = database.transaction('tasks', 'readwrite');
  await Promise.all([
    ...tasks.map(task => tx.store.put(task)),
    tx.done,
  ]);
  await updateMetadata('tasks_last_sync', Date.now());
}

export async function saveTaskOffline(task: OfflineTask): Promise<void> {
  const database = await getDB();
  await database.put('tasks', task);
}

export async function getOfflineTasks(params?: {
  projectId?: string;
  sectionId?: string;
}): Promise<OfflineTask[]> {
  const database = await getDB();
  let tasks = await database.getAll('tasks');

  if (params?.projectId) {
    tasks = tasks.filter(t => t.project === params.projectId);
  }
  if (params?.sectionId) {
    tasks = tasks.filter(t => t.section === params.sectionId);
  }

  return tasks.sort((a, b) => a.order - b.order);
}

export async function getOfflineTask(id: string): Promise<OfflineTask | undefined> {
  const database = await getDB();
  return database.get('tasks', id);
}

export async function deleteOfflineTask(id: string): Promise<void> {
  const database = await getDB();
  await database.delete('tasks', id);
}

// ==================== PROJECTS ====================

export async function saveProjectsOffline(projects: OfflineProject[]): Promise<void> {
  const database = await getDB();
  const tx = database.transaction('projects', 'readwrite');
  await Promise.all([
    ...projects.map(project => tx.store.put(project)),
    tx.done,
  ]);
  await updateMetadata('projects_last_sync', Date.now());
}

export async function saveProjectOffline(project: OfflineProject): Promise<void> {
  const database = await getDB();
  await database.put('projects', project);
}

export async function getOfflineProjects(): Promise<OfflineProject[]> {
  const database = await getDB();
  return database.getAll('projects');
}

export async function getOfflineProject(id: string): Promise<OfflineProject | undefined> {
  const database = await getDB();
  return database.get('projects', id);
}

export async function deleteOfflineProject(id: string): Promise<void> {
  const database = await getDB();
  await database.delete('projects', id);
}

// ==================== FOLDERS ====================

export async function saveFoldersOffline(folders: OfflineFolder[]): Promise<void> {
  const database = await getDB();
  const tx = database.transaction('folders', 'readwrite');
  await Promise.all([
    ...folders.map(folder => tx.store.put(folder)),
    tx.done,
  ]);
  await updateMetadata('folders_last_sync', Date.now());
}

export async function getOfflineFolders(): Promise<OfflineFolder[]> {
  const database = await getDB();
  return database.getAll('folders');
}

// ==================== PENDING ACTIONS ====================

export async function queuePendingAction(action: Omit<PendingAction, 'id'>): Promise<number> {
  const database = await getDB();
  return database.add('pendingActions', action as PendingAction);
}

export async function getPendingActions(): Promise<PendingAction[]> {
  const database = await getDB();
  return database.getAll('pendingActions');
}

export async function deletePendingAction(id: number): Promise<void> {
  const database = await getDB();
  await database.delete('pendingActions', id);
}

export async function updatePendingAction(action: PendingAction): Promise<void> {
  const database = await getDB();
  await database.put('pendingActions', action);
}

export async function clearPendingActions(): Promise<void> {
  const database = await getDB();
  await database.clear('pendingActions');
}

export async function hasPendingActions(): Promise<boolean> {
  const database = await getDB();
  const count = await database.count('pendingActions');
  return count > 0;
}

// ==================== METADATA ====================

async function updateMetadata(key: string, value: string | number | boolean): Promise<void> {
  const database = await getDB();
  await database.put('metadata', {
    key,
    value,
    updatedAt: Date.now(),
  });
}

export async function getMetadata(key: string): Promise<string | number | boolean | undefined> {
  const database = await getDB();
  const record = await database.get('metadata', key);
  return record?.value;
}

// ==================== SYNC ====================

export async function getLastSyncTime(entity: 'notes' | 'tasks' | 'projects' | 'folders'): Promise<number | undefined> {
  const value = await getMetadata(`${entity}_last_sync`);
  return typeof value === 'number' ? value : undefined;
}

// ==================== CLEAR ALL DATA ====================

export async function clearAllOfflineData(): Promise<void> {
  const database = await getDB();
  await Promise.all([
    database.clear('notes'),
    database.clear('tasks'),
    database.clear('projects'),
    database.clear('folders'),
    database.clear('pendingActions'),
    database.clear('metadata'),
  ]);
}
