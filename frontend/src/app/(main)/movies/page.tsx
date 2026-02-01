'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Film,
  Plus,
  Search,
  Heart,
  Star,
  Clock,
  Eye,
  List,
  Grid3X3,
  Calendar as CalendarIcon,
  Loader2,
  X,
  Check,
  ChevronDown,
  Play,
  Popcorn,
  TrendingUp,
  Timer,
  Tv,
  BarChart3,
  ExternalLink,
  Trash2,
  Edit,
  MoreHorizontal,
  Upload,
  Link,
  ImageIcon,
  FolderPlus,
  Folder,
  Share2,
  CheckCircle2,
} from 'lucide-react';
import { Movie, MovieStatus, MoviePlatform, TMDBMovie, MovieStats, MovieList } from '@/types';
import { moviesAPI, tmdbAPI } from '@/lib/api';
import { useMoviesStore } from '@/store/movies';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';
import DotBackgroundDemo from '@/components/ui/dot-background-demo';

const STATUS_CONFIG: { value: MovieStatus; label: string; icon: typeof Eye; color: string; bgColor: string }[] = [
  { value: 'watched', label: 'Watched', icon: Check, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  { value: 'watching', label: 'Watching', icon: Play, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { value: 'watchlist', label: 'Watchlist', icon: Clock, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
];

const PLATFORM_CONFIG: { value: MoviePlatform; label: string; color: string }[] = [
  { value: 'netflix', label: 'Netflix', color: '#E50914' },
  { value: 'prime', label: 'Prime Video', color: '#00A8E1' },
  { value: 'disney', label: 'Disney+', color: '#113CCF' },
  { value: 'hbo', label: 'HBO Max', color: '#B800CC' },
  { value: 'apple', label: 'Apple TV+', color: '#000000' },
  { value: 'theater', label: 'Theater', color: '#FFC107' },
  { value: 'bluray', label: 'Blu-ray/DVD', color: '#0066CC' },
  { value: 'other', label: 'Other', color: '#6B7280' },
];

const GENRE_OPTIONS = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
  'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery',
  'Romance', 'Science Fiction', 'Thriller', 'War', 'Western',
];

// Helper to get poster URL - handles both TMDB paths and direct URLs
const getPosterUrl = (posterPath: string | null | undefined, size: 'w92' | 'w154' | 'w342' | 'w500' = 'w342') => {
  if (!posterPath) return null;
  // If it's already a full URL, return as-is
  if (posterPath.startsWith('http://') || posterPath.startsWith('https://')) {
    return posterPath;
  }
  // Otherwise, treat as TMDB path
  return tmdbAPI.getImageUrl(posterPath, size);
};

type ViewMode = 'grid' | 'list' | 'timeline';

export default function MoviesPage() {
  const {
    movies,
    lists,
    stats,
    isLoading,
    filter,
    fetchMovies,
    fetchStats,
    fetchLists,
    addMovie,
    updateMovie,
    deleteMovie,
    toggleFavorite,
    markWatched,
    setFilter,
    createList,
    updateList,
    deleteList,
    addToList,
    removeFromList,
  } = useMoviesStore();

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Initialize from localStorage on client
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('trackit-movies-view');
      if (saved === 'grid' || saved === 'list' || saved === 'timeline') {
        return saved;
      }
    }
    return 'grid';
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMovieModal, setShowMovieModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCollection, setActiveCollection] = useState<string | null>(null);

  // Persist viewMode to localStorage
  useEffect(() => {
    localStorage.setItem('trackit-movies-view', viewMode);
  }, [viewMode]);

  useEffect(() => {
    fetchMovies();
    fetchStats();
    fetchLists();
  }, [fetchMovies, fetchStats, fetchLists]);

  const handleStatusFilter = (status: MovieStatus | 'all' | 'favorites') => {
    setActiveCollection(null); // Clear collection filter when using status filter
    if (status === 'favorites') {
      setFilter({ status: undefined, isFavorite: true });
    } else if (status === 'all') {
      setFilter({ status: undefined, isFavorite: undefined });
    } else {
      setFilter({ status, isFavorite: undefined });
    }
  };

  const handleCollectionFilter = (collectionId: string | null) => {
    setActiveCollection(collectionId);
    if (collectionId) {
      // Clear status filters when filtering by collection
      setFilter({ status: undefined, isFavorite: undefined });
    }
  };

  // Filter movies by collection if one is selected
  const displayedMovies = activeCollection
    ? movies.filter(m => m.lists?.includes(activeCollection))
    : movies;

  const handleToggleFavorite = async (id: string) => {
    const movie = movies.find(m => m._id === id);
    await toggleFavorite(id);
    if (movie) {
      toast.success(movie.isFavorite ? 'Removed from favorites' : 'Added to favorites');
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    // Debounce search
    const timer = setTimeout(() => {
      setFilter({ search: query || undefined });
    }, 300);
    return () => clearTimeout(timer);
  };

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovie(movie);
    setShowMovieModal(true);
  };

  const formatRuntime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const totalWatchTime = stats?.totalRuntime || 0;
  const formattedWatchTime = formatRuntime(totalWatchTime);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="relative z-0 overflow-hidden border-b">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-80">
          <div className="h-full w-full translate-y-32">
            <DotBackgroundDemo />
          </div>
        </div>
        <div className="relative z-10 px-6 py-4 bg-background/40 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Film className="w-6 h-6 text-violet-500" />
                Movies
              </h1>
              <p className="text-sm text-muted-foreground">Track your movie journey</p>
            </div>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Movie
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleStatusFilter('all')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/10">
                  <Film className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.total || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Movies</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleStatusFilter('watched')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Check className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.watched || 0}</p>
                  <p className="text-xs text-muted-foreground">Watched</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleStatusFilter('watchlist')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.watchlist || 0}</p>
                  <p className="text-xs text-muted-foreground">Watchlist</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Timer className="w-5 h-5 text-blue-500" />
                </div>
                <div>
