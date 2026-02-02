import { Router, Response } from 'express';
import { Movie, MovieList } from '../models';
import { protect, AuthRequest } from '../middleware/auth';
import { getMovieRecommendation } from '../service/gemini.service';

const router = Router();

// ==================== MOVIES ====================

// Get all movies for the user with filters
router.get('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const {
      status,
      isFavorite,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      limit,
      skip,
    } = req.query;

    const query: Record<string, unknown> = { user: req.user!._id };

    if (status) {
      query.status = status;
    }

    if (isFavorite === 'true') {
      query.isFavorite = true;
    }

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const sort: Record<string, 1 | -1> = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    let moviesQuery = Movie.find(query).sort(sort);

    if (skip) {
      moviesQuery = moviesQuery.skip(Number(skip));
    }

    if (limit) {
      moviesQuery = moviesQuery.limit(Number(limit));
    }

    const movies = await moviesQuery;
    const total = await Movie.countDocuments(query);

    res.json({ success: true, data: movies, total });
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch movies' });
  }
});

// Get movie stats
router.get('/stats', protect, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;

    const [stats] = await Movie.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          watched: { $sum: { $cond: [{ $eq: ['$status', 'watched'] }, 1, 0] } },
          watching: { $sum: { $cond: [{ $eq: ['$status', 'watching'] }, 1, 0] } },
          watchlist: { $sum: { $cond: [{ $eq: ['$status', 'watchlist'] }, 1, 0] } },
          favorites: { $sum: { $cond: ['$isFavorite', 1, 0] } },
          totalRuntime: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'watched'] },
                { $ifNull: ['$runtime', 0] },
                0
              ]
            }
          },
          avgRating: {
            $avg: {
              $cond: [
                { $ne: ['$rating', null] },
                '$rating',
                null
              ]
            }
          },
        },
      },
    ]);

    // Get movies watched this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthCount = await Movie.countDocuments({
      user: userId,
      status: 'watched',
      watchedDate: { $gte: startOfMonth },
    });

    // Get genre breakdown
    const genreStats = await Movie.aggregate([
      { $match: { user: userId, status: 'watched' } },
      { $unwind: '$genres' },
      { $group: { _id: '$genres', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Get platform breakdown
    const platformStats = await Movie.aggregate([
      { $match: { user: userId, status: 'watched', platform: { $exists: true, $ne: null } } },
      { $group: { _id: '$platform', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        total: stats?.total || 0,
        watched: stats?.watched || 0,
        watching: stats?.watching || 0,
        watchlist: stats?.watchlist || 0,
        favorites: stats?.favorites || 0,
        totalRuntime: stats?.totalRuntime || 0,
        avgRating: stats?.avgRating ? Math.round(stats.avgRating * 10) / 10 : null,
        thisMonth: thisMonthCount,
        topGenres: genreStats.map(g => ({ genre: g._id, count: g.count })),
        platforms: platformStats.map(p => ({ platform: p._id, count: p.count })),
      },
    });
  } catch (error) {
    console.error('Error fetching movie stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch movie stats' });
  }
});

// Get timeline (movies by date)
router.get('/timeline', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { year, month } = req.query;
    const userId = req.user!._id;

    const query: Record<string, unknown> = {
      user: userId,
      status: 'watched',
      watchedDate: { $exists: true, $ne: null },
    };

    if (year) {
      const startDate = new Date(Number(year), month ? Number(month) - 1 : 0, 1);
      const endDate = new Date(Number(year), month ? Number(month) : 12, 0, 23, 59, 59);
      query.watchedDate = { $gte: startDate, $lte: endDate };
    }

    const movies = await Movie.find(query)
      .sort({ watchedDate: -1 })
      .select('title posterPath watchedDate rating platform genres runtime');

    // Group by month/year
    const timeline: Record<string, typeof movies> = {};
    movies.forEach(movie => {
      if (movie.watchedDate) {
        const key = `${movie.watchedDate.getFullYear()}-${String(movie.watchedDate.getMonth() + 1).padStart(2, '0')}`;
        if (!timeline[key]) {
          timeline[key] = [];
        }
        timeline[key].push(movie);
      }
    });

    res.json({ success: true, data: timeline });
  } catch (error) {
    console.error('Error fetching movie timeline:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch timeline' });
  }
});

