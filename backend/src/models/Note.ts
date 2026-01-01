import mongoose, { Document, Schema, Types } from 'mongoose';

export interface INote extends Document {
  _id: Types.ObjectId;
  title: string;
  content: string; // HTML content from Tiptap
  plainText: string; // Plain text for search
  user: Types.ObjectId;
  project?: Types.ObjectId;
  folder?: Types.ObjectId; // Folder for file-like organization
  color?: string;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  tags: string[];
  lastEditedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema<INote>(
  {
    title: {
      type: String,
      default: 'Untitled',
      trim: true,
    },
    content: {
      type: String,
      default: '',
    },
    plainText: {
      type: String,
      default: '',
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
    },
    folder: {
      type: Schema.Types.ObjectId,
      ref: 'Folder',
      index: true,
    },
    color: {
      type: String,
      default: '',
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    lastEditedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for full-text search
noteSchema.index({ title: 'text', plainText: 'text', tags: 'text' });

// Update lastEditedAt on content change
noteSchema.pre('save', function () {
  if (this.isModified('content') || this.isModified('title')) {
    this.lastEditedAt = new Date();
  }
});

export const Note = mongoose.model<INote>('Note', noteSchema);
