export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface TaskStats {
  open: number;
  overdue: number;
  inProgress: number;
  completed: number;
}

