import { Schema, model, Document, Types } from 'mongoose';

export interface IGroceryItem {
  _id: Types.ObjectId;
  name: string;
  quantity?: number;
  unit?: string;
  isCompleted: boolean;
  order: number;
  createdAt: Date;
}

export interface IGroceryList extends Document {
  _id: Types.ObjectId;
  name: string;
  user: Types.ObjectId;
  items: IGroceryItem[];
  color?: string;
  icon?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const groceryItemSchema = new Schema<IGroceryItem>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    default: 1,
  },
  unit: {
    type: String,
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const groceryListSchema = new Schema<IGroceryList>(
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
    items: [groceryItemSchema],
    color: {
      type: String,
      default: '#6b7280',
    },
    icon: {
      type: String,
      default: 'shopping-cart',
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

// Index for faster queries
groceryListSchema.index({ user: 1, order: 1 });

export const GroceryList = model<IGroceryList>('GroceryList', groceryListSchema);