<p className="text-2xl font-bold">{formattedWatchTime}</p>
                      <p className="text-xs text-muted-foreground">Watch Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant={!filter.status && !filter.isFavorite ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleStatusFilter('all')}
            className="gap-2"
          >
            <Film className="w-4 h-4" />
            All
            <Badge variant="outline" className="ml-1 text-xs">{stats?.total || 0}</Badge>
          </Button>
          {STATUS_CONFIG.map((s) => (
            <Button
              key={s.value}
              variant={filter.status === s.value ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleStatusFilter(s.value)}
              className="gap-2"
            >
              <s.icon className={cn('w-4 h-4', s.color)} />
              {s.label}
              <Badge variant="outline" className="ml-1 text-xs">
                {s.value === 'watched' ? stats?.watched || 0 : 
                 s.value === 'watching' ? stats?.watching || 0 : 
                 stats?.watchlist || 0}
              </Badge>
            </Button>
          ))}
          <Button
            variant={filter.isFavorite ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleStatusFilter('favorites')}
            className="gap-2"
          >
            <Heart className={cn('w-4 h-4', filter.isFavorite ? 'fill-red-500 text-red-500' : 'text-red-500')} />
            Favorites
            <Badge variant="outline" className="ml-1 text-xs">{stats?.favorites || 0}</Badge>
          </Button>

          {/* Separator */}
          {lists.length > 0 && (
            <div className="w-px h-6 bg-border mx-1" />
          )}

          {/* Collections */}
          {lists.map((collection) => (
            <Button
              key={collection._id}
              variant={activeCollection === collection._id ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleCollectionFilter(activeCollection === collection._id ? null : collection._id)}
              className="gap-2"
            >
              <span className="text-base">{collection.icon || '📁'}</span>
              {collection.name}
              <Badge variant="outline" className="ml-1 text-xs">{collection.movieCount || 0}</Badge>
            </Button>
          ))}

          {/* Create Collection Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCollectionModal(true)}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <FolderPlus className="w-4 h-4" />
            New Collection
          </Button>
        </div>

        {/* Search & View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search movies..."
              value={searchQuery}
              onChange={handleSearch}
              className="pl-9"
            />
          </div>

          <div className="flex rounded-lg border bg-muted/50 p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'timeline' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('timeline')}
            >
              <CalendarIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Movies Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : displayedMovies.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Popcorn className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">
                {activeCollection ? 'No movies in this collection' : 'No movies yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {activeCollection
                  ? 'Add movies to this collection from the movie details'
                  : 'Start tracking your movie journey by adding your first movie'}
              </p>
              {!activeCollection && (
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Movie
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {viewMode === 'grid' && (
              <MovieGrid movies={displayedMovies} onMovieClick={handleMovieClick} onToggleFavorite={handleToggleFavorite} />
            )}
            {viewMode === 'list' && (
              <MovieListView movies={displayedMovies} onMovieClick={handleMovieClick} onToggleFavorite={handleToggleFavorite} formatRuntime={formatRuntime} />
            )}
            {viewMode === 'timeline' && (
              <MovieTimeline movies={displayedMovies.filter(m => m.status === 'watched' && m.watchedDate)} onMovieClick={handleMovieClick} />
            )}
          </>
        )}
      </div>

      {/* Add Movie Modal */}
      <AddMovieModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onAddMovie={addMovie}
      />

      {/* Movie Detail Modal */}
      <MovieDetailModal
        movie={selectedMovie}
        open={showMovieModal}
        onOpenChange={setShowMovieModal}
        onUpdate={updateMovie}
        onDelete={deleteMovie}
        onToggleFavorite={handleToggleFavorite}
        onMarkWatched={markWatched}
        lists={lists}
        onAddToList={addToList}
        onRemoveFromList={removeFromList}
      />

      {/* Create Collection Modal */}
      <CreateCollectionModal
        open={showCollectionModal}
        onOpenChange={setShowCollectionModal}
        onCreateCollection={async (data) => {
          await createList(data);
          toast.success('Collection created!');
        }}
      />
    </div>
  );
}

