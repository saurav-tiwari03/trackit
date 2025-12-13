'use client';

import { create } from 'zustand';
import { notificationsAPI } from '@/lib/api';
import type { Notification } from '@/types';

interface NotificationsState {
  items: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchUnreadCount: () => Promise<void>;
  fetchNotifications: (opts?: { unreadOnly?: boolean; limit?: number }) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  clearAll: () => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  items: [],
  unreadCount: 0,
  isLoading: false,

  fetchUnreadCount: async () => {
    try {
      const res = await notificationsAPI.getUnreadCount();
      set({ unreadCount: res.data.data.unreadCount });
    } catch {
      // ignore
    }
  },

  fetchNotifications: async (opts) => {
    set({ isLoading: true });
    try {
      const res = await notificationsAPI.getAll(opts);
      set({ items: res.data.data, unreadCount: res.data.unreadCount, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  markRead: async (id) => {
    try {
      await notificationsAPI.markRead(id);
      // optimistic local update
      set(state => ({
        items: state.items.map(n => (n._id === id ? { ...n, readAt: new Date().toISOString() } : n)),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } finally {
      // ensure count is correct
      void get().fetchUnreadCount();
    }
  },

  markAllRead: async () => {
    await notificationsAPI.markAllRead();
    set(state => ({
      items: state.items.map(n => ({ ...n, readAt: n.readAt || new Date().toISOString() })),
      unreadCount: 0,
    }));
  },

  clearAll: async () => {
    await notificationsAPI.clearAll();
    set({ items: [], unreadCount: 0 });
  },
}));
