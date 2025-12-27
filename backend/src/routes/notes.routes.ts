import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import { Note } from '../models';

const router = Router();

// Apply auth middleware to all routes
router.use(protect);

// @route   GET /api/notes
// @desc    Get all notes for current user
// @access  Private
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const {
      search,
      project,
      tag,
      isPinned,
      isFavorite,
      isArchived,
      sortBy = 'lastEditedAt',
      sortOrder = 'desc',
    } = req.query;

    // Build query
    const query: Record<string, unknown> = { user: userId };

    if (project) query.project = project;
    if (tag) query.tags = tag;
    if (isPinned === 'true') query.isPinned = true;
    if (isFavorite === 'true') query.isFavorite = true;
    if (isArchived === 'true') {
      query.isArchived = true;
    } else {
      query.isArchived = false; // Default: don't show archived
    }

    // Text search
    if (search && typeof search === 'string') {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { plainText: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    // Build sort
    const sort: Record<string, 1 | -1> = {};
    // Always show pinned first
    sort.isPinned = -1;
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const notes = await Note.find(query)
      .populate('project', 'name color')
      .sort(sort)
      .lean();

    res.json({
      success: true,
      data: notes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notes',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   GET /api/notes/:id
// @desc    Get single note by ID
// @access  Private
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    const note = await Note.findOne({ _id: id, user: userId })
      .populate('project', 'name color')
      .lean();

    if (!note) {
      res.status(404).json({
        success: false,
        message: 'Note not found',
      });
      return;
    }

    res.json({
      success: true,
      data: note,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch note',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   POST /api/notes
// @desc    Create a new note
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

    const { title, content, plainText, project, color, tags } = req.body;

    const note = await Note.create({
      title: title || 'Untitled',
      content: content || '',
      plainText: plainText || '',
      user: userId,
      project: project || undefined,
      color: color || '',
      tags: tags || [],
    });

    const populatedNote = await Note.findById(note._id)
      .populate('project', 'name color')
      .lean();

    res.status(201).json({
      success: true,
      data: populatedNote,
    });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create note',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   PUT /api/notes/:id
// @desc    Update a note
// @access  Private
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;
    const { title, content, plainText, project, color, tags } = req.body;

    // Find and verify ownership
    const existingNote = await Note.findOne({ _id: id, user: userId });

    if (!existingNote) {
      res.status(404).json({
        success: false,
        message: 'Note not found',
      });
      return;
    }

    // Update fields
    if (title !== undefined) existingNote.title = title;
    if (content !== undefined) existingNote.content = content;
    if (plainText !== undefined) existingNote.plainText = plainText;
    if (project !== undefined) existingNote.project = project || undefined;
    if (color !== undefined) existingNote.color = color;
    if (tags !== undefined) existingNote.tags = tags;

    await existingNote.save();

    const updatedNote = await Note.findById(id)
      .populate('project', 'name color')
      .lean();

    res.json({
      success: true,
      data: updatedNote,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update note',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   PATCH /api/notes/:id/pin
// @desc    Toggle pin status
// @access  Private
router.patch(
  '/:id/pin',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      const { id } = req.params;

      // First get the current note to check ownership and get current value
      const existingNote = await Note.findOne({ _id: id, user: userId });

      if (!existingNote) {
        res.status(404).json({
          success: false,
          message: 'Note not found',
        });
        return;
      }

      // Update using findByIdAndUpdate to avoid pre-save hooks
      const note = await Note.findByIdAndUpdate(
        id,
        { isPinned: !existingNote.isPinned },
        { new: true }
      )
        .populate('project', 'name color')
        .lean();

      res.json({
        success: true,
        data: note,
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

// @route   PATCH /api/notes/:id/favorite
// @desc    Toggle favorite status
// @access  Private
router.patch(
  '/:id/favorite',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      const { id } = req.params;

      // First get the current note to check ownership and get current value
      const existingNote = await Note.findOne({ _id: id, user: userId });

      if (!existingNote) {
        res.status(404).json({
          success: false,
          message: 'Note not found',
        });
        return;
      }

      // Update using findByIdAndUpdate to avoid pre-save hooks
      const note = await Note.findByIdAndUpdate(
        id,
        { isFavorite: !existingNote.isFavorite },
        { new: true }
      )
        .populate('project', 'name color')
        .lean();

      res.json({
        success: true,
        data: note,
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

// @route   PATCH /api/notes/:id/archive
// @desc    Toggle archive status
// @access  Private
router.patch(
  '/:id/archive',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      const { id } = req.params;

      // First get the current note to check ownership and get current value
      const existingNote = await Note.findOne({ _id: id, user: userId });

      if (!existingNote) {
        res.status(404).json({
          success: false,
          message: 'Note not found',
        });
        return;
      }

      // Update using findByIdAndUpdate to avoid pre-save hooks
      const note = await Note.findByIdAndUpdate(
        id,
        { isArchived: !existingNote.isArchived },
        { new: true }
      )
        .populate('project', 'name color')
        .lean();

      res.json({
        success: true,
        data: note,
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

// @route   DELETE /api/notes/:id
// @desc    Delete a note
// @access  Private
router.delete(
  '/:id',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      const { id } = req.params;

      const note = await Note.findOneAndDelete({ _id: id, user: userId });

      if (!note) {
        res.status(404).json({
          success: false,
          message: 'Note not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Note deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete note',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
