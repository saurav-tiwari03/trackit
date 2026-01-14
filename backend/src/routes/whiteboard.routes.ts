import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import { Whiteboard } from '../models';

const router = Router();

// Apply auth middleware to all routes
router.use(protect);

// @route   GET /api/whiteboards
// @desc    Get all whiteboards for current user
// @access  Private
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const {
      search,
      project,
      folder,
      isPinned,
      isFavorite,
      isArchived,
      noFolder,
      sortBy = 'lastEditedAt',
      sortOrder = 'desc',
    } = req.query;

    // Build query
    const query: Record<string, unknown> = { user: userId };

    if (project) query.project = project;
    if (folder) query.folder = folder;
    if (noFolder === 'true') query.folder = { $exists: false };
    if (isPinned === 'true') query.isPinned = true;
    if (isFavorite === 'true') query.isFavorite = true;
    if (isArchived === 'true') {
      query.isArchived = true;
    } else {
      query.isArchived = false; // Default: don't show archived
    }

    // Text search
    if (search && typeof search === 'string') {
      query.$or = [{ title: { $regex: search, $options: 'i' } }];
    }

    // Build sort
    const sort: Record<string, 1 | -1> = {};
    // Always show pinned first
    sort.isPinned = -1;
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const whiteboards = await Whiteboard.find(query)
      .select('-elements -appState -files') // Exclude heavy fields for list view
      .populate('project', 'name color')
      .populate('folder', 'name color icon')
      .sort(sort)
      .lean();

    res.json({
      success: true,
      data: whiteboards,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch whiteboards',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   GET /api/whiteboards/:id
// @desc    Get single whiteboard by ID
// @access  Private
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    const whiteboard = await Whiteboard.findOne({ _id: id, user: userId })
      .populate('project', 'name color')
      .populate('folder', 'name color icon')
      .lean();

    if (!whiteboard) {
      res.status(404).json({
        success: false,
        message: 'Whiteboard not found',
      });
      return;
    }

    res.json({
      success: true,
      data: whiteboard,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch whiteboard',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   POST /api/whiteboards
// @desc    Create a new whiteboard
// @access  Private
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    const { title, elements, appState, files, project, folder } = req.body;

    const whiteboard = await Whiteboard.create({
      title: title || 'Untitled Whiteboard',
      elements: elements || '[]',
      appState: appState || '{}',
      files: files || '{}',
      user: userId,
      project: project || undefined,
      folder: folder || undefined,
    });

    const populatedWhiteboard = await Whiteboard.findById(whiteboard._id)
      .populate('project', 'name color')
      .populate('folder', 'name color icon')
      .lean();

    res.status(201).json({
      success: true,
      data: populatedWhiteboard,
    });
  } catch (error) {
    console.error('Create whiteboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create whiteboard',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   PUT /api/whiteboards/:id
// @desc    Update a whiteboard
// @access  Private
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;
    const { title, elements, appState, files, project, folder, thumbnail } =
      req.body;

    // Find and verify ownership
    const existingWhiteboard = await Whiteboard.findOne({
      _id: id,
      user: userId,
    });

    if (!existingWhiteboard) {
      res.status(404).json({
        success: false,
        message: 'Whiteboard not found',
      });
      return;
    }

    // Update fields
    if (title !== undefined) existingWhiteboard.title = title;
    if (elements !== undefined) existingWhiteboard.elements = elements;
    if (appState !== undefined) existingWhiteboard.appState = appState;
    if (files !== undefined) existingWhiteboard.files = files;
    if (project !== undefined)
      existingWhiteboard.project = project || undefined;
    if (folder !== undefined) existingWhiteboard.folder = folder || undefined;
    if (thumbnail !== undefined) existingWhiteboard.thumbnail = thumbnail;

    await existingWhiteboard.save();

    const updatedWhiteboard = await Whiteboard.findById(id)
      .populate('project', 'name color')
      .populate('folder', 'name color icon')
      .lean();

    res.json({
      success: true,
      data: updatedWhiteboard,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update whiteboard',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   PATCH /api/whiteboards/:id/pin
// @desc    Toggle pin status
// @access  Private
router.patch(
  '/:id/pin',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      const { id } = req.params;

      const existingWhiteboard = await Whiteboard.findOne({
        _id: id,
        user: userId,
      });

      if (!existingWhiteboard) {
        res.status(404).json({
          success: false,
          message: 'Whiteboard not found',
        });
        return;
      }

      const whiteboard = await Whiteboard.findByIdAndUpdate(
        id,
        { isPinned: !existingWhiteboard.isPinned },
        { new: true }
      )
        .select('-elements -appState -files')
        .populate('project', 'name color')
        .lean();

      res.json({
        success: true,
        data: whiteboard,
      });
    } catch (error) {
      console.error('Toggle pin error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle pin',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// @route   PATCH /api/whiteboards/:id/favorite
// @desc    Toggle favorite status
// @access  Private
router.patch(
  '/:id/favorite',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      const { id } = req.params;

      const existingWhiteboard = await Whiteboard.findOne({
        _id: id,
        user: userId,
      });

      if (!existingWhiteboard) {
        res.status(404).json({
          success: false,
          message: 'Whiteboard not found',
        });
        return;
      }

      const whiteboard = await Whiteboard.findByIdAndUpdate(
        id,
        { isFavorite: !existingWhiteboard.isFavorite },
        { new: true }
      )
        .select('-elements -appState -files')
        .populate('project', 'name color')
        .lean();

      res.json({
        success: true,
        data: whiteboard,
      });
    } catch (error) {
      console.error('Toggle favorite error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle favorite',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// @route   PATCH /api/whiteboards/:id/archive
// @desc    Toggle archive status
// @access  Private
router.patch(
  '/:id/archive',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      const { id } = req.params;

      const existingWhiteboard = await Whiteboard.findOne({
        _id: id,
        user: userId,
      });

      if (!existingWhiteboard) {
        res.status(404).json({
          success: false,
          message: 'Whiteboard not found',
        });
        return;
      }

      const whiteboard = await Whiteboard.findByIdAndUpdate(
        id,
        { isArchived: !existingWhiteboard.isArchived },
        { new: true }
      )
        .select('-elements -appState -files')
        .populate('project', 'name color')
        .lean();

      res.json({
        success: true,
        data: whiteboard,
      });
    } catch (error) {
      console.error('Toggle archive error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle archive',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// @route   PATCH /api/whiteboards/:id/move
// @desc    Move a whiteboard to a folder
// @access  Private
router.patch(
  '/:id/move',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      const { id } = req.params;
      const { folder } = req.body;

      const whiteboard = await Whiteboard.findOne({ _id: id, user: userId });

      if (!whiteboard) {
        res.status(404).json({
          success: false,
          message: 'Whiteboard not found',
        });
        return;
      }

      // Update folder (null/undefined removes from folder)
      if (folder === null || folder === undefined || folder === '') {
        whiteboard.folder = undefined;
      } else {
        whiteboard.folder = folder;
      }

      await whiteboard.save();

      const updatedWhiteboard = await Whiteboard.findById(id)
        .select('-elements -appState -files')
        .populate('project', 'name color')
        .populate('folder', 'name color icon')
        .lean();

      res.json({
        success: true,
        data: updatedWhiteboard,
      });
    } catch (error) {
      console.error('Move whiteboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to move whiteboard',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// @route   DELETE /api/whiteboards/:id
// @desc    Delete a whiteboard
// @access  Private
router.delete(
  '/:id',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      const { id } = req.params;

      const whiteboard = await Whiteboard.findOneAndDelete({
        _id: id,
        user: userId,
      });

      if (!whiteboard) {
        res.status(404).json({
          success: false,
          message: 'Whiteboard not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Whiteboard deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete whiteboard',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
