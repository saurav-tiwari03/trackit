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

// Response interceptor to handle errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
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
  getOne: (id: string) => api.get(`/tasks/${id}`),
  getSubtasks: (id: string) => api.get(`/tasks/${id}/subtasks`),
  create: (data: {
    title: string;
    description?: string;
    project: string;
    section: string;
    priority?: string;
    dueDate?: string;
    labels?: string[];
  }) => api.post('/tasks', data),
  update: (id: string, data: Partial<{
    title: string;
    description: string;
    section: string;
    priority: string;
    status: string;
    isCompleted: boolean;
    order: number;
    dueDate: string;
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
  // Analyze food image with AI
  analyzeFoodImage: async (file: File, description?: string) => {
    const formData = new FormData();
    formData.append('image', file);
    if (description) {
      formData.append('description', description);
    }
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

export default api;

