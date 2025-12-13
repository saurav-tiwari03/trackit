'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '@/types';
import { authAPI } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isHydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setHydrated: () => void;
}

// Helper to sync token to localStorage for API interceptor
const syncTokenToStorage = (token: string | null) => {
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      isHydrated: false,

      setHydrated: () => {
        set({ isHydrated: true });
        // Sync token from persisted state to localStorage for API interceptor
        const token = get().token;
        syncTokenToStorage(token);
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await authAPI.login({ email, password });
          const { user, token } = response.data.data;
          syncTokenToStorage(token);
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (name: string, email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await authAPI.register({ name, email, password });
          const { user, token } = response.data.data;
          syncTokenToStorage(token);
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        syncTokenToStorage(null);
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      checkAuth: async () => {
        const { token, isAuthenticated, user } = get();
        
        // If already authenticated with user data, skip API call
        if (isAuthenticated && user && token) {
          syncTokenToStorage(token);
          return;
        }
        
        // Check localStorage as fallback
        const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const effectiveToken = token || storedToken;
        
        if (!effectiveToken) {
          set({ isAuthenticated: false, user: null, token: null });
          return;
        }

        // Sync token for API calls
        syncTokenToStorage(effectiveToken);

        try {
          const response = await authAPI.getMe();
          set({
            user: response.data.data,
            token: effectiveToken,
            isAuthenticated: true,
          });
        } catch {
          syncTokenToStorage(null);
          set({ isAuthenticated: false, user: null, token: null });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Called after hydration is complete
        if (state) {
          state.setHydrated();
        }
      },
    }
  )
);
