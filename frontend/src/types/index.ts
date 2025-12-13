export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  labels?: string[];
}

export interface Section {
  _id: string;
  name: string;
  order: number;
  color: string;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  owner: User;
  members: User[];
  sections: Section[];
  color: string;
  icon?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  tasks?: Task[];
}

export interface Subtask {
  _id: string;
  title: string;
  isCompleted: boolean;
  order: number;
}

export interface Attachment {
  _id: string;
  name: string;
  url: string;
  storage?: 'local' | 's3';
  key?: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  project: Project | string;
  section: string;
  assignee?: User;
  creator: User;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  status: 'open' | 'in_progress' | 'completed' | 'overdue';
  dueDate?: string;
  labels: string[];
  attachments?: Attachment[];
  subtasks: Subtask[];
  order: number;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  comments?: Comment[];
}

export interface Comment {
  _id: string;
  content: string;
  task: string;
  author: User;
  attachments: string[];
  mentions?: User[];
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = 'project_invite' | 'mention';

export interface Notification {
  _id: string;
  recipient: string;
  actor?: User;
  type: NotificationType;
  title: string;
  body?: string;
  project?: { _id: string; name: string; color: string } | string;
  task?: string;
  comment?: string;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStats {
  open: number;
  overdue: number;
  inProgress: number;
  completed: number;
}