// Get a single movie
router.get('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    const movie = await Movie.findOne({
      _id: req.params.id,
      user: req.user!._id,
    });

    if (!movie) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }

    res.json({ success: true, data: movie });
  } catch (error) {
    console.error('Error fetching movie:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch movie' });
  }
});

// Add a new movie
router.post('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const {
      tmdbId,
      title,
      originalTitle,
      overview,
      posterPath,
      backdropPath,
      releaseDate,
      runtime,
      genres,
      voteAverage,
      status,
      rating,
      review,
      watchedDate,
      plannedDate,
      platform,
      tags,
      notes,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'Movie title is required' });
    }

    // Check if movie with same tmdbId already exists for user
    if (tmdbId) {
      const existing = await Movie.findOne({
        user: req.user!._id,
        tmdbId,
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'This movie is already in your collection',
          existingId: existing._id,
        });
      }
    }

    const movie = await Movie.create({
      user: req.user!._id,
      tmdbId,
      title: title.trim(),
      originalTitle: originalTitle?.trim(),
      overview,
      posterPath,
      backdropPath,
      releaseDate,
      runtime,
      genres,
      voteAverage,
      status: status || 'watchlist',
      rating,
      review,
      watchedDate: watchedDate ? new Date(watchedDate) : undefined,
      plannedDate: plannedDate ? new Date(plannedDate) : undefined,
      platform,
      tags,
      notes,
    });

    res.status(201).json({ success: true, data: movie });
  } catch (error) {
    console.error('Error adding movie:', error);
    res.status(500).json({ success: false, message: 'Failed to add movie' });
  }
});

// Update a movie
router.put('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    const {
      status,
      rating,
      review,
      watchedDate,
      plannedDate,
      platform,
      rewatchCount,
      isFavorite,
      tags,
      notes,
    } = req.body;

    const updateData: Record<string, unknown> = {};

    if (status !== undefined) updateData.status = status;
    if (rating !== undefined) updateData.rating = rating;
    if (review !== undefined) updateData.review = review;
    if (watchedDate !== undefined) updateData.watchedDate = watchedDate ? new Date(watchedDate) : null;
    if (plannedDate !== undefined) updateData.plannedDate = plannedDate ? new Date(plannedDate) : null;
    if (platform !== undefined) updateData.platform = platform;
    if (rewatchCount !== undefined) updateData.rewatchCount = rewatchCount;
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
    if (tags !== undefined) updateData.tags = tags;
    if (notes !== undefined) updateData.notes = notes;

    const movie = await Movie.findOneAndUpdate(
      { _id: req.params.id, user: req.user!._id },
      updateData,
      { new: true }
    );

    if (!movie) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }

    res.json({ success: true, data: movie });
  } catch (error) {
    console.error('Error updating movie:', error);
    res.status(500).json({ success: false, message: 'Failed to update movie' });
  }
});

// Toggle favorite
router.patch('/:id/favorite', protect, async (req: AuthRequest, res: Response) => {
  try {
    const movie = await Movie.findOne({
      _id: req.params.id,
      user: req.user!._id,
    });

    if (!movie) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }

    movie.isFavorite = !movie.isFavorite;
    await movie.save();

    res.json({ success: true, data: movie });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle favorite' });
  }
});

// Mark as watched
router.patch('/:id/watched', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { watchedDate, rating, platform } = req.body;

    const movie = await Movie.findOneAndUpdate(
      { _id: req.params.id, user: req.user!._id },
      {
        status: 'watched',
        watchedDate: watchedDate ? new Date(watchedDate) : new Date(),
        ...(rating && { rating }),
        ...(platform && { platform }),
      },
      { new: true }
    );

    if (!movie) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }

    res.json({ success: true, data: movie });
  } catch (error) {
    console.error('Error marking as watched:', error);
    res.status(500).json({ success: false, message: 'Failed to mark as watched' });
  }
});

// Delete a movie
router.delete('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    const movie = await Movie.findOneAndDelete({
      _id: req.params.id,
      user: req.user!._id,
    });

    if (!movie) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }

    res.json({ success: true, message: 'Movie deleted' });
  } catch (error) {
    console.error('Error deleting movie:', error);
    res.status(500).json({ success: false, message: 'Failed to delete movie' });
  }
});

