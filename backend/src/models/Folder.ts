import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IFolder extends Document {
  _id: Types.ObjectId;
  name: string;
  user: Types.ObjectId;
  parent?: Types.ObjectId; // For nested folders
  color?: string;
  icon?: string;
  isExpanded: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const folderSchema = new Schema<IFolder>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      default: 'New Folder',
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Folder',
      index: true,
    },
    color: {
      type: String,
      default: '',
    },
    icon: {
      type: String,
      default: 'folder',
    },
    isExpanded: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
folderSchema.index({ user: 1, parent: 1 });

export const Folder = mongoose.model<IFolder>('Folder', folderSchema);
