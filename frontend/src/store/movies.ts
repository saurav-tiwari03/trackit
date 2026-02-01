'use client';

import { create } from 'zustand';
import { Movie, MovieList, MovieStats, MovieStatus } from '@/types';
import { moviesAPI } from '@/lib/api';

interface MoviesState {
  movies: Movie[];
  lists: MovieList[];
  stats: MovieStats | null;
  timeline: Record<string, Movie[]>;
  currentMovie: Movie | null;
  isLoading: boolean;
  filter: {
    status?: MovieStatus;
    isFavorite?: boolean;
    search?: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  
  // Actions
  fetchMovies: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchTimeline: (year?: number, month?: number) => Promise<void>;
  fetchLists: () => Promise<void>;
  
  addMovie: (data: Partial<Movie>) => Promise<Movie>;
  updateMovie: (id: string, data: Partial<Movie>) => Promise<void>;
  deleteMovie: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  markWatched: (id: string, data?: { watchedDate?: string; rating?: number; platform?: string }) => Promise<void>;
  
  createList: (data: { name: string; description?: string; color?: string; icon?: string }) => Promise<MovieList>;
  updateList: (id: string, data: Partial<MovieList>) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  addToList: (listId: string, movieId: string) => Promise<void>;
  removeFromList: (listId: string, movieId: string) => Promise<void>;
  
  setFilter: (filter: Partial<MoviesState['filter']>) => void;
  setCurrentMovie: (movie: Movie | null) => void;
}

export const useMoviesStore = create<MoviesState>((set, get) => ({
  movies: [],
  lists: [],
  stats: null,
  timeline: {},
  currentMovie: null,
  isLoading: false,
  filter: {
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },

  fetchMovies: async () => {
    set({ isLoading: true });
    try {
      const { filter } = get();
      const response = await moviesAPI.getAll({
        status: filter.status,
        isFavorite: filter.isFavorite,
        search: filter.search,
        sortBy: filter.sortBy,
        sortOrder: filter.sortOrder,
      });
      set({ movies: response.data.data, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch movies:', error);
      set({ isLoading: false });
    }
  },

  fetchStats: async () => {
    try {
      const response = await moviesAPI.getStats();
      set({ stats: response.data.data });
    } catch (error) {
      console.error('Failed to fetch movie stats:', error);
    }
  },

  fetchTimeline: async (year?: number, month?: number) => {
    try {
      const response = await moviesAPI.getTimeline({ year, month });
      set({ timeline: response.data.data });
    } catch (error) {
      console.error('Failed to fetch timeline:', error);
    }
  },

  fetchLists: async () => {
    try {
      const response = await moviesAPI.getLists();
      set({ lists: response.data.data });
    } catch (error) {
      console.error('Failed to fetch movie lists:', error);
    }
  },

  addMovie: async (data) => {
    const response = await moviesAPI.create(data as Parameters<typeof moviesAPI.create>[0]);
    const movie = response.data.data;
    set(state => ({
      movies: [movie, ...state.movies],
    }));
    // Refresh stats
    get().fetchStats();
    return movie;
  },

  updateMovie: async (id, data) => {
    const response = await moviesAPI.update(id, data);
    const updatedMovie = response.data.data;
    set(state => ({
      movies: state.movies.map(m => m._id === id ? updatedMovie : m),
      currentMovie: state.currentMovie?._id === id ? updatedMovie : state.currentMovie,
    }));
    get().fetchStats();
  },

  deleteMovie: async (id) => {
    await moviesAPI.delete(id);
    set(state => ({
      movies: state.movies.filter(m => m._id !== id),
      currentMovie: state.currentMovie?._id === id ? null : state.currentMovie,
    }));
    get().fetchStats();
  },

  toggleFavorite: async (id) => {
    const response = await moviesAPI.toggleFavorite(id);
    const updatedMovie = response.data.data;
    set(state => ({
      movies: state.movies.map(m => m._id === id ? updatedMovie : m),
      currentMovie: state.currentMovie?._id === id ? updatedMovie : state.currentMovie,
    }));
  },

  markWatched: async (id, data) => {
    const response = await moviesAPI.markWatched(id, data);
    const updatedMovie = response.data.data;
    set(state => ({
      movies: state.movies.map(m => m._id === id ? updatedMovie : m),
      currentMovie: state.currentMovie?._id === id ? updatedMovie : state.currentMovie,
    }));
    get().fetchStats();
  },

  createList: async (data) => {
    const response = await moviesAPI.createList(data);
    const list = response.data.data;
    set(state => ({
      lists: [...state.lists, list],
    }));
    return list;
  },

  updateList: async (id, data) => {
    const response = await moviesAPI.updateList(id, data);
    const updatedList = response.data.data;
    set(state => ({
      lists: state.lists.map(l => l._id === id ? updatedList : l),
    }));
  },

  deleteList: async (id) => {
    await moviesAPI.deleteList(id);
    set(state => ({
      lists: state.lists.filter(l => l._id !== id),
    }));
  },

  addToList: async (listId, movieId) => {
    const response = await moviesAPI.addToList(listId, movieId);
    const updatedMovie = response.data.data;
    set(state => ({
      movies: state.movies.map(m => m._id === movieId ? updatedMovie : m),
    }));
  },

  removeFromList: async (listId, movieId) => {
    const response = await moviesAPI.removeFromList(listId, movieId);
    const updatedMovie = response.data.data;
    set(state => ({
      movies: state.movies.map(m => m._id === movieId ? updatedMovie : m),
    }));
  },

  setFilter: (filter) => {
    set(state => ({
      filter: { ...state.filter, ...filter },
    }));
    get().fetchMovies();
  },

  setCurrentMovie: (movie) => {
    set({ currentMovie: movie });
  },
}));
