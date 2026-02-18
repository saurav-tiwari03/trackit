'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// All available sidebar items with their default visibility
export const SIDEBAR_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', defaultVisible: true },
  { id: 'inbox', label: 'Inbox', defaultVisible: true },
  { id: 'lists', label: 'Lists', defaultVisible: true },
  { id: 'streaks', label: 'Streaks', defaultVisible: true },
  { id: 'fitlog', label: 'FitLog', defaultVisible: true },
  { id: 'movies', label: 'Movies', defaultVisible: true },
  { id: 'tasks', label: 'All Tasks', defaultVisible: true },
  { id: 'calendar', label: 'Calendar', defaultVisible: true },
  { id: 'notes', label: 'Notes', defaultVisible: true },
  { id: 'whiteboards', label: 'Whiteboards', defaultVisible: true },
  { id: 'achievements', label: 'Achievements', defaultVisible: false },
  { id: 'slack', label: 'Slack', defaultVisible: false },
  { id: 'notifications', label: 'Notifications', defaultVisible: true },
] as const;

export type SidebarItemId = typeof SIDEBAR_ITEMS[number]['id'];

interface SidebarState {
  // Map of item id to visibility
  visibleItems: Record<SidebarItemId, boolean>;
  // Order of items (array of ids)
  itemOrder: SidebarItemId[];
  // Actions
  toggleItem: (id: SidebarItemId) => void;
  setItemVisible: (id: SidebarItemId, visible: boolean) => void;
  setItemOrder: (order: SidebarItemId[]) => void;
  resetToDefaults: () => void;
}

const getDefaultVisibility = (): Record<SidebarItemId, boolean> => {
  const visibility: Record<string, boolean> = {};
  SIDEBAR_ITEMS.forEach(item => {
    visibility[item.id] = item.defaultVisible;
  });
  return visibility as Record<SidebarItemId, boolean>;
};

const getDefaultOrder = (): SidebarItemId[] => {
  return SIDEBAR_ITEMS.map(item => item.id);
};

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      visibleItems: getDefaultVisibility(),
      itemOrder: getDefaultOrder(),

      toggleItem: (id) =>
        set((state) => ({
          visibleItems: {
            ...state.visibleItems,
            [id]: !state.visibleItems[id],
          },
        })),

      setItemVisible: (id, visible) =>
        set((state) => ({
          visibleItems: {
            ...state.visibleItems,
            [id]: visible,
          },
        })),

      setItemOrder: (order) =>
        set({ itemOrder: order }),

      resetToDefaults: () =>
        set({
          visibleItems: getDefaultVisibility(),
          itemOrder: getDefaultOrder(),
        }),
    }),
    {
      name: 'trackit-sidebar-settings',
    }
  )
);
