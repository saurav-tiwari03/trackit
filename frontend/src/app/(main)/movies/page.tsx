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
  Sparkles,
  Wand2,
  RefreshCw,
  Settings2,
  ArrowUp,
  ArrowDown,
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

type TimelineSortOption = 
  | 'releaseDate-asc' 
  | 'releaseDate-desc' 
  | 'watchedDate-desc' 
  | 'watchedDate-asc' 
  | 'duration-asc' 
  | 'duration-desc' 
  | 'rating-asc' 
  | 'rating-desc';

const TIMELINE_SORT_OPTIONS: { value: TimelineSortOption; label: string }[] = [
  { value: 'watchedDate-desc', label: 'Watched Date (recent to old)' },
  { value: 'watchedDate-asc', label: 'Watched Date (old to recent)' },
  { value: 'releaseDate-desc', label: 'Release (high to low)' },
  { value: 'releaseDate-asc', label: 'Release (low to high)' },
  { value: 'duration-desc', label: 'Duration (high to low)' },
  { value: 'duration-asc', label: 'Duration (low to high)' },
  { value: 'rating-desc', label: 'Rating (high to low)' },
  { value: 'rating-asc', label: 'Rating (low to high)' },
];

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
  const [showManageCollectionsModal, setShowManageCollectionsModal] = useState(false);
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [timelineSort, setTimelineSort] = useState<TimelineSortOption>('watchedDate-desc');

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
  const filteredMovies = activeCollection
    ? movies.filter(m => m.lists?.includes(activeCollection))
    : movies;

  // Sort movies based on selected sort option
  const sortMovies = (moviesList: Movie[]): Movie[] => {
    return [...moviesList].sort((a, b) => {
      switch (timelineSort) {
        case 'releaseDate-asc':
          return new Date(a.releaseDate || 0).getTime() - new Date(b.releaseDate || 0).getTime();
        case 'releaseDate-desc':
          return new Date(b.releaseDate || 0).getTime() - new Date(a.releaseDate || 0).getTime();
        case 'watchedDate-asc':
          return new Date(a.watchedDate || 0).getTime() - new Date(b.watchedDate || 0).getTime();
        case 'watchedDate-desc':
          return new Date(b.watchedDate || 0).getTime() - new Date(a.watchedDate || 0).getTime();
        case 'duration-asc':
          return (a.runtime || 0) - (b.runtime || 0);
        case 'duration-desc':
          return (b.runtime || 0) - (a.runtime || 0);
        case 'rating-asc':
          return (a.rating || 0) - (b.rating || 0);
        case 'rating-desc':
          return (b.rating || 0) - (a.rating || 0);
        default:
          return new Date(b.watchedDate || 0).getTime() - new Date(a.watchedDate || 0).getTime();
      }
    });
  };

  const displayedMovies = sortMovies(filteredMovies);

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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRecommendModal(true)}
                className="bg-linear-to-r from-violet-500/10 to-purple-500/10 border-violet-500/30 hover:border-violet-500/50"
              >
                <Sparkles className="w-4 h-4 mr-2 text-violet-500" />
                Recommend
              </Button>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Movie
              </Button>
            </div>
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

          {/* Manage Collections Button */}
          {lists.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowManageCollectionsModal(true)}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <Settings2 className="w-4 h-4" />
              Manage
            </Button>
          )}
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

          {/* Sort Dropdown for Grid and List views */}
          {(viewMode === 'grid' || viewMode === 'list') && (
            <Select value={timelineSort} onValueChange={(value) => setTimelineSort(value as TimelineSortOption)}>
              <SelectTrigger className="w-[220px] h-9">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                {TIMELINE_SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
        lists={lists}
        onAddToList={addToList}
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

      {/* Manage Collections Modal */}
      <ManageCollectionsModal
        open={showManageCollectionsModal}
        onOpenChange={setShowManageCollectionsModal}
        collections={lists}
        onReorder={async (listId, direction) => {
          const idx = lists.findIndex(l => l._id === listId);
          const swapWith = direction === 'up' ? idx - 1 : idx + 1;
          if (idx < 0 || swapWith < 0 || swapWith >= lists.length) return;

          const current = lists[idx];
          const other = lists[swapWith];
          try {
            // Swap order values
            await updateList(current._id, { order: other.order });
            await updateList(other._id, { order: current.order });
            await fetchLists();
          } catch (e) {
            console.error('Failed to reorder collections:', e);
            toast.error('Failed to reorder collections');
          }
        }}
        onUpdate={async (id, data) => {
          try {
            await updateList(id, data);
            toast.success('Collection updated');
            await fetchLists();
          } catch (e) {
            console.error('Failed to update collection:', e);
            toast.error('Failed to update collection');
          }
        }}
        onDelete={async (id) => {
          try {
            await deleteList(id);
            if (activeCollection === id) {
              handleCollectionFilter(null);
            }
            toast.success('Collection deleted');
            await fetchLists();
          } catch (e) {
            console.error('Failed to delete collection:', e);
            toast.error('Failed to delete collection');
          }
        }}
      />

      {/* Recommendation Modal */}
      <RecommendationModal
        open={showRecommendModal}
        onOpenChange={setShowRecommendModal}
        watchedCount={stats?.watched || 0}
        onAddToWatchlist={(movie) => {
          toast.success(`"${movie.title}" added to your wishlist!`);
          fetchMovies(); // Refresh the movie list
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
            <div className="relative aspect-2/3">
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
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

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
            <Badge variant="outline" className="text-xs">
              {(() => {
                const totalMinutes = groupedMovies[monthKey].reduce(
                  (sum, movie) => sum + (movie.runtime || 0),
                  0
                );
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                return hours > 0
                  ? `${hours}h ${minutes}m watched`
                  : `${minutes}m watched`;
              })()}
            </Badge>
          </div>

          <div className="ml-6 pl-6 border-l-2 border-muted space-y-4">
            {[...groupedMovies[monthKey]]
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
  lists,
  onAddToList,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddMovie: (data: Partial<Movie>) => Promise<Movie>;
  lists: MovieList[];
  onAddToList: (listId: string, movieId: string) => Promise<void>;
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
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);

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

      const newMovie = await onAddMovie({
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

      // Add movie to selected collections
      if (selectedCollections.length > 0 && newMovie._id) {
        await Promise.all(
          selectedCollections.map((listId) => onAddToList(listId, newMovie._id))
        );
      }

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
    setSelectedCollections([]);
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
                        <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90" />
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
                    <div className="aspect-2/3 rounded-lg overflow-hidden bg-muted flex items-center justify-center relative group">
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
                      <div className="aspect-2/3 bg-muted flex items-center justify-center">
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

              {/* Add to Collection */}
              {lists.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Add to Collection (optional)</label>
                  <div className="flex flex-wrap gap-2">
                    {lists.map((list) => (
                      <button
                        key={list._id}
                        type="button"
                        onClick={() => {
                          if (selectedCollections.includes(list._id)) {
                            setSelectedCollections(selectedCollections.filter(id => id !== list._id));
                          } else {
                            setSelectedCollections([...selectedCollections, list._id]);
                          }
                        }}
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-all',
                          selectedCollections.includes(list._id)
                            ? 'bg-violet-500/10 border-violet-500/50 text-violet-600 dark:text-violet-400'
                            : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50'
                        )}
                      >
                        <span>{list.icon || '📁'}</span>
                        <span>{list.name}</span>
                        {selectedCollections.includes(list._id) && (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
        {/* Visually hidden title for accessibility */}
        <DialogTitle className="sr-only">{movie.title}</DialogTitle>

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
                  <div className="aspect-2/3 bg-muted flex items-center justify-center">
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

// Recommendation Modal Component
interface Recommendation {
  title: string;
  year?: string;
  genres: string[];
  reason: string;
  tmdbSearchQuery: string;
  alternativeRecommendations: Array<{
    title: string;
    year?: string;
    reason: string;
  }>;
}

// Manage Collections Modal Component
function ManageCollectionsModal({
  open,
  onOpenChange,
  collections,
  onReorder,
  onUpdate,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collections: MovieList[];
  onReorder: (id: string, direction: 'up' | 'down') => Promise<void>;
  onUpdate: (id: string, data: Partial<MovieList>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const COLLECTION_ICONS = ['🎬', '🍿', '⭐', '🎯', '💡', '🔥', '💎', '🎭', '🎪', '📺', '🎥', '📽️', '📁', '🧠', '👀'];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [icon, setIcon] = useState('🎬');
  const [isSaving, setIsSaving] = useState(false);

  const startEdit = (c: MovieList) => {
    setEditingId(c._id);
    setName(c.name || '');
    setDescription(c.description || '');
    setColor(c.color || '#6366f1');
    setIcon(c.icon || '🎬');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setColor('#6366f1');
    setIcon('🎬');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!name.trim()) {
      toast.error('Please enter a collection name');
      return;
    }
    setIsSaving(true);
    try {
      await onUpdate(editingId, {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        icon,
      });
      cancelEdit();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) cancelEdit(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-violet-500" />
            Manage Collections
          </DialogTitle>
          <DialogDescription>
            Rename, reorder, and delete collections. Your movies stay safe — only the collection changes.
          </DialogDescription>
        </DialogHeader>

        {collections.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No collections yet. Create one first.
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {collections
              .slice()
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((c, idx, arr) => (
                <div key={c._id} className="rounded-xl border bg-muted/20">
                  <div className="flex items-center justify-between gap-3 p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                        style={{ backgroundColor: `${c.color || '#6366f1'}22`, border: `1px solid ${c.color || '#6366f1'}44` }}
                      >
                        {c.icon || '📁'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="font-medium truncate">{c.name}</p>
                          <Badge variant="outline" className="text-xs">{c.movieCount || 0}</Badge>
                        </div>
                        {c.description ? (
                          <p className="text-xs text-muted-foreground line-clamp-1">{c.description}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">No description</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={idx === 0}
                        onClick={() => onReorder(c._id, 'up')}
                        className="h-8 w-8 p-0"
                        title="Move up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={idx === arr.length - 1}
                        onClick={() => onReorder(c._id, 'down')}
                        className="h-8 w-8 p-0"
                        title="Move down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(c)}
                        className="h-8 w-8 p-0"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          const ok = window.confirm(`Delete collection "${c.name}"? Movies will NOT be deleted.`);
                          if (!ok) return;
                          await onDelete(c._id);
                          if (editingId === c._id) cancelEdit();
                        }}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {editingId === c._id && (
                    <div className="border-t p-4 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Name</label>
                          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Collection name" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Color</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={color}
                              onChange={(e) => setColor(e.target.value)}
                              className="h-10 w-12 rounded-md border bg-transparent p-1"
                            />
                            <Input value={color} onChange={(e) => setColor(e.target.value)} />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Icon</label>
                        <div className="flex flex-wrap gap-2">
                          {COLLECTION_ICONS.map((i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setIcon(i)}
                              className={cn(
                                'w-10 h-10 rounded-lg border flex items-center justify-center text-lg transition-all',
                                icon === i
                                  ? 'border-violet-500 bg-violet-500/10'
                                  : 'border-muted-foreground/30 hover:border-muted-foreground/50'
                              )}
                            >
                              {i}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Description (optional)</label>
                        <Textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="What’s this collection about?"
                          className="min-h-[80px]"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={cancelEdit} disabled={isSaving}>
                          Cancel
                        </Button>
                        <Button className="flex-1" onClick={saveEdit} disabled={isSaving}>
                          {isSaving ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RecommendationModal({
  open,
  onOpenChange,
  watchedCount,
  onAddToWatchlist,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  watchedCount: number;
  onAddToWatchlist?: (movie: TMDBMovie) => void;
}) {
  const [step, setStep] = useState<'select' | 'loading' | 'result'>('select');
  const [contentType, setContentType] = useState<'movie' | 'series' | 'any'>('movie');
  const [mood, setMood] = useState('');
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tmdbResult, setTmdbResult] = useState<TMDBMovie | null>(null);
  const [excludedTitles, setExcludedTitles] = useState<string[]>([]);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [addedToWishlist, setAddedToWishlist] = useState(false);
  const [addedAlternatives, setAddedAlternatives] = useState<Set<string>>(new Set());
  const [addingAlternative, setAddingAlternative] = useState<string | null>(null);
  const [loadingPhase, setLoadingPhase] = useState(0);

  const loadingMessages = [
    { text: 'Analyzing your taste...', icon: '🎬' },
    { text: 'Scanning genres you love...', icon: '🎭' },
    { text: 'Finding hidden gems...', icon: '💎' },
    { text: 'Matching your mood...', icon: '✨' },
    { text: 'Almost there...', icon: '🍿' },
  ];

  const handleGetRecommendation = async (additionalExcluded?: unknown) => {
    // Defensive: React onClick can pass a click event as first argument.
    const additionalExcludedArr = Array.isArray(additionalExcluded) ? additionalExcluded : [];
    setStep('loading');
    setError(null);
    setTmdbResult(null);
    setAddedToWishlist(false);
    setLoadingPhase(0);

    // Cycle through loading messages
    const loadingInterval = setInterval(() => {
      setLoadingPhase(prev => (prev + 1) % loadingMessages.length);
    }, 1500);

    try {
      const allExcluded = [...excludedTitles, ...additionalExcludedArr];

      const response = await moviesAPI.getRecommendation({
        contentType,
        mood: mood.trim() || undefined,
        excludedTitles: allExcluded.length > 0 ? allExcluded : undefined,
      });
      clearInterval(loadingInterval);

      if (response.data.success && response.data.data) {
        const newRec = response.data.data;
        setRecommendation(newRec);
        // Add to excluded list for next "Try Another"
        setExcludedTitles(prev => [...prev, newRec.title]);
        setStep('result');

        // Try to fetch TMDB data for the recommendation
        try {
          const tmdbSearch = await tmdbAPI.search(newRec.tmdbSearchQuery || newRec.title);
          if (tmdbSearch.results && tmdbSearch.results.length > 0) {
            const tmdbDetails = await tmdbAPI.getMovie(tmdbSearch.results[0].id);
            setTmdbResult(tmdbDetails);
          }
        } catch (tmdbError) {
          console.error('TMDB search failed:', tmdbError);
        }
      } else {
        setError(response.data.message || 'Failed to get recommendation');
        setStep('select');
      }
    } catch (err: unknown) {
      console.error('❌ Recommendation API error:', err);
      console.error('❌ Error details:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
      clearInterval(loadingInterval);
      const error = err as { response?: { data?: { message?: string }; status?: number }; message?: string };
      console.error('❌ Response data:', error.response?.data);
      console.error('❌ Response status:', error.response?.status);
      console.error('❌ Error message:', error.message);
      setError(error.response?.data?.message || error.message || 'Failed to get recommendation');
      setStep('select');
    }
  };

  const handleTryAnother = () => {
    // Pass current recommendation title to exclude
    const currentTitle = recommendation?.title;
    handleGetRecommendation(currentTitle ? [currentTitle] : []);
  };

  const handleAddToWishlist = async () => {
    if (!recommendation || isAddingToWishlist) return;

    setIsAddingToWishlist(true);
    try {
      // Use TMDB data if available, otherwise use recommendation data
      await moviesAPI.create({
        tmdbId: tmdbResult?.id,
        title: tmdbResult?.title || recommendation.title,
        originalTitle: tmdbResult?.original_title,
        overview: tmdbResult?.overview || recommendation.reason,
        posterPath: tmdbResult?.poster_path || undefined,
        backdropPath: tmdbResult?.backdrop_path || undefined,
        releaseDate: tmdbResult?.release_date || (recommendation.year ? `${recommendation.year}-01-01` : undefined),
        runtime: tmdbResult?.runtime,
        genres: tmdbResult?.genres?.map((g: { name: string }) => g.name) || recommendation.genres || [],
        voteAverage: tmdbResult?.vote_average,
        status: 'watchlist',
      });
      setAddedToWishlist(true);
      if (tmdbResult) {
        onAddToWatchlist?.(tmdbResult);
      }
    } catch (error) {
      console.error('Failed to add to wishlist:', error);
    } finally {
      setIsAddingToWishlist(false);
    }
  };

  const handleAddAlternativeToWishlist = async (alt: { title: string; year?: string; reason: string }) => {
    if (addingAlternative || addedAlternatives.has(alt.title)) return;

    setAddingAlternative(alt.title);
    try {
      // Try to fetch TMDB data for the alternative
      let tmdbData: TMDBMovie | null = null;
      try {
        const searchResult = await tmdbAPI.search(alt.title);
        if (searchResult.results && searchResult.results.length > 0) {
          tmdbData = await tmdbAPI.getMovie(searchResult.results[0].id);
        }
      } catch {
        // Continue without TMDB data
      }

      await moviesAPI.create({
        tmdbId: tmdbData?.id,
        title: tmdbData?.title || alt.title,
        originalTitle: tmdbData?.original_title,
        overview: tmdbData?.overview || alt.reason,
        posterPath: tmdbData?.poster_path || undefined,
        backdropPath: tmdbData?.backdrop_path || undefined,
        releaseDate: tmdbData?.release_date || (alt.year ? `${alt.year}-01-01` : undefined),
        runtime: tmdbData?.runtime,
        genres: tmdbData?.genres?.map((g: { name: string }) => g.name) || [],
        voteAverage: tmdbData?.vote_average,
        status: 'watchlist',
      });

      setAddedAlternatives(prev => new Set([...prev, alt.title]));
    } catch (error) {
      console.error('Failed to add alternative to wishlist:', error);
    } finally {
      setAddingAlternative(null);
    }
  };

  const resetModal = () => {
    setStep('select');
    setContentType('movie');
    setMood('');
    setRecommendation(null);
    setError(null);
    setTmdbResult(null);
    setExcludedTitles([]);
    setAddedToWishlist(false);
    setAddedAlternatives(new Set());
    setAddingAlternative(null);
    setLoadingPhase(0);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetModal(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            AI Recommendation
          </DialogTitle>
          <DialogDescription>
            Get a personalized recommendation based on your watch history
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 py-4"
            >
              {watchedCount === 0 ? (
                <div className="text-center py-6">
                  <Popcorn className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-2">
                    You haven&apos;t watched any movies yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Add some movies to your watched list to get personalized recommendations
                  </p>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium mb-3 block">
                      What do you want to watch?
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setContentType('movie')}
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                          contentType === 'movie'
                            ? 'bg-violet-500/10 border-violet-500/50 text-violet-600 dark:text-violet-400'
                            : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50'
                        )}
                      >
                        <Film className="w-6 h-6" />
                        <span className="text-sm font-medium">Movie</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setContentType('series')}
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                          contentType === 'series'
                            ? 'bg-violet-500/10 border-violet-500/50 text-violet-600 dark:text-violet-400'
                            : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50'
                        )}
                      >
                        <Tv className="w-6 h-6" />
                        <span className="text-sm font-medium">Series</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setContentType('any')}
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                          contentType === 'any'
                            ? 'bg-violet-500/10 border-violet-500/50 text-violet-600 dark:text-violet-400'
                            : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50'
                        )}
                      >
                        <Wand2 className="w-6 h-6" />
                        <span className="text-sm font-medium">Surprise Me</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Current mood or preference (optional)
                    </label>
                    <Input
                      placeholder="e.g., something light-hearted, a thriller, mind-bending..."
                      value={mood}
                      onChange={(e) => setMood(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Help the AI understand what you&apos;re in the mood for
                    </p>
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                    <BarChart3 className="w-4 h-4 shrink-0" />
                    <span>
                      Based on your {watchedCount} watched {watchedCount === 1 ? 'movie' : 'movies'}
                    </span>
                  </div>

                  <Button
                    onClick={() => handleGetRecommendation()}
                    className="w-full bg-linear-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Get Recommendation
                  </Button>
                </>
              )}
            </motion.div>
          )}

          {step === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center py-16"
            >
              {/* Animated orb with particles */}
              <div className="relative w-32 h-32">
                {/* Outer glow ring */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 blur-2xl"
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />

                {/* Spinning ring */}
                <motion.div
                  className="absolute inset-2 rounded-full border-2 border-violet-500/30"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />

                {/* Counter-spinning ring */}
                <motion.div
                  className="absolute inset-4 rounded-full border-2 border-purple-500/30 border-dashed"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                />

                {/* Center orb */}
                <motion.div
                  className="absolute inset-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/50"
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles className="w-8 h-8 text-white" />
                  </motion.div>
                </motion.div>

                {/* Floating particles */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full bg-violet-400"
                    style={{
                      left: '50%',
                      top: '50%',
                    }}
                    animate={{
                      x: [0, Math.cos(i * 60 * Math.PI / 180) * 50],
                      y: [0, Math.sin(i * 60 * Math.PI / 180) * 50],
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.3,
                      ease: 'easeOut',
                    }}
                  />
                ))}
              </div>

              {/* Loading text with animation */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={loadingPhase}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-8 text-center"
                >
                  <p className="text-2xl mb-2">{loadingMessages[loadingPhase].icon}</p>
                  <p className="text-lg font-medium">{loadingMessages[loadingPhase].text}</p>
                </motion.div>
              </AnimatePresence>

              {/* Progress dots */}
              <div className="flex gap-2 mt-6">
                {loadingMessages.map((_, i) => (
                  <motion.div
                    key={i}
                    className={`w-2 h-2 rounded-full ${i <= loadingPhase ? 'bg-violet-500' : 'bg-muted'}`}
                    animate={i === loadingPhase ? { scale: [1, 1.3, 1] } : {}}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {step === 'result' && recommendation && (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 py-4"
            >
              {/* Success badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
                className="flex justify-center"
              >
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-medium">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 0.5 }}
                  >
                    <Sparkles className="w-4 h-4" />
                  </motion.div>
                  Perfect match found!
                </div>
              </motion.div>

              {/* Main Recommendation */}
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', bounce: 0.3, delay: 0.2 }}
                className="relative rounded-xl border overflow-hidden"
              >
                {tmdbResult?.backdrop_path && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="absolute inset-0"
                  >
                    <img
                      src={tmdbAPI.getImageUrl(tmdbResult.backdrop_path, 'w780') || ''}
                      alt=""
                      className="w-full h-full object-cover opacity-20"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
                  </motion.div>
                )}

                <div className="relative p-4 flex gap-4">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="w-28 shrink-0"
                  >
                    {tmdbResult?.poster_path ? (
                      <div className="rounded-lg overflow-hidden shadow-xl shadow-violet-500/20 ring-2 ring-violet-500/20">
                        <img
                          src={tmdbAPI.getImageUrl(tmdbResult.poster_path, 'w185') || ''}
                          alt={recommendation.title}
                          className="w-full h-auto"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[2/3] rounded-lg bg-muted flex items-center justify-center">
                        <Film className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex-1 min-w-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-xl font-bold">{recommendation.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {recommendation.year || tmdbResult?.release_date?.slice(0, 4)}
                          {tmdbResult?.runtime && ` • ${Math.floor(tmdbResult.runtime / 60)}h ${tmdbResult.runtime % 60}m`}
                        </p>
                      </div>
                      {tmdbResult?.vote_average && tmdbResult.vote_average > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', delay: 0.5 }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span className="text-sm font-semibold">{tmdbResult.vote_average.toFixed(1)}</span>
                        </motion.div>
                      )}
                    </div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="flex flex-wrap gap-1.5 mt-3"
                    >
                      {(recommendation.genres || []).slice(0, 3).map((genre, i) => (
                        <motion.div
                          key={genre}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                        >
                          <Badge variant="secondary" className="text-xs">
                            {genre}
                          </Badge>
                        </motion.div>
                      ))}
                    </motion.div>

                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="text-sm text-muted-foreground mt-3 leading-relaxed"
                    >
                      {recommendation.reason}
                    </motion.p>
                  </motion.div>
                </div>
              </motion.div>

              {/* Add to Wishlist Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Button
                  variant="outline"
                  onClick={handleAddToWishlist}
                  disabled={isAddingToWishlist || addedToWishlist}
                  className={`w-full ${addedToWishlist ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400' : 'hover:bg-violet-500/10 hover:border-violet-500/30'}`}
                >
                  {isAddingToWishlist ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : addedToWishlist ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Added to Wishlist!
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4 mr-2" />
                      Save to Wishlist
                    </>
                  )}
                </Button>
              </motion.div>

              {/* Alternative Recommendations */}
              {recommendation.alternativeRecommendations && recommendation.alternativeRecommendations.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground flex items-center gap-2">
                    <List className="w-4 h-4" />
                    Also consider
                  </h4>
                  <div className="space-y-2">
                    {recommendation.alternativeRecommendations.map((alt, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.9 + index * 0.1 }}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-linear-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center shrink-0">
                          <Film className="w-4 h-4 text-violet-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">
                            {alt.title}
                            {alt.year && <span className="text-muted-foreground"> ({alt.year})</span>}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {alt.reason}
                          </p>
                        </div>
                        {/* Wishlist button for alternative */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddAlternativeToWishlist(alt)}
                          disabled={addingAlternative === alt.title || addedAlternatives.has(alt.title)}
                          className={`shrink-0 h-8 px-2 ${addedAlternatives.has(alt.title) ? 'text-green-500' : 'text-muted-foreground hover:text-violet-500'}`}
                        >
                          {addingAlternative === alt.title ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : addedAlternatives.has(alt.title) ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Heart className="w-4 h-4" />
                          )}
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="flex gap-2 pt-2"
              >
                <Button
                  variant="outline"
                  onClick={handleTryAnother}
                  className="flex-1 group"
                >
                  <RefreshCw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                  Try Another
                </Button>
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    resetModal();
                  }}
                  className="flex-1 bg-linear-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Done
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
