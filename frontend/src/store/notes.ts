'use client';

import { create } from 'zustand';
import { offlineNotesAPI, offlineFoldersAPI } from '@/lib/offline-api';
import type { OfflineNote, OfflineFolder } from '@/lib/offline-storage';

export type Note = OfflineNote;
export type Folder = OfflineFolder;

interface NotesState {
  notes: Note[];
  folders: Folder[];
  currentNote: Note | null;
  isLoading: boolean;
  isOffline: boolean;
  error: string | null;
  
  // Notes actions
  fetchNotes: (params?: {
    search?: string;
    project?: string;
    folder?: string;
    isFavorite?: boolean;
    isArchived?: boolean;
  }) => Promise<void>;
  fetchNote: (id: string) => Promise<void>;
  createNote: (data: {
    title?: string;
    content?: string;
    plainText?: string;
    folder?: string;
  }) => Promise<Note>;
  updateNote: (id: string, data: {
    title?: string;
    content?: string;
    plainText?: string;
    folder?: string;
    color?: string;
    tags?: string[];
  }) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  toggleArchive: (id: string) => Promise<void>;
  
  // Folders actions
  fetchFolders: () => Promise<void>;
  
  // State management
  setCurrentNote: (note: Note | null) => void;
  clearError: () => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  folders: [],
  currentNote: null,
  isLoading: false,
  isOffline: false,
  error: null,

  fetchNotes: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const result = await offlineNotesAPI.getAll(params);
      set({ 
        notes: result.data.data, 
        isLoading: false,
        isOffline: result.fromCache,
      });
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch notes',
      });
    }
  },

  fetchNote: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await offlineNotesAPI.getOne(id);
      set({ 
        currentNote: result.data.data, 
        isLoading: false,
        isOffline: result.fromCache,
      });
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch note',
      });
      throw error;
    }
  },

  createNote: async (data) => {
    try {
      const result = await offlineNotesAPI.create(data);
      const note = result.data.data;
      set(state => ({
        notes: [note, ...state.notes],
        isOffline: result.offline,
      }));
      return note;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create note' });
      throw error;
    }
  },

  updateNote: async (id, data) => {
    try {
      const result = await offlineNotesAPI.update(id, data);
      const updatedNote = result.data.data;
      set(state => ({
        notes: state.notes.map(n => n._id === id ? updatedNote : n),
        currentNote: state.currentNote?._id === id ? updatedNote : state.currentNote,
        isOffline: result.offline,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update note' });
      throw error;
    }
  },

  deleteNote: async (id) => {
    try {
      const result = await offlineNotesAPI.delete(id);
      set(state => ({
        notes: state.notes.filter(n => n._id !== id),
        currentNote: state.currentNote?._id === id ? null : state.currentNote,
        isOffline: result.offline,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete note' });
      throw error;
    }
  },

  togglePin: async (id) => {
    try {
      const result = await offlineNotesAPI.togglePin(id);
      const updatedNote = result.data.data;
      set(state => ({
        notes: state.notes.map(n => n._id === id ? updatedNote : n),
        currentNote: state.currentNote?._id === id ? updatedNote : state.currentNote,
        isOffline: result.offline,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to toggle pin' });
      throw error;
    }
  },

  toggleFavorite: async (id) => {
    try {
      const result = await offlineNotesAPI.toggleFavorite(id);
      const updatedNote = result.data.data;
      set(state => ({
        notes: state.notes.map(n => n._id === id ? updatedNote : n),
        currentNote: state.currentNote?._id === id ? updatedNote : state.currentNote,
        isOffline: result.offline,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to toggle favorite' });
      throw error;
    }
  },

  toggleArchive: async (id) => {
    try {
      const result = await offlineNotesAPI.toggleArchive(id);
      const updatedNote = result.data.data;
      set(state => ({
        notes: state.notes.filter(n => n._id !== id), // Remove from current view
        currentNote: state.currentNote?._id === id ? null : state.currentNote,
        isOffline: result.offline,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to toggle archive' });
      throw error;
    }
  },

  fetchFolders: async () => {
    try {
      const result = await offlineFoldersAPI.getAll();
      set({ 
        folders: result.data.data,
        isOffline: result.fromCache,
      });
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    }
  },

  setCurrentNote: (note) => {
    set({ currentNote: note });
  },

  clearError: () => {
    set({ error: null });
  },
}));
