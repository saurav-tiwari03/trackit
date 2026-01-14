import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IWhiteboard extends Document {
  _id: Types.ObjectId;
  title: string;
  elements: string; // JSON stringified Excalidraw elements
  appState: string; // JSON stringified Excalidraw app state (zoom, scroll, etc.)
  files: string; // JSON stringified files (for images embedded in whiteboard)
  user: Types.ObjectId;
  project?: Types.ObjectId;
  folder?: Types.ObjectId;
  thumbnail?: string; // Base64 or URL of preview image
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  lastEditedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const whiteboardSchema = new Schema<IWhiteboard>(
  {
    title: {
      type: String,
      default: 'Untitled Whiteboard',
      trim: true,
    },
    elements: {
      type: String,
      default: '[]',
    },
    appState: {
      type: String,
      default: '{}',
    },
    files: {
      type: String,
      default: '{}',
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
    thumbnail: {
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
    lastEditedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for text search
whiteboardSchema.index({ title: 'text' });

// Update lastEditedAt on content change
whiteboardSchema.pre('save', function () {
  if (this.isModified('elements') || this.isModified('title')) {
    this.lastEditedAt = new Date();
  }
});

export const Whiteboard = mongoose.model<IWhiteboard>('Whiteboard', whiteboardSchema);
