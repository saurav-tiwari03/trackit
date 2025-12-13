import { Schema, model, Document, Types } from 'mongoose';

export type NotificationType = 'project_invite' | 'mention';

export interface INotification extends Document {
  _id: Types.ObjectId;
  recipient: Types.ObjectId;
  actor?: Types.ObjectId;
  type: NotificationType;
  title: string;
  body?: string;
  project?: Types.ObjectId;
  task?: Types.ObjectId;
  comment?: Types.ObjectId;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: ['project_invite', 'mention'],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    body: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
    },
    task: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
    },
    comment: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
    },
    readAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

export const Notification = model<INotification>(
  'Notification',
  notificationSchema
);
