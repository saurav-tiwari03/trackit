import { Router, Response } from 'express';
import { Habit } from '../models';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

// Helper to calculate streaks
const calculateStreaks = (
  completions: { date: string; completed: boolean }[]
) => {
  if (!completions.length) return { currentStreak: 0, longestStreak: 0 };

  // Sort completions by date descending
  const sorted = [...completions]
    .filter(c => c.completed)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (!sorted.length) return { currentStreak: 0, longestStreak: 0 };

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Check if current streak is active (completed today or yesterday)
  const latestDate = sorted[0]?.date;
  const isCurrentStreakActive =
    latestDate === todayStr || latestDate === yesterdayStr;

  // Calculate streaks
  for (let i = 0; i < sorted.length; i += 1) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prevDate = new Date(sorted[i - 1].date);
      const currDate = new Date(sorted[i].date);
      const diffDays = Math.floor(
        (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        tempStreak += 1;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // Current streak is only counted if active
  if (isCurrentStreakActive) {
    currentStreak = 1;
    for (let i = 1; i < sorted.length; i += 1) {
      const prevDate = new Date(sorted[i - 1].date);
      const currDate = new Date(sorted[i].date);
      const diffDays = Math.floor(
        (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        currentStreak += 1;
      } else {
        break;
      }
    }
  }

  return { currentStreak, longestStreak };
};

// Apply auth middleware to all routes
router.use(protect);

// @route   GET /api/habits
// @desc    Get all habits for current user
// @access  Private
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { includeArchived } = req.query;

    const query: { user: typeof userId; isArchived?: boolean } = {
      user: userId,
    };
    if (includeArchived !== 'true') {
      query.isArchived = false;
    }

    const habits = await Habit.find(query).sort({ order: 1, createdAt: -1 });

    res.status(200).json({ success: true, data: habits });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching habits',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   POST /api/habits
// @desc    Create a new habit
// @access  Private
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { name, color, icon } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ success: false, message: 'Name is required' });
      return;
    }

    // Get max order for positioning
    const maxOrderHabit = await Habit.findOne({ user: userId }).sort({
      order: -1,
    });
    const order = (maxOrderHabit?.order ?? -1) + 1;

    const habit = await Habit.create({
      user: userId,
      name: name.trim(),
      color: color || '#22c55e',
      icon: icon || 'target',
      order,
      completions: [],
      currentStreak: 0,
      longestStreak: 0,
    });

    res.status(201).json({ success: true, data: habit });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating habit',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   PUT /api/habits/:id
// @desc    Update a habit
// @access  Private
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { name, color, icon, isArchived, order } = req.body;

    const habit = await Habit.findOne({ _id: req.params.id, user: userId });

    if (!habit) {
      res.status(404).json({ success: false, message: 'Habit not found' });
      return;
    }

    if (name !== undefined) habit.name = name.trim();
    if (color !== undefined) habit.color = color;
    if (icon !== undefined) habit.icon = icon;
    if (isArchived !== undefined) habit.isArchived = isArchived;
    if (order !== undefined) habit.order = order;

    await habit.save();

    res.status(200).json({ success: true, data: habit });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating habit',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   DELETE /api/habits/:id
// @desc    Delete a habit
// @access  Private
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    const habit = await Habit.findOneAndDelete({
      _id: req.params.id,
      user: userId,
    });

    if (!habit) {
      res.status(404).json({ success: false, message: 'Habit not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Habit deleted' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting habit',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   POST /api/habits/:id/toggle
// @desc    Toggle habit completion for a specific date
// @access  Private
router.post('/:id/toggle', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { date } = req.body; // YYYY-MM-DD format

    if (!date) {
      res.status(400).json({ success: false, message: 'Date is required' });
      return;
    }

    const habit = await Habit.findOne({ _id: req.params.id, user: userId });

    if (!habit) {
      res.status(404).json({ success: false, message: 'Habit not found' });
      return;
    }

    // Find existing completion for this date
    const existingIndex = habit.completions.findIndex(c => c.date === date);

    if (existingIndex >= 0) {
      // Toggle the completion
      habit.completions[existingIndex].completed =
        !habit.completions[existingIndex].completed;
    } else {
      // Add new completion
      habit.completions.push({ date, completed: true });
    }

    // Recalculate streaks
    const { currentStreak, longestStreak } = calculateStreaks(
      habit.completions
    );
    habit.currentStreak = currentStreak;
    habit.longestStreak = longestStreak;

    await habit.save();

    res.status(200).json({ success: true, data: habit });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error toggling habit',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   GET /api/habits/stats
// @desc    Get overall habit statistics
// @access  Private
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    const habits = await Habit.find({ user: userId, isArchived: false });

    const totalHabits = habits.length;
    const totalCompletions = habits.reduce(
      (sum, h) => sum + h.completions.filter(c => c.completed).length,
      0
    );
    const longestStreak = Math.max(...habits.map(h => h.longestStreak), 0);
    const activeStreaks = habits.filter(h => h.currentStreak > 0).length;

    res.status(200).json({
      success: true,
      data: {
        totalHabits,
        totalCompletions,
        longestStreak,
        activeStreaks,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching stats',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
