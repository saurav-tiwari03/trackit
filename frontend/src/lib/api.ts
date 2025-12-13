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
};

// Tasks API
export const tasksAPI = {
  getAll: (params?: { status?: string; project?: string; search?: string }) =>
    api.get('/tasks', { params }),
  getStats: () => api.get('/tasks/stats'),
  getOne: (id: string) => api.get(`/tasks/${id}`),
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
  addSubtask: (id: string, data: { title: string }) =>
    api.post(`/tasks/${id}/subtasks`, data),
  updateSubtask: (taskId: string, subtaskId: string, data: { title?: string; isCompleted?: boolean }) =>
    api.put(`/tasks/${taskId}/subtasks/${subtaskId}`, data),
  deleteSubtask: (taskId: string, subtaskId: string) =>
    api.delete(`/tasks/${taskId}/subtasks/${subtaskId}`),
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

export default api;

