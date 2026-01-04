import { Router, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { FitLogEntry, FitLogGoal } from '../models';
import { protect, AuthRequest } from '../middleware/auth';
import { analyzeFoodImage, calculateGoalsWithAI } from '../service/gemini.service';
import { AWS_S3_CONFIG } from '../config/config';

const router = Router();

// Generate a unique ID for file names
const generateId = () => `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

// Check if S3 is enabled
const isS3Enabled = Boolean(
  AWS_S3_CONFIG.AWS_ACCESS_KEY &&
  AWS_S3_CONFIG.AWS_SECRET_KEY &&
  AWS_S3_CONFIG.AWS_BUCKET_NAME
);

// Initialize S3 client
const s3Client = isS3Enabled
  ? new S3Client({
      region: AWS_S3_CONFIG.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: AWS_S3_CONFIG.AWS_ACCESS_KEY,
        secretAccessKey: AWS_S3_CONFIG.AWS_SECRET_KEY,
      },
    })
  : null;

// Helper to upload image to S3
const uploadMealImageToS3 = async (
  buffer: Buffer,
  mimeType: string,
  userId: string
): Promise<string | null> => {
  if (!isS3Enabled || !s3Client) {
    console.log('[FITLOG] S3 not configured, skipping image upload');
    return null;
  }

  try {
    const extension = mimeType.split('/')[1] || 'jpg';
    const fileName = `meals/${userId}/${generateId()}.${extension}`;

    const putCommand = new PutObjectCommand({
      Bucket: AWS_S3_CONFIG.AWS_BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: mimeType,
    });

    await s3Client.send(putCommand);
    console.log(`[FITLOG] Meal image uploaded: ${fileName}`);
    return fileName;
  } catch (error) {
    console.error('[FITLOG] Error uploading meal image:', error);
    return null;
  }
};

// Configure multer for memory storage (for image uploads)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Helper to get today's date in YYYY-MM-DD format (UTC-safe)
const getUTCDateString = (date: Date = new Date()): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;

// Apply auth middleware to all routes
router.use(protect);

// @route   GET /api/fitlog
// @desc    Get entries with optional date range
// @access  Private
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { startDate, endDate, limit } = req.query;

    const query: {
      user: typeof userId;
      date?: { $gte?: string; $lte?: string };
    } = { user: userId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate as string;
      if (endDate) query.date.$lte = endDate as string;
    }

    let entriesQuery = FitLogEntry.find(query).sort({ date: -1 });

    if (limit) {
      entriesQuery = entriesQuery.limit(parseInt(limit as string, 10));
    }

    const entries = await entriesQuery;
    res.status(200).json({ success: true, data: entries });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching fitlog entries',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   GET /api/fitlog/today
// @desc    Get today's entry
// @access  Private
router.get('/today', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const today = getUTCDateString();

    const entry = await FitLogEntry.findOne({ user: userId, date: today });

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching today's entry",
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   GET /api/fitlog/goals
// @desc    Get user's fitness goals
// @access  Private
router.get('/goals', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    let goals = await FitLogGoal.findOne({ user: userId });

    // Create default goals if none exist
    if (!goals) {
      goals = await FitLogGoal.create({ user: userId });
    }

    res.status(200).json({ success: true, data: goals });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching goals',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   PUT /api/fitlog/goals
// @desc    Update fitness goals
// @access  Private
router.put('/goals', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const {
      fitnessGoal,
      activityLevel,
      gender,
      age,
      height,
      currentWeight,
      caloriesIntake,
      caloriesBurn,
      protein,
      carbs,
      fat,
      water,
      steps,
      targetWeight,
      startWeight,
      weightUnit,
      workoutsPerWeek,
      isCustomTargets,
    } = req.body;

    const updateData: Record<string, unknown> = {};
    if (fitnessGoal !== undefined) updateData.fitnessGoal = fitnessGoal;
    if (activityLevel !== undefined) updateData.activityLevel = activityLevel;
    if (gender !== undefined) updateData.gender = gender;
    if (age !== undefined) updateData.age = age;
    if (height !== undefined) updateData.height = height;
    if (currentWeight !== undefined) updateData.currentWeight = currentWeight;
    if (caloriesIntake !== undefined) updateData.caloriesIntake = caloriesIntake;
    if (caloriesBurn !== undefined) updateData.caloriesBurn = caloriesBurn;
    if (protein !== undefined) updateData.protein = protein;
    if (carbs !== undefined) updateData.carbs = carbs;
    if (fat !== undefined) updateData.fat = fat;
    if (water !== undefined) updateData.water = water;
    if (steps !== undefined) updateData.steps = steps;
    if (targetWeight !== undefined) updateData.targetWeight = targetWeight;
    if (startWeight !== undefined) updateData.startWeight = startWeight;
    if (weightUnit !== undefined) updateData.weightUnit = weightUnit;
    if (workoutsPerWeek !== undefined)
      updateData.workoutsPerWeek = workoutsPerWeek;
    if (isCustomTargets !== undefined) updateData.isCustomTargets = isCustomTargets;

    const goals = await FitLogGoal.findOneAndUpdate(
      { user: userId },
      { $set: updateData },
      { new: true, upsert: true }
    );

    res.status(200).json({ success: true, data: goals });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating goals',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   POST /api/fitlog/goals/calculate
// @desc    Calculate personalized goals using AI
// @access  Private
router.post('/goals/calculate', async (req: AuthRequest, res: Response) => {
  try {
    const { gender, age, height, currentWeight, targetWeight, activityLevel, fitnessGoal } = req.body;

    // Validate required fields
    if (!gender || !age || !height || !currentWeight || !activityLevel || !fitnessGoal) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: gender, age, height, currentWeight, activityLevel, fitnessGoal',
      });
      return;
    }

    const result = await calculateGoalsWithAI({
      gender,
      age,
      height,
      currentWeight,
      targetWeight,
      activityLevel,
      fitnessGoal,
    });

    if (!result.success) {
      res.status(422).json({
        success: false,
        message: result.error || 'Failed to calculate goals',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error calculating goals',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   GET /api/fitlog/stats/weekly
// @desc    Get weekly statistics
// @access  Private
router.get('/stats/weekly', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    // Get last 7 days
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      dates.push(getUTCDateString(d));
    }

    const entries = await FitLogEntry.find({
      user: userId,
      date: { $in: dates },
    });

    const stats = {
      totalCaloriesIn: entries.reduce(
        (sum, e) => sum + (e.nutrition?.calories || 0),
        0
      ),
      totalCaloriesBurned: entries.reduce(
        (sum, e) => sum + (e.caloriesBurned || 0),
        0
      ),
      totalProtein: entries.reduce(
        (sum, e) => sum + (e.nutrition?.protein || 0),
        0
      ),
      avgCaloriesIn: 0,
      avgProtein: 0,
      workoutsCompleted: entries.filter(e => e.workout).length,
      avgWeight: 0,
      latestWeight: 0,
      entriesCount: entries.length,
      daysLogged: entries.length,
    };

    // Calculate averages
    if (entries.length > 0) {
      const entriesWithNutrition = entries.filter(e => e.nutrition);
      if (entriesWithNutrition.length > 0) {
        stats.avgCaloriesIn = Math.round(
          stats.totalCaloriesIn / entriesWithNutrition.length
        );
        stats.avgProtein = Math.round(
          stats.totalProtein / entriesWithNutrition.length
        );
      }
    }

    // Weight stats
    const weights = entries
      .filter(e => e.bodyMetrics?.weight)
      .map(e => ({ date: e.date, weight: e.bodyMetrics!.weight! }))
      .sort((a, b) => b.date.localeCompare(a.date));

    if (weights.length > 0) {
      stats.latestWeight = weights[0].weight;
      stats.avgWeight =
        Math.round(
          (weights.reduce((a, b) => a + b.weight, 0) / weights.length) * 10
        ) / 10;
    }

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching weekly stats',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   GET /api/fitlog/progress/weight
// @desc    Get weight progress over time
// @access  Private
router.get('/progress/weight', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { days = '30' } = req.query;

    const daysNum = parseInt(days as string, 10);
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - daysNum);

    const entries = await FitLogEntry.find({
      user: userId,
      date: { $gte: getUTCDateString(startDate) },
      'bodyMetrics.weight': { $exists: true, $ne: null },
    })
      .select('date bodyMetrics.weight')
      .sort({ date: 1 });

    const progress = entries.map(e => ({
      date: e.date,
      weight: e.bodyMetrics?.weight,
    }));

    res.status(200).json({ success: true, data: progress });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching weight progress',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   GET /api/fitlog/:date
// @desc    Get entry for a specific date
// @access  Private
router.get('/:date', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { date } = req.params;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
      return;
    }

    const entry = await FitLogEntry.findOne({ user: userId, date });

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching entry',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   POST /api/fitlog
// @desc    Create or update entry for a date
// @access  Private
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const {
      date,
      nutrition,
      workout,
      bodyMetrics,
      caloriesBurned,
      steps,
      notes,
      mood,
    } = req.body;

    if (!date) {
      res.status(400).json({ success: false, message: 'Date is required' });
      return;
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (nutrition !== undefined) updateData.nutrition = nutrition;
    if (workout !== undefined) updateData.workout = workout;
    if (bodyMetrics !== undefined) updateData.bodyMetrics = bodyMetrics;
    if (caloriesBurned !== undefined) updateData.caloriesBurned = caloriesBurned;
    if (steps !== undefined) updateData.steps = steps;
    if (notes !== undefined) updateData.notes = notes;
    if (mood !== undefined) updateData.mood = mood;

    const entry = await FitLogEntry.findOneAndUpdate(
      { user: userId, date },
      { $set: updateData },
      { new: true, upsert: true }
    );

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error saving entry',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   PUT /api/fitlog/:date
// @desc    Update specific fields for a date
// @access  Private
router.put('/:date', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { date } = req.params;
    const {
      nutrition,
      workout,
      bodyMetrics,
      caloriesBurned,
      steps,
      notes,
      mood,
    } = req.body;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (nutrition !== undefined) updateData.nutrition = nutrition;
    if (workout !== undefined) updateData.workout = workout;
    if (bodyMetrics !== undefined) updateData.bodyMetrics = bodyMetrics;
    if (caloriesBurned !== undefined) updateData.caloriesBurned = caloriesBurned;
    if (steps !== undefined) updateData.steps = steps;
    if (notes !== undefined) updateData.notes = notes;
    if (mood !== undefined) updateData.mood = mood;

    const entry = await FitLogEntry.findOneAndUpdate(
      { user: userId, date },
      { $set: updateData },
      { new: true, upsert: true }
    );

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating entry',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   DELETE /api/fitlog/:date
// @desc    Delete entry for a date
// @access  Private
router.delete('/:date', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { date } = req.params;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
      return;
    }

    const entry = await FitLogEntry.findOneAndDelete({ user: userId, date });

    if (!entry) {
      res.status(404).json({ success: false, message: 'Entry not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Entry deleted' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting entry',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   POST /api/fitlog/:date/meals
// @desc    Add a meal to a specific date
// @access  Private
router.post('/:date/meals', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { date } = req.params;
    const { type, name, description, calories, protein, carbs, fat, time, imageKey } = req.body;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
      return;
    }

    // Validate required fields
    if (!type || calories === undefined || protein === undefined || carbs === undefined || fat === undefined) {
      res.status(400).json({
        success: false,
        message: 'Type, calories, protein, carbs, and fat are required',
      });
      return;
    }

    const meal = { type, name, description, calories, protein, carbs, fat, time, imageKey };

    // Find or create entry for the date
    let entry = await FitLogEntry.findOne({ user: userId, date });

    if (!entry) {
      // Create new entry with this meal
      entry = await FitLogEntry.create({
        user: userId,
        date,
        nutrition: {
          calories,
          protein,
          carbs,
          fat,
          water: 0,
          meals: [meal],
        },
      });
    } else {
      // Add meal to existing entry
      if (!entry.nutrition) {
        entry.nutrition = { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0, meals: [] };
      }
      if (!entry.nutrition.meals) {
        entry.nutrition.meals = [];
      }
      entry.nutrition.meals.push(meal);

      // Recalculate totals from meals
      const totals = entry.nutrition.meals.reduce(
        (acc, m) => ({
          calories: acc.calories + m.calories,
          protein: acc.protein + m.protein,
          carbs: acc.carbs + m.carbs,
          fat: acc.fat + m.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      entry.nutrition.calories = totals.calories;
      entry.nutrition.protein = totals.protein;
      entry.nutrition.carbs = totals.carbs;
      entry.nutrition.fat = totals.fat;

      await entry.save();
    }

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding meal',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   DELETE /api/fitlog/:date/meals/:mealId
// @desc    Delete a meal from a specific date
// @access  Private
router.delete('/:date/meals/:mealId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { date, mealId } = req.params;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
      return;
    }

    const entry = await FitLogEntry.findOne({ user: userId, date });

    if (!entry || !entry.nutrition?.meals) {
      res.status(404).json({ success: false, message: 'Entry or meals not found' });
      return;
    }

    // Remove the meal
    entry.nutrition.meals = entry.nutrition.meals.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (m: any) => m._id?.toString() !== mealId
    );

    // Recalculate totals from remaining meals
    if (entry.nutrition.meals.length > 0) {
      const totals = entry.nutrition.meals.reduce(
        (acc, m) => ({
          calories: acc.calories + m.calories,
          protein: acc.protein + m.protein,
          carbs: acc.carbs + m.carbs,
          fat: acc.fat + m.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      entry.nutrition.calories = totals.calories;
      entry.nutrition.protein = totals.protein;
      entry.nutrition.carbs = totals.carbs;
      entry.nutrition.fat = totals.fat;
    } else {
      entry.nutrition.calories = 0;
      entry.nutrition.protein = 0;
      entry.nutrition.carbs = 0;
      entry.nutrition.fat = 0;
    }

    await entry.save();

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting meal',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   PUT /api/fitlog/:date/meals/:mealId
// @desc    Update a meal for a specific date
// @access  Private
router.put('/:date/meals/:mealId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { date, mealId } = req.params;
    const { type, name, description, calories, protein, carbs, fat, time, imageKey } = req.body;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
      return;
    }

    const entry = await FitLogEntry.findOne({ user: userId, date });

    if (!entry || !entry.nutrition?.meals) {
      res.status(404).json({ success: false, message: 'Entry or meals not found' });
      return;
    }

    // Find and update the meal
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mealIndex = entry.nutrition.meals.findIndex((m: any) => m._id?.toString() === mealId);
    
    if (mealIndex === -1) {
      res.status(404).json({ success: false, message: 'Meal not found' });
      return;
    }

    // Update meal fields
    if (type !== undefined) entry.nutrition.meals[mealIndex].type = type;
    if (name !== undefined) entry.nutrition.meals[mealIndex].name = name;
    if (description !== undefined) entry.nutrition.meals[mealIndex].description = description;
    if (calories !== undefined) entry.nutrition.meals[mealIndex].calories = calories;
    if (protein !== undefined) entry.nutrition.meals[mealIndex].protein = protein;
    if (carbs !== undefined) entry.nutrition.meals[mealIndex].carbs = carbs;
    if (fat !== undefined) entry.nutrition.meals[mealIndex].fat = fat;
    if (time !== undefined) entry.nutrition.meals[mealIndex].time = time;
    if (imageKey !== undefined) entry.nutrition.meals[mealIndex].imageKey = imageKey;

    // Recalculate totals from all meals
    const totals = entry.nutrition.meals.reduce(
      (acc, m) => ({
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    entry.nutrition.calories = totals.calories;
    entry.nutrition.protein = totals.protein;
    entry.nutrition.carbs = totals.carbs;
    entry.nutrition.fat = totals.fat;

    await entry.save();

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating meal',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   POST /api/fitlog/upload-meal-image
// @desc    Upload a meal image to S3 and return the key
// @access  Private
router.post(
  '/upload-meal-image',
  upload.single('image'),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString() || 'anonymous';

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'Image file is required',
        });
        return;
      }

      const imageKey = await uploadMealImageToS3(
        req.file.buffer,
        req.file.mimetype,
        userId
      );

      if (!imageKey) {
        res.status(500).json({
          success: false,
          message: 'Failed to upload image. S3 may not be configured.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { imageKey },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error uploading meal image',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// @route   POST /api/fitlog/analyze-food
// @desc    Analyze food image using Gemini AI and return macros
// @access  Private
router.post(
  '/analyze-food',
  upload.single('image'),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString() || 'anonymous';
      const { description, saveImage } = req.body;

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'Image file is required',
        });
        return;
      }

      // Analyze the food image with Gemini
      const result = await analyzeFoodImage(
        req.file.buffer,
        req.file.mimetype,
        description
      );

      if (!result.success) {
        res.status(422).json({
          success: false,
          message: result.error || 'Failed to analyze food image',
        });
        return;
      }

      // Upload image to S3 if saveImage is true or by default
      let imageKey: string | null = null;
      if (saveImage !== 'false') {
        imageKey = await uploadMealImageToS3(
          req.file.buffer,
          req.file.mimetype,
          userId
        );
      }

      res.status(200).json({
        success: true,
        data: {
          ...result.data,
          imageKey,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error analyzing food image',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// @route   POST /api/fitlog/:date/meals/from-image
// @desc    Analyze food image and add as meal to a specific date
// @access  Private
router.post(
  '/:date/meals/from-image',
  upload.single('image'),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id;
      const { date } = req.params;
      const { quantity, mealType, time } = req.body;

      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json({
          success: false,
          message: 'Invalid date format. Use YYYY-MM-DD',
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'Image file is required',
        });
        return;
      }

      // Analyze the food image with Gemini
      const result = await analyzeFoodImage(
        req.file.buffer,
        req.file.mimetype,
        quantity
      );

      if (!result.success || !result.data) {
        res.status(422).json({
          success: false,
          message: result.error || 'Failed to analyze food image',
        });
        return;
      }

      const macros = result.data;

      // Create the meal object
      const meal = {
        type: mealType || 'other',
        name: macros.name,
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        time: time,
      };

      // Find or create entry for the date
      let entry = await FitLogEntry.findOne({ user: userId, date });

      if (!entry) {
        // Create new entry with this meal
        entry = await FitLogEntry.create({
          user: userId,
          date,
          nutrition: {
            calories: meal.calories,
            protein: meal.protein,
            carbs: meal.carbs,
            fat: meal.fat,
            water: 0,
            meals: [meal],
          },
        });
      } else {
        // Add meal to existing entry
        if (!entry.nutrition) {
          entry.nutrition = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            water: 0,
            meals: [],
          };
        }
        if (!entry.nutrition.meals) {
          entry.nutrition.meals = [];
        }
        entry.nutrition.meals.push(meal);

        // Recalculate totals from meals
        const totals = entry.nutrition.meals.reduce(
          (acc, m) => ({
            calories: acc.calories + m.calories,
            protein: acc.protein + m.protein,
            carbs: acc.carbs + m.carbs,
            fat: acc.fat + m.fat,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );

        entry.nutrition.calories = totals.calories;
        entry.nutrition.protein = totals.protein;
        entry.nutrition.carbs = totals.carbs;
        entry.nutrition.fat = totals.fat;

        await entry.save();
      }

      res.status(200).json({
        success: true,
        data: {
          entry,
          analyzedFood: macros,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error analyzing and adding food',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// @route   POST /api/fitlog/:date/workouts
// @desc    Add a workout to a specific date
// @access  Private
router.post('/:date/workouts', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { date } = req.params;
    const { type, customName, exercises, duration, caloriesBurned, notes } = req.body;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
      return;
    }

    // Validate required fields
    if (!type || duration === undefined) {
      res.status(400).json({
        success: false,
        message: 'Type and duration are required',
      });
      return;
    }

    const workout = {
      type,
      customName,
      exercises: exercises || [],
      duration,
      caloriesBurned,
      notes,
    };

    // Find or create entry for the date
    let entry = await FitLogEntry.findOne({ user: userId, date });

    if (!entry) {
      // Create new entry with this workout
      entry = await FitLogEntry.create({
        user: userId,
        date,
        workouts: [workout],
        caloriesBurned: caloriesBurned || 0,
      });
    } else {
      // Add workout to existing entry
      if (!entry.workouts) {
        entry.workouts = [];
      }
      entry.workouts.push(workout);

      // Recalculate total calories burned from all workouts
      const totalBurned = entry.workouts.reduce(
        (sum, w) => sum + (w.caloriesBurned || 0),
        0
      );
      entry.caloriesBurned = totalBurned;

      await entry.save();
    }

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding workout',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   DELETE /api/fitlog/:date/workouts/:workoutId
// @desc    Delete a workout from a specific date
// @access  Private
router.delete('/:date/workouts/:workoutId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { date, workoutId } = req.params;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
      return;
    }

    const entry = await FitLogEntry.findOne({ user: userId, date });

    if (!entry || !entry.workouts) {
      res.status(404).json({ success: false, message: 'Entry or workouts not found' });
      return;
    }

    // Remove the workout
    entry.workouts = entry.workouts.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (w: any) => w._id?.toString() !== workoutId
    );

    // Recalculate total calories burned from remaining workouts
    if (entry.workouts.length > 0) {
      const totalBurned = entry.workouts.reduce(
        (sum, w) => sum + (w.caloriesBurned || 0),
        0
      );
      entry.caloriesBurned = totalBurned;
    } else {
      entry.caloriesBurned = 0;
    }

    await entry.save();

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting workout',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

