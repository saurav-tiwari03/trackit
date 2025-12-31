export type SubscriptionPlan = 'free' | 'plus' | 'pro';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'pending';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  // Optional presence indicator (used by chat UI / socket presence)
  status?: 'online' | 'offline' | 'busy';
  labels?: string[];
  // Subscription fields
  subscriptionPlan?: SubscriptionPlan;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionExpiresAt?: string;
}

export interface SubscriptionPlanDetails {
  name: string;
  amount: number;
  displayAmount: string;
  currency: string;
  description: string;
  features: string[];
}

export interface Transaction {
  _id: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  amount: number;
  currency: string;
  plan: SubscriptionPlan;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
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
  dueDate?: string;
  priority?: 'P1' | 'P2' | 'P3' | 'P4';
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
  parentTask?: string | null;
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
export type InviteStatus = 'pending' | 'accepted' | 'rejected';

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
  inviteStatus?: InviteStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStats {
  open: number;
  overdue: number;
  inProgress: number;
  completed: number;
}

export interface HabitCompletion {
  date: string;
  completed: boolean;
}

export interface Habit {
  _id: string;
  user: string;
  name: string;
  color: string;
  icon?: string;
  completions: HabitCompletion[];
  currentStreak: number;
  longestStreak: number;
  isArchived: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface HabitStats {
  totalHabits: number;
  totalCompletions: number;
  longestStreak: number;
  activeStreaks: number;
}

