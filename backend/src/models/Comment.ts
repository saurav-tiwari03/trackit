import { Schema, model, Document, Types } from 'mongoose';

export interface IComment extends Document {
  _id: Types.ObjectId;
  content: string;
  task: Types.ObjectId;
  author: Types.ObjectId;
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    },
    task: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    attachments: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
commentSchema.index({ task: 1, createdAt: -1 });

export const Comment = model<IComment>('Comment', commentSchema);
