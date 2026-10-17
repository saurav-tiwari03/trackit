import { Schema, model, Document, Types } from 'mongoose';

export type MovieStatus = 'watched' | 'watching' | 'watchlist';
export type MoviePlatform = 'netflix' | 'prime' | 'disney' | 'hbo' | 'apple' | 'theater' | 'bluray' | 'other';

export interface IMovie extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  
  // Movie details (from TMDB or manual)
  tmdbId?: number;
  title: string;
  originalTitle?: string;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  releaseDate?: string;
  runtime?: number;
  genres?: string[];
  voteAverage?: number;
  
  // User's personal data
  status: MovieStatus;
  rating?: number; // 1-10
  review?: string;
  watchedDate?: Date;
  plannedDate?: Date;
  platform?: MoviePlatform;
  rewatchCount: number;
  isFavorite: boolean;
  tags?: string[];
  notes?: string;
  
  // For collections/lists
  lists?: Types.ObjectId[];
  
  createdAt: Date;
  updatedAt: Date;
}

const movieSchema = new Schema<IMovie>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // Movie details
    tmdbId: {
      type: Number,
      sparse: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    originalTitle: {
      type: String,
      trim: true,
    },
    overview: {
      type: String,
    },
    posterPath: {
      type: String,
    },
    backdropPath: {
      type: String,
    },
    releaseDate: {
      type: String,
    },
    runtime: {
      type: Number,
    },
    genres: [{
      type: String,
    }],
    voteAverage: {
      type: Number,
    },
    
    // User's personal data
    status: {
      type: String,
      enum: ['watched', 'watching', 'watchlist'],
      default: 'watchlist',
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 10,
    },
    review: {
      type: String,
    },
    watchedDate: {
      type: Date,
    },
    plannedDate: {
      type: Date,
    },
    platform: {
      type: String,
      enum: ['netflix', 'prime', 'disney', 'hbo', 'apple', 'theater', 'bluray', 'other'],
    },
    rewatchCount: {
      type: Number,
      default: 0,
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    notes: {
      type: String,
    },
    lists: [{
      type: Schema.Types.ObjectId,
      ref: 'MovieList',
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
movieSchema.index({ user: 1, status: 1 });
movieSchema.index({ user: 1, watchedDate: -1 });
movieSchema.index({ user: 1, tmdbId: 1 }, { unique: true, sparse: true });
movieSchema.index({ user: 1, isFavorite: 1 });
movieSchema.index({ user: 1, createdAt: -1 });

export const Movie = model<IMovie>('Movie', movieSchema);

// Movie List for custom collections
export interface IMovieList extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isPublic: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const movieListSchema = new Schema<IMovieList>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    color: {
      type: String,
      default: '#6366f1',
    },
    icon: {
      type: String,
      default: '🎬',
    },
    isPublic: {
      type: Boolean,
      default: false,
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

movieListSchema.index({ user: 1, order: 1 });

export const MovieList = model<IMovieList>('MovieList', movieListSchema);
