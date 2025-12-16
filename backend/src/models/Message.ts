import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';
import { IChat } from './Chat';

export interface IMessage extends Document {
  chat: IChat | mongoose.Types.ObjectId;
  sender: IUser | mongoose.Types.ObjectId;
  content: string;
  attachments?: {
    _id: mongoose.Types.ObjectId;
    name: string;
    url: string;
    key?: string;
    storage: 's3' | 'local';
    mimeType: string;
    size: number;
    uploadedAt: Date;
  }[];
  readBy: (IUser | mongoose.Types.ObjectId)[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema(
  {
    chat: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      default: '',
    },
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        key: { type: String },
        storage: { type: String, enum: ['s3', 'local'], required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IMessage>('Message', messageSchema);