// ==================== AI RECOMMENDATIONS ====================

// Get AI-powered movie recommendation
router.post('/recommend', protect, async (req: AuthRequest, res: Response) => {
  console.log('📥 /recommend endpoint called');
  try {
    const { contentType = 'movie', mood, excludedTitles = [] } = req.body;
    console.log('📋 Request body:', { contentType, mood, excludedTitlesCount: excludedTitles?.length || 0 });

    // Validate contentType
    if (!['movie', 'series', 'any'].includes(contentType)) {
      console.log('❌ Invalid content type:', contentType);
      return res.status(400).json({
        success: false,
        message: 'Invalid content type. Must be "movie", "series", or "any"'
      });
    }

    // Get user with their Gemini API key, model preference, and shown recommendations
    console.log('👤 Fetching user data for:', req.user!._id);
    const { User } = await import('../models');
    const user = await User.findById(req.user!._id).select('+geminiApiKey geminiModel shownRecommendations');

    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userApiKey = user?.geminiApiKey;
    const validModels = (await import('../service/gemini.service')).GEMINI_MODELS.map(m => m.id) as string[];
    const rawUserModel = user?.geminiModel || 'gemini-2.5-flash';
    const userModel = validModels.includes(rawUserModel) ? rawUserModel : 'gemini-2.5-flash';
    if (user && rawUserModel !== userModel) {
      // Auto-migrate invalid/expired saved model to prevent recurring 404s
      await User.findByIdAndUpdate(req.user!._id, { geminiModel: userModel });
    }

    console.log('🔑 API Key status:', {
      hasUserApiKey: !!userApiKey,
      keyLength: userApiKey?.length || 0,
      model: userModel,
    });

    // Combine session excluded titles with DB stored shown recommendations
    // Get recommendations shown in last 30 days to avoid repeats
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dbExcludedTitles = (user?.shownRecommendations || [])
      .filter((r: { title: string; shownAt: Date }) => new Date(r.shownAt) > thirtyDaysAgo)
      .map((r: { title: string }) => r.title);

    const allExcludedTitles = [...new Set([...excludedTitles, ...dbExcludedTitles])];
    console.log('🚫 Excluded titles count:', allExcludedTitles.length);

    // Get user's watched movies for context
    console.log('🎥 Fetching watched movies...');
    const watchedMovies = await Movie.find({
      user: req.user!._id,
      status: 'watched',
    })
      .sort({ watchedDate: -1, createdAt: -1 })
      .limit(50)
      .select('title genres rating releaseDate isFavorite');

    console.log('🎥 Found watched movies:', watchedMovies.length);

    if (watchedMovies.length === 0) {
      console.log('❌ No watched movies found');
      return res.status(400).json({
        success: false,
        message: 'You need to have watched movies to get personalized recommendations. Add some movies to your watched list first!',
      });
    }

    // Prepare data for Gemini
    const watchedData = watchedMovies.map(movie => ({
      title: movie.title,
      genres: movie.genres || [],
      rating: movie.rating,
      releaseDate: movie.releaseDate,
      isFavorite: movie.isFavorite,
    }));

    console.log('🤖 Calling Gemini API...');
    // Get recommendation from Gemini (use user's key and model preference if available)
    const result = await getMovieRecommendation({
      contentType,
      watchedMovies: watchedData,
      mood,
      userApiKey,
      modelId: userModel,
      excludedTitles: allExcludedTitles,
    });

    console.log('🤖 Gemini result:', { success: result.success, error: result.error, hasData: !!result.data });

    if (!result.success) {
      console.error('❌ Gemini recommendation failed:', result.error);
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to get recommendation',
      });
    }

    // Save the recommendation to user's shown history (for future exclusion)
    if (result.data?.title) {
      await User.findByIdAndUpdate(req.user!._id, {
        $push: {
          shownRecommendations: {
            $each: [{ title: result.data.title, shownAt: new Date() }],
            $slice: -100, // Keep only last 100 recommendations
          },
        },
      });
    }

    res.json({
      success: true,
      data: result.data,
      watchHistoryCount: watchedMovies.length,
    });
  } catch (error) {
    console.error('❌ Error getting movie recommendation:', error);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, message: 'Failed to get recommendation' });
  }
});

