import { Schema, model, Document, Types } from 'mongoose';

export interface IListItem {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  order: number;
  createdAt: Date;
}

export interface IList extends Document {
  _id: Types.ObjectId;
  name: string;
  user: Types.ObjectId;
  items: IListItem[];
  color?: string;
  icon?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const listItemSchema = new Schema<IListItem>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const listSchema = new Schema<IList>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [listItemSchema],
    color: {
      type: String,
      default: '#6b7280',
    },
    icon: {
      type: String,
      default: 'list',
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

listSchema.index({ user: 1, order: 1 });

export const List = model<IList>('List', listSchema);
