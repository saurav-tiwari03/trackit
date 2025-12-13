import { Schema, model, Document, Types } from 'mongoose';

export interface ISubtask {
  _id: Types.ObjectId;
  title: string;
  isCompleted: boolean;
  order: number;
}

export interface ITask extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  project: Types.ObjectId;
  section: Types.ObjectId;
  assignee?: Types.ObjectId;
  creator: Types.ObjectId;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  status: 'open' | 'in_progress' | 'completed' | 'overdue';
  dueDate?: Date;
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
});

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
    dueDate: {
      type: Date,
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