// ==================== MOVIE LISTS ====================

// Get all movie lists
router.get('/lists/all', protect, async (req: AuthRequest, res: Response) => {
  try {
    const lists = await MovieList.find({ user: req.user!._id })
      .sort({ order: 1, createdAt: -1 });

    // Get movie count for each list
    const listsWithCount = await Promise.all(
      lists.map(async (list) => {
        const count = await Movie.countDocuments({
          user: req.user!._id,
          lists: list._id,
        });
        return { ...list.toObject(), movieCount: count };
      })
    );

    res.json({ success: true, data: listsWithCount });
  } catch (error) {
    console.error('Error fetching movie lists:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch movie lists' });
  }
});

// Create a movie list
router.post('/lists', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, color, icon, isPublic } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'List name is required' });
    }

    const lastList = await MovieList.findOne({ user: req.user!._id })
      .sort({ order: -1 });
    const order = lastList ? lastList.order + 1 : 0;

    const list = await MovieList.create({
      user: req.user!._id,
      name: name.trim(),
      description,
      color,
      icon,
      isPublic: isPublic || false,
      order,
    });

    res.status(201).json({ success: true, data: list });
  } catch (error) {
    console.error('Error creating movie list:', error);
    res.status(500).json({ success: false, message: 'Failed to create movie list' });
  }
});

// Update a movie list
router.put('/lists/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, color, icon, isPublic, order } = req.body;

    const list = await MovieList.findOneAndUpdate(
      { _id: req.params.id, user: req.user!._id },
      {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
        ...(icon && { icon }),
        ...(isPublic !== undefined && { isPublic }),
        ...(order !== undefined && { order }),
      },
      { new: true }
    );

    if (!list) {
      return res.status(404).json({ success: false, message: 'List not found' });
    }

    res.json({ success: true, data: list });
  } catch (error) {
    console.error('Error updating movie list:', error);
    res.status(500).json({ success: false, message: 'Failed to update movie list' });
  }
});

// Delete a movie list
router.delete('/lists/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    const list = await MovieList.findOneAndDelete({
      _id: req.params.id,
      user: req.user!._id,
    });

    if (!list) {
      return res.status(404).json({ success: false, message: 'List not found' });
    }

    // Remove list from all movies
    await Movie.updateMany(
      { user: req.user!._id, lists: list._id },
      { $pull: { lists: list._id } }
    );

    res.json({ success: true, message: 'List deleted' });
  } catch (error) {
    console.error('Error deleting movie list:', error);
    res.status(500).json({ success: false, message: 'Failed to delete movie list' });
  }
});

// Add movie to list
router.post('/lists/:listId/movies/:movieId', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { listId, movieId } = req.params;

    // Verify list belongs to user
    const list = await MovieList.findOne({ _id: listId, user: req.user!._id });
    if (!list) {
      return res.status(404).json({ success: false, message: 'List not found' });
    }

    // Add list to movie
    const movie = await Movie.findOneAndUpdate(
      { _id: movieId, user: req.user!._id },
      { $addToSet: { lists: listId } },
      { new: true }
    );

    if (!movie) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }

    res.json({ success: true, data: movie });
  } catch (error) {
    console.error('Error adding movie to list:', error);
    res.status(500).json({ success: false, message: 'Failed to add movie to list' });
  }
});

// Remove movie from list
router.delete('/lists/:listId/movies/:movieId', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { listId, movieId } = req.params;

    const movie = await Movie.findOneAndUpdate(
      { _id: movieId, user: req.user!._id },
      { $pull: { lists: listId } },
      { new: true }
    );

    if (!movie) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }

    res.json({ success: true, data: movie });
  } catch (error) {
    console.error('Error removing movie from list:', error);
    res.status(500).json({ success: false, message: 'Failed to remove movie from list' });
  }
});

// Get movies in a list
router.get('/lists/:id/movies', protect, async (req: AuthRequest, res: Response) => {
  try {
    const movies = await Movie.find({
      user: req.user!._id,
      lists: req.params.id,
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: movies });
  } catch (error) {
    console.error('Error fetching list movies:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch list movies' });
  }
});

export default router;
