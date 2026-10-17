import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';

export interface IChat extends Document {
  participants: (IUser | mongoose.Types.ObjectId)[];
  lastMessage?: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'rejected';
  initiator: IUser | mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new Schema(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    initiator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique chat between two participants (optional, but good for 1-1)
// We might want to allow group chats later, but for now 1-1
// chatSchema.index({ participants: 1 }, { unique: true }); // This is tricky with array order

export default mongoose.model<IChat>('Chat', chatSchema);
