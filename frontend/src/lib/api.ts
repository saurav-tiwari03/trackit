import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Helper function to clear all auth data and redirect to login
const handleUnauthorized = () => {
  if (typeof window !== 'undefined') {
    // Clear all localStorage
    localStorage.clear();

    // Clear all sessionStorage
    sessionStorage.clear();

    // Clear any cookies if needed (for httpOnly cookies, backend should handle)
    document.cookie.split(';').forEach(cookie => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie;
      document.cookie = name.trim() + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
    });

    // Redirect to login if not already there
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }
};

// Response interceptor to handle errors
api.interceptors.response.use(
  response => {
    // Check for unauthorized response even on successful HTTP status
    if (response.data?.success === false &&
      response.data?.message === 'Not authorized to access this route') {
      handleUnauthorized();
      return Promise.reject(new Error('Unauthorized'));
    }
    return response;
  },
  error => {
    // Handle 401 status
    if (error.response?.status === 401) {
      handleUnauthorized();
    }

    // Also check for unauthorized message in error response
    if (error.response?.data?.success === false &&
      error.response?.data?.message === 'Not authorized to access this route') {
      handleUnauthorized();
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Projects API
export const projectsAPI = {
  getAll: () => api.get('/projects'),
  getOne: (id: string) => api.get(`/projects/${id}`),
  create: (data: { name: string; description?: string; color?: string }) =>
    api.post('/projects', data),
  update: (id: string, data: Partial<{ name: string; description: string; color: string }>) =>
    api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  addSection: (id: string, data: { name: string; color?: string }) =>
    api.post(`/projects/${id}/sections`, data),
  updateSections: (id: string, sections: Array<{ _id: string; name: string; order: number; color: string }>) =>
    api.put(`/projects/${id}/sections`, { sections }),
  invite: (id: string, data: { email: string }) =>
    api.post(`/projects/${id}/invite`, data),
  acceptInvite: (id: string) => api.post(`/projects/${id}/invite/accept`),
  rejectInvite: (id: string) => api.post(`/projects/${id}/invite/reject`),
  leave: (id: string) => api.post(`/projects/${id}/leave`),
};

// Tasks API
export const tasksAPI = {
  getAll: (params?: { status?: string; project?: string; search?: string }) =>
    api.get('/tasks', { params }),
  getStats: () => api.get('/tasks/stats'),
  getInboxStats: (projectId: string) => api.get('/tasks/inbox-stats', { params: { projectId } }),
  getOne: (id: string) => api.get(`/tasks/${id}`),
  getSubtasks: (id: string) => api.get(`/tasks/${id}/subtasks`),
  create: (data: {
    title: string;
    description?: string;
    project: string;
    section: string;
    priority?: string;
    progress?: string;
    startDate?: string;
    dueDate?: string;
    repeat?: {
      frequency: string;
      interval?: number;
      daysOfWeek?: number[];
      dayOfMonth?: number;
      endDate?: string;
      occurrences?: number;
    };
    labels?: string[];
  }) => api.post('/tasks', data),
  update: (id: string, data: Partial<{
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
    repeat: {
      frequency: string;
      interval?: number;
      daysOfWeek?: number[];
      dayOfMonth?: number;
      endDate?: string;
      occurrences?: number;
    } | null;
    showNotesOnCard: boolean;
    showChecklistOnCard: boolean;
    labels: string[];
  }>) => api.put(`/tasks/${id}`, data),
  move: (id: string, data: { section: string; order: number; isCompleted?: boolean; status?: string }) =>
    api.put(`/tasks/${id}/move`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  addSubtask: (
    id: string,
    data: { title: string; dueDate?: string; priority?: 'P1' | 'P2' | 'P3' | 'P4' }
  ) => api.post(`/tasks/${id}/subtasks`, data),
  updateSubtask: (
    taskId: string,
    subtaskId: string,
    data: { title?: string; description?: string; isCompleted?: boolean; dueDate?: string; priority?: 'P1' | 'P2' | 'P3' | 'P4'; labels?: string[] }
  ) =>
    api.put(`/tasks/${taskId}/subtasks/${subtaskId}`, data),
  deleteSubtask: (taskId: string, subtaskId: string) =>
    api.delete(`/tasks/${taskId}/subtasks/${subtaskId}`),
  reorderSubtasks: (taskId: string, orderedIds: string[]) =>
    api.put(`/tasks/${taskId}/subtasks/reorder`, { orderedIds }),
  uploadAttachments: (taskId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return api.post(`/tasks/${taskId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getAttachmentUrl: (taskId: string, attachmentId: string) =>
    api.get(`/tasks/${taskId}/attachments/${attachmentId}/url`),
  deleteAttachment: (taskId: string, attachmentId: string) =>
    api.delete(`/tasks/${taskId}/attachments/${attachmentId}`),
};

// Comments API
export const commentsAPI = {
  getForTask: (taskId: string) => api.get(`/comments/task/${taskId}`),
  create: (data: { content: string; task: string; mentions?: string[] }) =>
    api.post('/comments', data),
  update: (id: string, data: { content: string }) =>
    api.put(`/comments/${id}`, data),
  delete: (id: string) => api.delete(`/comments/${id}`),
};

// Notifications API
export const notificationsAPI = {
  getAll: (params?: { unreadOnly?: boolean; limit?: number }) =>
    api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  clearAll: () => api.delete('/notifications/clear-all'),
};

// Users API
export const usersAPI = {
  search: (query: string) => api.get('/users/search', { params: { query } }),
  getOne: (id: string) => api.get(`/users/${id}`),
  updateProfile: (data: { name?: string }) => api.put('/users/profile', data),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  removeAvatar: () => api.delete('/users/avatar'),
  // Gemini API key management
  updateGeminiKey: (geminiApiKey: string, geminiModel?: string, skipValidation?: boolean) =>
    api.put('/users/gemini-key', { geminiApiKey, geminiModel, skipValidation }),
  getGeminiKeyStatus: () => api.get('/users/gemini-key/status'),
  updateGeminiModel: (geminiModel: string) =>
    api.put('/users/gemini-model', { geminiModel }),
};

// Chats API (attachments are uploaded via HTTP; messages via sockets)
export const chatsAPI = {
  uploadAttachments: (chatId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return api.post(`/chats/${chatId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Calendar API
export const calendarAPI = {
  getGoogleAuthUrl: () => api.get('/calendar/google/auth'),
  getGoogleStatus: () => api.get('/calendar/google/status'),
  disconnectGoogle: () => api.delete('/calendar/google/disconnect'),
  getGoogleEvents: (params?: { timeMin?: string; timeMax?: string }) =>
    api.get('/calendar/google/events', { params }),
  getGoogleCalendars: () => api.get('/calendar/google/calendars'),
};

// Notes API
export const notesAPI = {
  getAll: (params?: {
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
  }) => api.get('/notes', { params }),
  getOne: (id: string) => api.get(`/notes/${id}`),
  create: (data: {
    title?: string;
    content?: string;
    plainText?: string;
    project?: string;
    folder?: string;
    color?: string;
    tags?: string[];
  }) => api.post('/notes', data),
  update: (
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
  ) => api.put(`/notes/${id}`, data),
  delete: (id: string) => api.delete(`/notes/${id}`),
  togglePin: (id: string) => api.patch(`/notes/${id}/pin`),
  toggleFavorite: (id: string) => api.patch(`/notes/${id}/favorite`),
  toggleArchive: (id: string) => api.patch(`/notes/${id}/archive`),
  move: (id: string, folderId: string | null) =>
    api.patch(`/notes/${id}/move`, { folder: folderId }),
  download: (id: string) =>
    api.get(`/notes/${id}/download`, { responseType: 'blob' }),
};

// Folders API
export const foldersAPI = {
  getAll: () => api.get('/folders'),
  getOne: (id: string) => api.get(`/folders/${id}`),
  create: (data: { name?: string; parent?: string; color?: string; icon?: string }) =>
    api.post('/folders', data),
  update: (
    id: string,
    data: {
      name?: string;
      parent?: string;
      color?: string;
      icon?: string;
      isExpanded?: boolean;
      order?: number;
    }
  ) => api.put(`/folders/${id}`, data),
  delete: (id: string) => api.delete(`/folders/${id}`),
  toggle: (id: string) => api.patch(`/folders/${id}/toggle`),
};

// Habits API
export const habitsAPI = {
  getAll: (params?: { includeArchived?: boolean }) =>
    api.get('/habits', { params }),
  getStats: () => api.get('/habits/stats'),
  create: (data: { name: string; color?: string; icon?: string }) =>
    api.post('/habits', data),
  update: (
    id: string,
    data: { name?: string; color?: string; icon?: string; isArchived?: boolean; order?: number }
  ) => api.put(`/habits/${id}`, data),
  delete: (id: string) => api.delete(`/habits/${id}`),
  toggle: (id: string, date: string) =>
    api.post(`/habits/${id}/toggle`, { date }),
};

// Push Notifications API
export const pushAPI = {
  getVapidPublicKey: () => api.get('/push/vapid-public-key'),
  subscribe: (data: {
    subscription: PushSubscriptionJSON;
    deviceName?: string;
    userAgent?: string;
  }) => api.post('/push/subscribe', data),
  unsubscribe: (endpoint?: string) =>
    api.post('/push/unsubscribe', { endpoint }),
  getSubscriptions: () => api.get('/push/subscriptions'),
  sendTest: () => api.post('/push/test'),
};

// Payments API
export const paymentsAPI = {
  getPlans: () => api.get('/payments/plans'),
  getKey: () => api.get('/payments/key'),
  getSubscription: () => api.get('/payments/subscription'),
  getTransactions: (params?: { limit?: number; skip?: number }) =>
    api.get('/payments/transactions', { params }),
  createSubscription: (plan: 'plus' | 'pro') =>
    api.post('/payments/create-subscription', { plan }),
  verifyPayment: (data: {
    razorpay_subscription_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => api.post('/payments/verify', data),
  cancelSubscription: () => api.post('/payments/cancel'),
};

// FitLog API
export const fitlogAPI = {
  // Get AI usage info (for rate limiting display)
  getAIUsage: () => api.get('/fitlog/ai-usage'),
  // Upload meal image
  uploadMealImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/fitlog/upload-meal-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  // Analyze food image with AI
  analyzeFoodImage: async (file: File, description?: string) => {
    const formData = new FormData();
    formData.append('image', file);
    if (description) {
      formData.append('description', description);
    }
    formData.append('saveImage', 'true');
    return api.post('/fitlog/analyze-food', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getEntries: (params?: { startDate?: string; endDate?: string; limit?: number }) =>
    api.get('/fitlog', { params }),
  getToday: () => api.get('/fitlog/today'),
  getEntry: (date: string) => api.get(`/fitlog/${date}`),
  saveEntry: (data: {
    date: string;
    nutrition?: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      water?: number;
    };
    workout?: {
      type: string;
      customName?: string;
      exercises: Array<{
        name: string;
        sets: number;
        reps: number;
        weight?: number;
        duration?: number;
        notes?: string;
      }>;
      duration: number;
      caloriesBurned?: number;
      notes?: string;
    };
    bodyMetrics?: { weight?: number; bodyFat?: number };
    caloriesBurned?: number;
    steps?: number;
    notes?: string;
    mood?: string;
  }) => api.post('/fitlog', data),
  updateEntry: (
    date: string,
    data: Partial<{
      nutrition: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        water?: number;
      };
      workout: {
        type: string;
        customName?: string;
        exercises: Array<{
          name: string;
          sets: number;
          reps: number;
          weight?: number;
          duration?: number;
        }>;
        duration: number;
        caloriesBurned?: number;
      };
      bodyMetrics: { weight?: number; bodyFat?: number };
      caloriesBurned: number;
      steps: number;
      notes: string;
      mood: string;
    }>
  ) => api.put(`/fitlog/${date}`, data),
  deleteEntry: (date: string) => api.delete(`/fitlog/${date}`),
  getGoals: () => api.get('/fitlog/goals'),
  updateGoals: (
    data: Partial<{
      fitnessGoal: string;
      activityLevel: string;
      gender: string;
      age: number;
      height: number;
      currentWeight: number;
      caloriesIntake: number;
      caloriesBurn: number;
      protein: number;
      carbs: number;
      fat: number;
      water: number;
      steps: number;
      targetWeight: number;
      startWeight: number;
      weightUnit: 'kg' | 'lbs';
      workoutsPerWeek: number;
      isCustomTargets: boolean;
    }>
  ) => api.put('/fitlog/goals', data),
  calculateGoalsWithAI: (data: {
    gender: string;
    age: number;
    height: number;
    currentWeight: number;
    targetWeight?: number;
    activityLevel: string;
    fitnessGoal: string;
  }) => api.post('/fitlog/goals/calculate', data),
  getWeeklyStats: () => api.get('/fitlog/stats/weekly'),
  getWeightProgress: (days?: number) =>
    api.get('/fitlog/progress/weight', { params: { days } }),
  // Meal endpoints
  addMeal: (
    date: string,
    meal: {
      type: string;
      name?: string;
      description?: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      time?: string;
      imageKey?: string;
    }
  ) => api.post(`/fitlog/${date}/meals`, meal),
  deleteMeal: (date: string, mealId: string) =>
    api.delete(`/fitlog/${date}/meals/${mealId}`),
  updateMeal: (
    date: string,
    mealId: string,
    meal: {
      type?: string;
      name?: string;
      description?: string;
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      time?: string;
      imageKey?: string;
    }
  ) => api.put(`/fitlog/${date}/meals/${mealId}`, meal),
  // Workout endpoints
  addWorkout: (
    date: string,
    workout: {
      type: string;
      customName?: string;
      exercises?: Array<{
        name: string;
        sets: number;
        reps: number;
        weight?: number;
        duration?: number;
        notes?: string;
      }>;
      duration: number;
      caloriesBurned?: number;
      notes?: string;
    }
  ) => api.post(`/fitlog/${date}/workouts`, workout),
  deleteWorkout: (date: string, workoutId: string) =>
    api.delete(`/fitlog/${date}/workouts/${workoutId}`),
};

// Whiteboards API
export const whiteboardsAPI = {
  getAll: (params?: {
    search?: string;
    project?: string;
    folder?: string;
    noFolder?: boolean;
    isPinned?: boolean;
    isFavorite?: boolean;
    isArchived?: boolean;
    sortBy?: string;
    sortOrder?: string;
  }) => api.get('/whiteboards', { params }),
  getOne: (id: string) => api.get(`/whiteboards/${id}`),
  create: (data: {
    title?: string;
    elements?: string;
    appState?: string;
    files?: string;
    project?: string;
    folder?: string;
  }) => api.post('/whiteboards', data),
  update: (
    id: string,
    data: {
      title?: string;
      elements?: string;
      appState?: string;
      files?: string;
      project?: string;
      folder?: string;
      thumbnail?: string;
    }
  ) => api.put(`/whiteboards/${id}`, data),
  delete: (id: string) => api.delete(`/whiteboards/${id}`),
  togglePin: (id: string) => api.patch(`/whiteboards/${id}/pin`),
  toggleFavorite: (id: string) => api.patch(`/whiteboards/${id}/favorite`),
  toggleArchive: (id: string) => api.patch(`/whiteboards/${id}/archive`),
  move: (id: string, folderId: string | null) =>
    api.patch(`/whiteboards/${id}/move`, { folder: folderId }),
};

// Upload API
export const uploadAPI = {
  uploadImage: async (file: File | Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.url;
  },
};

// Lists API (multiple lists; each list has items with name + description)
export const listsAPI = {
  getLists: () => api.get('/lists'),
  getList: (id: string) => api.get(`/lists/${id}`),
  createList: (data: { name: string; color?: string; icon?: string }) =>
    api.post('/lists', data),
  updateList: (
    id: string,
    data: { name?: string; color?: string; icon?: string; order?: number }
  ) => api.put(`/lists/${id}`, data),
  deleteList: (id: string) => api.delete(`/lists/${id}`),

  addItem: (listId: string, data: { name: string; description?: string }) =>
    api.post(`/lists/${listId}/items`, data),
  updateItem: (
    listId: string,
    itemId: string,
    data: { name?: string; description?: string; order?: number }
  ) => api.put(`/lists/${listId}/items/${itemId}`, data),
  deleteItem: (listId: string, itemId: string) =>
    api.delete(`/lists/${listId}/items/${itemId}`),
  reorderItems: (listId: string, orderedItemIds: string[]) =>
    api.post(`/lists/${listId}/items/reorder`, { orderedItemIds }),
  moveItem: (listId: string, itemId: string, targetListId: string) =>
    api.post(`/lists/${listId}/items/${itemId}/move`, { targetListId }),
};

// Movies API
export const moviesAPI = {
  // Movies
  getAll: (params?: {
    status?: string;
    isFavorite?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    limit?: number;
    skip?: number;
  }) => api.get('/movies', { params }),

  getOne: (id: string) => api.get(`/movies/${id}`),

  getStats: () => api.get('/movies/stats'),

  getTimeline: (params?: { year?: number; month?: number }) =>
    api.get('/movies/timeline', { params }),

  create: (data: {
    tmdbId?: number;
    title: string;
    originalTitle?: string;
    overview?: string;
    posterPath?: string;
    backdropPath?: string;
    releaseDate?: string;
    runtime?: number;
    genres?: string[];
    voteAverage?: number;
    status?: string;
    rating?: number;
    review?: string;
    watchedDate?: string;
    plannedDate?: string;
    platform?: string;
    tags?: string[];
    notes?: string;
  }) => api.post('/movies', data),

  update: (id: string, data: {
    status?: string;
    rating?: number;
    review?: string;
    watchedDate?: string;
    plannedDate?: string;
    platform?: string;
    rewatchCount?: number;
    isFavorite?: boolean;
    tags?: string[];
    notes?: string;
  }) => api.put(`/movies/${id}`, data),

  delete: (id: string) => api.delete(`/movies/${id}`),

  toggleFavorite: (id: string) => api.patch(`/movies/${id}/favorite`),

  markWatched: (id: string, data?: {
    watchedDate?: string;
    rating?: number;
    platform?: string;
  }) => api.patch(`/movies/${id}/watched`, data),

  // Movie Lists
  getLists: () => api.get('/movies/lists/all'),

  createList: (data: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    isPublic?: boolean;
  }) => api.post('/movies/lists', data),

  updateList: (id: string, data: {
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
    isPublic?: boolean;
    order?: number;
  }) => api.put(`/movies/lists/${id}`, data),

  deleteList: (id: string) => api.delete(`/movies/lists/${id}`),

  getListMovies: (listId: string) => api.get(`/movies/lists/${listId}/movies`),

  addToList: (listId: string, movieId: string) =>
    api.post(`/movies/lists/${listId}/movies/${movieId}`),

  removeFromList: (listId: string, movieId: string) =>
    api.delete(`/movies/lists/${listId}/movies/${movieId}`),

  // AI Recommendations
  getRecommendation: (data: {
    contentType: 'movie' | 'series' | 'any';
    mood?: string;
    excludedTitles?: string[];
  }) => api.post('/movies/recommend', data),
};

// TMDB API (client-side - using public API key)
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export const tmdbAPI = {
  search: async (query: string, page = 1) => {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}`
    );
    return response.json();
  },

  getMovie: async (tmdbId: number) => {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}`
    );
    return response.json();
  },

  getPopular: async (page = 1) => {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&page=${page}`
    );
    return response.json();
  },

  getTrending: async (timeWindow: 'day' | 'week' = 'week') => {
    const response = await fetch(
      `${TMDB_BASE_URL}/trending/movie/${timeWindow}?api_key=${TMDB_API_KEY}`
    );
    return response.json();
  },

  getImageUrl: (path: string | null, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w342') => {
    if (!path) return null;
    return `https://image.tmdb.org/t/p/${size}${path}`;
  },
};

export default api;

