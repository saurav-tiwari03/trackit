import { Schema, model, Document, Types } from 'mongoose';

export interface ISubtask {
  _id: Types.ObjectId;
  title: string;
  isCompleted: boolean;
  order: number;
  dueDate?: Date;
  priority?: 'P1' | 'P2' | 'P3' | 'P4';
}

export interface IRepeatConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval?: number; // e.g., every 2 weeks
  daysOfWeek?: number[]; // 0-6 for weekly
  dayOfMonth?: number; // for monthly
  endDate?: Date;
  occurrences?: number; // number of times to repeat
}

export interface ITask extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  project: Types.ObjectId;
  section: Types.ObjectId;
  parentTask?: Types.ObjectId | null;
  assignee?: Types.ObjectId;
  creator: Types.ObjectId;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  status: 'open' | 'in_progress' | 'completed' | 'overdue';
  progress: 'not_started' | 'in_progress' | 'completed' | 'late';
  startDate?: Date;
  dueDate?: Date;
  repeat?: IRepeatConfig;
  showNotesOnCard: boolean;
  showChecklistOnCard: boolean;
  labels: string[];
  attachments: Array<{
    _id: Types.ObjectId;
    name: string;
    url: string;
    storage: 'local' | 's3';
    key?: string;
    mimeType: string;
    size: number;
    uploadedAt: Date;
  }>;
  subtasks: ISubtask[];
  activities: Array<{
    _id: Types.ObjectId;
    type:
      | 'field_update'
      | 'subtask_added'
      | 'subtask_removed'
      | 'subtask_updated'
      | 'attachment_added'
      | 'attachment_removed'
      | 'comment_added'
      | 'comment_updated'
      | 'comment_deleted';
    actor?: Types.ObjectId;
    message: string;
    createdAt: Date;
  }>;
  order: number;
  isCompleted: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const subtaskSchema = new Schema<ISubtask>({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  order: {
    type: Number,
    default: 0,
  },
  dueDate: {
    type: Date,
  },
  priority: {
    type: String,
    enum: ['P1', 'P2', 'P3', 'P4'],
    default: 'P4',
  },
});

const activitySchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    type: {
      type: String,
      enum: [
        'field_update',
        'subtask_added',
        'subtask_removed',
        'subtask_updated',
        'attachment_added',
        'attachment_removed',
        'comment_added',
        'comment_updated',
        'comment_deleted',
      ],
      required: true,
    },
    actor: { type: Schema.Types.ObjectId, ref: 'User' },
    message: { type: String, required: true, trim: true, maxlength: 300 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const repeatConfigSchema = new Schema(
  {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'],
      required: true,
    },
    interval: { type: Number, default: 1 },
    daysOfWeek: [{ type: Number, min: 0, max: 6 }],
    dayOfMonth: { type: Number, min: 1, max: 31 },
    endDate: { type: Date },
    occurrences: { type: Number },
  },
  { _id: false }
);

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    section: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    parentTask: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    priority: {
      type: String,
      enum: ['P1', 'P2', 'P3', 'P4'],
      default: 'P4',
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'completed', 'overdue'],
      default: 'open',
    },
    progress: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'late'],
      default: 'not_started',
    },
    startDate: {
      type: Date,
    },
    dueDate: {
      type: Date,
    },
    repeat: {
      type: repeatConfigSchema,
    },
    showNotesOnCard: {
      type: Boolean,
      default: false,
    },
    showChecklistOnCard: {
      type: Boolean,
      default: true,
    },
    labels: [
      {
        type: String,
        trim: true,
      },
    ],
    attachments: [
      {
        name: { type: String, required: true, trim: true },
        url: { type: String, required: true },
        storage: { type: String, enum: ['local', 's3'], default: 'local' },
        key: { type: String },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    subtasks: {
      type: [subtaskSchema],
      default: [],
    },
    activities: {
      type: [activitySchema],
      default: [],
    },
    order: {
      type: Number,
      default: 0,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
taskSchema.index({ project: 1, section: 1 });
taskSchema.index({ parentTask: 1, order: 1 });
taskSchema.index({ assignee: 1 });
taskSchema.index({ creator: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ dueDate: 1 });

// Update status based on completion
taskSchema.pre('save', function () {
  if (this.isModified('isCompleted')) {
    if (this.isCompleted) {
      this.status = 'completed';
      this.completedAt = new Date();
    } else {
      this.status = 'open';
      this.completedAt = undefined;
    }
  }
});

export const Task = model<ITask>('Task', taskSchema);