// Movie Grid Component
function MovieGrid({
  movies,
  onMovieClick,
  onToggleFavorite,
}: {
  movies: Movie[];
  onMovieClick: (movie: Movie) => void;
  onToggleFavorite: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
    >
      {movies.map((movie, index) => (
        <motion.div
          key={movie._id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
        >
          <Card
            className="group cursor-pointer overflow-hidden hover:shadow-lg transition-all"
            onClick={() => onMovieClick(movie)}
          >
            <div className="relative aspect-[2/3]">
              {movie.posterPath ? (
                <img
                  src={getPosterUrl(movie.posterPath, 'w342') || ''}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Film className="w-12 h-12 text-muted-foreground/30" />
                </div>
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Status Badge */}
              <div className="absolute top-2 left-2">
                {STATUS_CONFIG.map((s) =>
                  s.value === movie.status ? (
                    <Badge
                      key={s.value}
                      className={cn('text-xs', s.bgColor, s.color)}
                      variant="secondary"
                    >
                      {s.label}
                    </Badge>
                  ) : null
                )}
              </div>

              {/* Favorite Button */}
              <button
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(movie._id);
                }}
              >
                <Heart
                  className={cn(
                    'w-4 h-4',
                    movie.isFavorite ? 'fill-red-500 text-red-500' : 'text-white'
                  )}
                />
              </button>

              {/* Rating */}
              {movie.rating && (
                <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-white text-xs">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  {movie.rating}
                </div>
              )}
            </div>

            <CardContent className="p-3">
              <h3 className="font-medium text-sm truncate">{movie.title}</h3>
              <p className="text-xs text-muted-foreground">
                {movie.releaseDate?.slice(0, 4) || 'Unknown'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}

// Movie List View Component
function MovieListView({
  movies,
  onMovieClick,
  onToggleFavorite,
  formatRuntime,
}: {
  movies: Movie[];
  onMovieClick: (movie: Movie) => void;
  onToggleFavorite: (id: string) => void;
  formatRuntime: (minutes: number) => string;
}) {
  return (
    <div className="space-y-2">
      {movies.map((movie, index) => (
        <motion.div
          key={movie._id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.02 }}
        >
          <Card
            className="cursor-pointer hover:shadow-md transition-all"
            onClick={() => onMovieClick(movie)}
          >
            <CardContent className="p-3 flex items-center gap-4">
              <div className="w-12 h-18 shrink-0 rounded overflow-hidden">
                {movie.posterPath ? (
                  <img
                    src={getPosterUrl(movie.posterPath, 'w92') || ''}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Film className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate">{movie.title}</h3>
                  {movie.isFavorite && (
                    <Heart className="w-4 h-4 fill-red-500 text-red-500 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{movie.releaseDate?.slice(0, 4)}</span>
                  {movie.runtime && <span>{formatRuntime(movie.runtime)}</span>}
                  {movie.genres && movie.genres.length > 0 && (
                    <span className="truncate">{movie.genres.slice(0, 2).join(', ')}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {movie.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{movie.rating}</span>
                  </div>
                )}

                {STATUS_CONFIG.map((s) =>
                  s.value === movie.status ? (
                    <Badge
                      key={s.value}
                      className={cn('text-xs', s.bgColor, s.color)}
                      variant="secondary"
                    >
                      {s.label}
                    </Badge>
                  ) : null
                )}

                {movie.platform && (
                  <Badge variant="outline" className="text-xs">
                    {PLATFORM_CONFIG.find((p) => p.value === movie.platform)?.label}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// Movie Timeline Component
function MovieTimeline({
  movies,
  onMovieClick,
}: {
  movies: Movie[];
  onMovieClick: (movie: Movie) => void;
}) {
  // Group movies by month
  const groupedMovies: Record<string, Movie[]> = {};
  movies.forEach((movie) => {
    if (movie.watchedDate) {
      const date = new Date(movie.watchedDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groupedMovies[key]) {
        groupedMovies[key] = [];
      }
      groupedMovies[key].push(movie);
    }
  });

  const sortedMonths = Object.keys(groupedMovies).sort((a, b) => b.localeCompare(a));

  const formatMonth = (key: string) => {
    const [year, month] = key.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (sortedMonths.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">No watched movies with dates</h3>
          <p className="text-muted-foreground">
            Mark movies as watched with a date to see them on your timeline
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {sortedMonths.map((monthKey) => (
        <div key={monthKey}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-violet-500" />
            <h2 className="text-lg font-semibold">{formatMonth(monthKey)}</h2>
            <Badge variant="secondary" className="text-xs">
              {groupedMovies[monthKey].length} movies
            </Badge>
          </div>

          <div className="ml-6 pl-6 border-l-2 border-muted space-y-4">
            {groupedMovies[monthKey]
              .sort((a, b) => new Date(b.watchedDate!).getTime() - new Date(a.watchedDate!).getTime())
              .map((movie) => (
                <motion.div
                  key={movie._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative"
                >
                  <div className="absolute -left-[31px] top-4 w-3 h-3 rounded-full bg-background border-2 border-violet-500" />

                  <Card
                    className="cursor-pointer hover:shadow-md transition-all"
                    onClick={() => onMovieClick(movie)}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-16 h-24 shrink-0 rounded overflow-hidden">
                        {movie.posterPath ? (
                          <img
                            src={getPosterUrl(movie.posterPath, 'w154') || ''}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Film className="w-8 h-8 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">
                          {new Date(movie.watchedDate!).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                        <h3 className="font-medium">{movie.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          {movie.rating && (
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              {movie.rating}/10
                            </div>
                          )}
                          {movie.platform && (
                            <Badge variant="outline" className="text-xs">
                              {PLATFORM_CONFIG.find((p) => p.value === movie.platform)?.label}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Add Movie Modal Component
function AddMovieModal({
  open,
  onOpenChange,
  onAddMovie,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddMovie: (data: Partial<Movie>) => Promise<Movie>;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBMovie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTMDB, setSelectedTMDB] = useState<TMDBMovie | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form state
  const [status, setStatus] = useState<MovieStatus>('watchlist');
  const [rating, setRating] = useState<number | undefined>();
  const [platform, setPlatform] = useState<MoviePlatform | undefined>();
  const [watchedDate, setWatchedDate] = useState<string>('');
  const [notes, setNotes] = useState('');
  
  // Manual entry fields
  const [manualPosterUrl, setManualPosterUrl] = useState('');
  const [manualGenres, setManualGenres] = useState<string[]>([]);
  const [manualRuntime, setManualRuntime] = useState<string>('');
  const [review, setReview] = useState('');

  const searchTMDB = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const result = await tmdbAPI.search(query);
      setSearchResults(result.results || []);
    } catch (error) {
      console.error('TMDB search error:', error);
      toast.error('Failed to search movies');
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchTMDB(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchTMDB]);

  const handleSelectMovie = async (tmdbMovie: TMDBMovie) => {
    // Fetch full movie details
    try {
      const details = await tmdbAPI.getMovie(tmdbMovie.id);
      setSelectedTMDB(details);
    } catch (error) {
      // Use basic info if details fetch fails
      setSelectedTMDB(tmdbMovie);
    }
  };

  const handleAddMovie = async () => {
    if (!selectedTMDB || !selectedTMDB.title.trim()) {
      toast.error('Please enter a movie title');
      return;
    }

    setIsAdding(true);
    try {
      const isManualEntry = selectedTMDB.id === 0;
      
      await onAddMovie({
        // Only include tmdbId for TMDB entries
        ...(isManualEntry ? {} : { tmdbId: selectedTMDB.id }),
        title: selectedTMDB.title,
        originalTitle: selectedTMDB.original_title,
        overview: selectedTMDB.overview || undefined,
        // Use manual poster URL for manual entries, TMDB path for TMDB entries
        posterPath: isManualEntry ? (manualPosterUrl || undefined) : (selectedTMDB.poster_path || undefined),
        backdropPath: selectedTMDB.backdrop_path || undefined,
        releaseDate: selectedTMDB.release_date || undefined,
        // Use manual runtime for manual entries
        runtime: isManualEntry ? (manualRuntime ? Number(manualRuntime) : undefined) : selectedTMDB.runtime,
        // Use manual genres for manual entries, TMDB genres for TMDB entries
        genres: isManualEntry ? manualGenres : (selectedTMDB.genres?.map((g) => g.name) || []),
        voteAverage: isManualEntry ? undefined : selectedTMDB.vote_average,
        status,
        rating: status === 'watched' ? rating : undefined,
        review: review || undefined,
        watchedDate: status === 'watched' ? watchedDate || new Date().toISOString() : undefined,
        platform: status === 'watched' ? platform : undefined,
        notes,
      });

      toast.success('Movie added successfully!');
      onOpenChange(false);
      resetForm();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to add movie');
    } finally {
      setIsAdding(false);
    }
  };

  const resetForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedTMDB(null);
    setStatus('watchlist');
    setRating(undefined);
    setPlatform(undefined);
    setWatchedDate('');
    setNotes('');
    setManualPosterUrl('');
    setManualGenres([]);
    setManualRuntime('');
    setReview('');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="w-5 h-5 text-violet-500" />
            Add Movie
          </DialogTitle>
          <DialogDescription>
            Search for a movie to add to your collection
          </DialogDescription>
        </DialogHeader>

        {!selectedTMDB ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search for a movie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((movie) => (
                    <Card
                      key={movie.id}
                      className="cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => handleSelectMovie(movie)}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="w-12 h-18 shrink-0 rounded overflow-hidden bg-muted">
                          {movie.poster_path ? (
                            <img
                              src={tmdbAPI.getImageUrl(movie.poster_path, 'w92') || ''}
                              alt={movie.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Film className="w-6 h-6 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{movie.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {movie.release_date?.slice(0, 4) || 'Unknown'}
                          </p>
                          {movie.vote_average > 0 && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              {movie.vote_average.toFixed(1)}
                            </div>
                          )}
                        </div>
                        <ChevronDown className="w-4 h-4 text-muted-foreground rotate-[-90deg]" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No movies found in TMDB</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedTMDB({
                        id: 0,
                        title: searchQuery,
                        original_title: searchQuery,
                        overview: '',
                        poster_path: null,
                        backdrop_path: null,
                        release_date: '',
                        vote_average: 0,
                        vote_count: 0,
                        popularity: 0,
                      });
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add "{searchQuery}" manually
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Start typing to search for movies
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Manual Entry indicator */}
            {selectedTMDB.id === 0 && (
              <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Adding movie manually. Fill in the details below.
                </p>
              </div>
            )}

            <div className="flex gap-4 mb-6">
              <div className="w-32 shrink-0">
                {selectedTMDB.id === 0 ? (
                  <div className="space-y-2">
                    <div className="aspect-[2/3] rounded-lg overflow-hidden bg-muted flex items-center justify-center relative group">
                      {manualPosterUrl ? (
                        <>
                          <img
                            src={manualPosterUrl}
                            alt={selectedTMDB.title}
                            className="w-full h-full object-cover"
                            onError={() => setManualPosterUrl('')}
                          />
                          <button
                            type="button"
                            onClick={() => setManualPosterUrl('')}
                            className="absolute top-1 right-1 p-1 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </>
                      ) : (
                        <div className="text-center p-2">
                          <ImageIcon className="w-8 h-8 mx-auto mb-1 text-muted-foreground/40" />
                          <p className="text-[10px] text-muted-foreground">Add poster</p>
                        </div>
                      )}
                    </div>
                    <Input
                      placeholder="Paste poster URL"
                      value={manualPosterUrl}
                      onChange={(e) => setManualPosterUrl(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                ) : (
                  <div className="rounded-lg overflow-hidden">
                    {selectedTMDB.poster_path ? (
                      <img
                        src={tmdbAPI.getImageUrl(selectedTMDB.poster_path, 'w342') || ''}
                        alt={selectedTMDB.title}
                        className="w-full h-auto"
                      />
                    ) : (
                      <div className="aspect-[2/3] bg-muted flex items-center justify-center">
                        <Film className="w-12 h-12 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1">
                {selectedTMDB.id === 0 ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Movie Title *</label>
                      <Input
                        value={selectedTMDB.title}
                        onChange={(e) =>
                          setSelectedTMDB({ ...selectedTMDB, title: e.target.value })
                        }
                        placeholder="Enter movie title"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Release Year</label>
                      <Input
                        type="number"
                        value={selectedTMDB.release_date?.slice(0, 4) || ''}
                        onChange={(e) =>
                          setSelectedTMDB({
                            ...selectedTMDB,
                            release_date: e.target.value ? `${e.target.value}-01-01` : '',
                          })
                        }
                        placeholder="e.g., 2025"
                        min="1900"
                        max={new Date().getFullYear() + 1}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Runtime (minutes)</label>
                      <Input
                        type="number"
                        value={manualRuntime}
                        onChange={(e) => setManualRuntime(e.target.value)}
                        placeholder="e.g., 120"
                        min="1"
                        max="600"
                      />
                      {manualRuntime && Number(manualRuntime) > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          = {Math.floor(Number(manualRuntime) / 60)}h {Number(manualRuntime) % 60}m
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Genres</label>
                      <div className="flex flex-wrap gap-1.5">
                        {GENRE_OPTIONS.map((genre) => (
                          <button
                            key={genre}
                            type="button"
                            onClick={() => {
                              if (manualGenres.includes(genre)) {
                                setManualGenres(manualGenres.filter((g) => g !== genre));
                              } else {
                                setManualGenres([...manualGenres, genre]);
                              }
                            }}
                            className={cn(
                              'px-2 py-0.5 text-xs rounded-full border transition-colors',
                              manualGenres.includes(genre)
                                ? 'bg-violet-500/20 border-violet-500/50 text-violet-400'
                                : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50'
                            )}
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-semibold">{selectedTMDB.title}</h3>
                    <p className="text-muted-foreground mb-2">
                      {selectedTMDB.release_date?.slice(0, 4)}
                      {selectedTMDB.runtime && ` • ${Math.floor(selectedTMDB.runtime / 60)}h ${selectedTMDB.runtime % 60}m`}
                    </p>
                    {selectedTMDB.vote_average > 0 && (
                      <div className="flex items-center gap-1 text-sm mb-2">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        {selectedTMDB.vote_average.toFixed(1)} TMDB
                      </div>
                    )}
                    {selectedTMDB.overview && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {selectedTMDB.overview}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <div className="flex gap-2">
                  {STATUS_CONFIG.map((s) => (
                    <Button
                      key={s.value}
                      variant="outline"
                      size="sm"
                      onClick={() => setStatus(s.value)}
                      className={cn(
                        'transition-all',
                        status === s.value
                          ? `${s.bgColor} ${s.color} border-current font-semibold`
                          : 'text-muted-foreground'
                      )}
                    >
                      <s.icon className="w-4 h-4 mr-1" />
                      {s.label}
                    </Button>
                  ))}
                </div>
              </div>

              {status === 'watched' && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Your Rating</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <button
                          key={n}
                          onClick={() => setRating(n)}
                          className={cn(
                            'w-8 h-8 rounded-lg border text-sm font-medium transition-colors',
                            rating && rating >= n
                              ? 'bg-yellow-400 border-yellow-400 text-yellow-900'
                              : 'hover:bg-muted'
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Watch Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !watchedDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {watchedDate
                            ? new Date(watchedDate).toLocaleDateString('en-US', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={watchedDate ? new Date(watchedDate) : undefined}
                          onSelect={(date) =>
                            setWatchedDate(date ? date.toISOString().split('T')[0] : '')
                          }
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                        <div className="flex gap-2 p-3 border-t">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => setWatchedDate(new Date().toISOString().split('T')[0])}
                          >
                            Today
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              const yesterday = new Date();
                              yesterday.setDate(yesterday.getDate() - 1);
                              setWatchedDate(yesterday.toISOString().split('T')[0]);
                            }}
                          >
                            Yesterday
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Platform</label>
                    <Select value={platform} onValueChange={(v) => setPlatform(v as MoviePlatform)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Where did you watch?" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORM_CONFIG.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Review - for manual entries or watched movies */}
              {(selectedTMDB.id === 0 || status === 'watched') && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Your Review {selectedTMDB.id !== 0 && '(optional)'}
                  </label>
                  <Textarea
                    placeholder="Write your thoughts about this movie..."
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">Notes (optional)</label>
                <Textarea
                  placeholder="Add any quick notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={() => setSelectedTMDB(null)} className="flex-1">
                Back
              </Button>
              <Button onClick={handleAddMovie} disabled={isAdding} className="flex-1">
                {isAdding ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Add Movie
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Movie Detail Modal Component
function MovieDetailModal({
  movie,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  onToggleFavorite,
  onMarkWatched,
  lists,
  onAddToList,
  onRemoveFromList,
}: {
  movie: Movie | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, data: Partial<Movie>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleFavorite: (id: string) => Promise<void>;
  onMarkWatched: (id: string, data?: { watchedDate?: string; rating?: number; platform?: string }) => Promise<void>;
  lists: MovieList[];
  onAddToList: (listId: string, movieId: string) => Promise<void>;
  onRemoveFromList: (listId: string, movieId: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [rating, setRating] = useState<number | undefined>();
  const [review, setReview] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (movie) {
      setRating(movie.rating);
      setReview(movie.review || '');
    }
  }, [movie]);

  if (!movie) return null;

  const isInList = (listId: string) => movie.lists?.includes(listId) || false;

  const handleToggleList = async (listId: string) => {
    if (isInList(listId)) {
      await onRemoveFromList(listId, movie._id);
      toast.success('Removed from collection');
    } else {
      await onAddToList(listId, movie._id);
      toast.success('Added to collection');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(movie._id, { rating, review });
      toast.success('Movie updated');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update movie');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this movie?')) {
      await onDelete(movie._id);
      toast.success('Movie deleted');
      onOpenChange(false);
    }
  };

  const handleMarkWatched = async () => {
    await onMarkWatched(movie._id, { watchedDate: new Date().toISOString() });
    toast.success('Marked as watched!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Backdrop */}
        {movie.backdropPath && (
          <div className="relative h-48 overflow-hidden">
            <img
              src={tmdbAPI.getImageUrl(movie.backdropPath, 'w780') || ''}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex gap-4">
            {/* Poster */}
            <div className="w-32 shrink-0 -mt-16 relative z-10">
              <div className="rounded-lg overflow-hidden shadow-lg">
                {movie.posterPath ? (
                  <img
                    src={getPosterUrl(movie.posterPath, 'w342') || ''}
                    alt={movie.title}
                    className="w-full h-auto"
                  />
                ) : (
                  <div className="aspect-[2/3] bg-muted flex items-center justify-center">
                    <Film className="w-12 h-12 text-muted-foreground/30" />
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 pt-2">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{movie.title}</h2>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    {movie.releaseDate && <span>{movie.releaseDate.slice(0, 4)}</span>}
                    {movie.runtime && (
                      <span>
                        {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onToggleFavorite(movie._id)}
                  >
                    <Heart
                      className={cn(
                        'w-5 h-5',
                        movie.isFavorite ? 'fill-red-500 text-red-500' : ''
                      )}
                    />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setIsEditing(true)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Genres */}
              {movie.genres && movie.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {movie.genres.map((genre) => (
                    <Badge key={genre} variant="secondary">
                      {genre}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Status & Platform */}
              <div className="flex items-center gap-3 mt-4">
                {STATUS_CONFIG.map((s) =>
                  s.value === movie.status ? (
                    <Badge
                      key={s.value}
                      className={cn(s.bgColor, s.color)}
                      variant="secondary"
                    >
                      <s.icon className="w-3 h-3 mr-1" />
                      {s.label}
                    </Badge>
                  ) : null
                )}
                {movie.platform && (
                  <Badge variant="outline">
                    {PLATFORM_CONFIG.find((p) => p.value === movie.platform)?.label}
                  </Badge>
                )}
                {movie.watchedDate && (
                  <span className="text-sm text-muted-foreground">
                    Watched on{' '}
                    {new Date(movie.watchedDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </div>

              {/* Actions for non-watched movies */}
              {movie.status !== 'watched' && (
                <div className="mt-4">
                  <Button onClick={handleMarkWatched}>
                    <Check className="w-4 h-4 mr-2" />
                    Mark as Watched
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Collections */}
          {lists.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Folder className="w-4 h-4" />
                Collections
              </h3>
              <div className="flex flex-wrap gap-2">
                {lists.map((list) => (
                  <button
                    key={list._id}
                    onClick={() => handleToggleList(list._id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-all',
                      isInList(list._id)
                        ? 'bg-violet-500/10 border-violet-500/50 text-violet-600 dark:text-violet-400'
                        : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50'
                    )}
                  >
                    <span>{list.icon || '📁'}</span>
                    <span>{list.name}</span>
                    {isInList(list._id) && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-violet-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Overview */}
          {movie.overview && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Overview</h3>
              <p className="text-muted-foreground">{movie.overview}</p>
            </div>
          )}

          {/* Rating */}
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Your Rating</h3>
            {isEditing || !movie.rating ? (
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    className={cn(
                      'w-8 h-8 rounded-lg border text-sm font-medium transition-colors',
                      rating && rating >= n
                        ? 'bg-yellow-400 border-yellow-400 text-yellow-900'
                        : 'hover:bg-muted'
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="text-xl font-bold">{movie.rating}</span>
                  <span className="text-muted-foreground">/10</span>
                </div>
              </div>
            )}
          </div>

          {/* Review */}
          {(isEditing || movie.review) && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Your Review</h3>
              {isEditing ? (
                <Textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Write your thoughts about this movie..."
                  rows={3}
                />
              ) : (
                <p className="text-muted-foreground">{movie.review}</p>
              )}
            </div>
          )}

          {/* TMDB Rating */}
          {movie.voteAverage && movie.voteAverage > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">TMDB Rating</h3>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-green-500 text-green-500" />
                <span className="text-lg font-semibold">{movie.voteAverage.toFixed(1)}</span>
                <span className="text-muted-foreground">/10</span>
              </div>
            </div>
          )}

          {/* Save Button */}
          {isEditing && (
            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Create Collection Modal Component
function CreateCollectionModal({
  open,
  onOpenChange,
  onCreateCollection,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateCollection: (data: { name: string; description?: string; color?: string; icon?: string }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🎬');
  const [isCreating, setIsCreating] = useState(false);

  const COLLECTION_ICONS = ['🎬', '🍿', '⭐', '🎯', '💡', '🔥', '💎', '🎭', '🎪', '📺', '🎥', '📽️'];

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Please enter a collection name');
      return;
    }

    setIsCreating(true);
    try {
      await onCreateCollection({
        name: name.trim(),
        description: description.trim() || undefined,
        icon,
      });
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to create collection');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setIcon('🎬');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-violet-500" />
            Create Collection
          </DialogTitle>
          <DialogDescription>
            Create a custom collection to organize your movies
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Icon</label>
            <div className="flex flex-wrap gap-2">
              {COLLECTION_ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all',
                    icon === i
                      ? 'ring-2 ring-violet-500 bg-violet-500/10'
                      : 'bg-muted hover:bg-accent'
                  )}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Name *</label>
            <Input
              placeholder="e.g., My Recommendations, Must Watch"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Description (optional)</label>
            <Textarea
              placeholder="What's this collection about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            <Share2 className="w-4 h-4 shrink-0" />
            <span>Sharing collections will be available in a future update</span>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
            {isCreating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Create Collection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
