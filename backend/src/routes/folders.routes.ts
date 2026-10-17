import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import { Folder, Note } from '../models';

const router = Router();

// Apply auth middleware to all routes
router.use(protect);

// @route   GET /api/folders
// @desc    Get all folders for current user (with hierarchy)
// @access  Private
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;

    const folders = await Folder.find({ user: userId })
      .sort({ order: 1, name: 1 })
      .lean();

    res.json({
      success: true,
      data: folders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch folders',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   GET /api/folders/:id
// @desc    Get single folder with its notes
// @access  Private
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    const folder = await Folder.findOne({ _id: id, user: userId }).lean();

    if (!folder) {
      res.status(404).json({
        success: false,
        message: 'Folder not found',
      });
      return;
    }

    // Get notes in this folder
    const notes = await Note.find({
      user: userId,
      folder: id,
      isArchived: false,
    })
      .populate('project', 'name color')
      .sort({ isPinned: -1, lastEditedAt: -1 })
      .lean();

    // Get subfolders
    const subfolders = await Folder.find({ user: userId, parent: id })
      .sort({ order: 1, name: 1 })
      .lean();

    res.json({
      success: true,
      data: {
        folder,
        notes,
        subfolders,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch folder',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   POST /api/folders
// @desc    Create a new folder
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

    const { name, parent, color, icon } = req.body;

    // Get the max order for folders at this level
    const maxOrderFolder = await Folder.findOne({
      user: userId,
      parent: parent || { $exists: false },
    }).sort({ order: -1 });

    const order = maxOrderFolder ? maxOrderFolder.order + 1 : 0;

    const folder = await Folder.create({
      name: name || 'New Folder',
      user: userId,
      parent: parent || undefined,
      color: color || '',
      icon: icon || 'folder',
      order,
    });

    res.status(201).json({
      success: true,
      data: folder,
    });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create folder',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   PUT /api/folders/:id
// @desc    Update a folder
// @access  Private
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;
    const { name, parent, color, icon, isExpanded, order } = req.body;

    const folder = await Folder.findOne({ _id: id, user: userId });

    if (!folder) {
      res.status(404).json({
        success: false,
        message: 'Folder not found',
      });
      return;
    }

    // Prevent folder from being its own parent
    if (parent && parent === id) {
      res.status(400).json({
        success: false,
        message: 'Folder cannot be its own parent',
      });
      return;
    }

    // Update fields
    if (name !== undefined) folder.name = name;
    if (parent !== undefined) folder.parent = parent || undefined;
    if (color !== undefined) folder.color = color;
    if (icon !== undefined) folder.icon = icon;
    if (isExpanded !== undefined) folder.isExpanded = isExpanded;
    if (order !== undefined) folder.order = order;

    await folder.save();

    res.json({
      success: true,
      data: folder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update folder',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   DELETE /api/folders/:id
// @desc    Delete a folder (moves notes to root, deletes subfolders)
// @access  Private
router.delete(
  '/:id',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      const { id } = req.params;

      const folder = await Folder.findOne({ _id: id, user: userId });

      if (!folder) {
        res.status(404).json({
          success: false,
          message: 'Folder not found',
        });
        return;
      }

      // Move notes in this folder to root (remove folder reference)
      await Note.updateMany(
        { user: userId, folder: id },
        { $unset: { folder: 1 } }
      );

      // Recursively delete subfolders and move their notes
      const deleteSubfolders = async (parentId: string) => {
        const subfolders = await Folder.find({
          user: userId,
          parent: parentId,
        });
        for (const subfolder of subfolders) {
          await Note.updateMany(
            { user: userId, folder: subfolder._id },
            { $unset: { folder: 1 } }
          );
          await deleteSubfolders(subfolder._id.toString());
          await Folder.deleteOne({ _id: subfolder._id });
        }
      };

      await deleteSubfolders(id);
      await Folder.deleteOne({ _id: id });

      res.json({
        success: true,
        message: 'Folder deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete folder',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// @route   PATCH /api/folders/:id/toggle
// @desc    Toggle folder expanded state
// @access  Private
router.patch(
  '/:id/toggle',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      const { id } = req.params;

      const folder = await Folder.findOne({ _id: id, user: userId });

      if (!folder) {
        res.status(404).json({
          success: false,
          message: 'Folder not found',
        });
        return;
      }

      folder.isExpanded = !folder.isExpanded;
      await folder.save();

      res.json({
        success: true,
        data: folder,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to toggle folder',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
