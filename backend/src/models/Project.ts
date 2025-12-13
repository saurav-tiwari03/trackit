import { Schema, model, Document, Types } from 'mongoose';

export interface ISection {
  _id: Types.ObjectId;
  name: string;
  order: number;
  color: string;
}

export interface IProject extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  owner: Types.ObjectId;
  members: Types.ObjectId[];
  sections: ISection[];
  color: string;
  icon?: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const sectionSchema = new Schema<ISection>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  color: {
    type: String,
    default: '#6366f1',
  },
});

const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [100, 'Project name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    sections: [sectionSchema],
    color: {
      type: String,
      default: '#6366f1',
    },
    icon: {
      type: String,
      default: '📋',
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
projectSchema.index({ owner: 1 });
projectSchema.index({ members: 1 });

export const Project = model<IProject>('Project', projectSchema);
