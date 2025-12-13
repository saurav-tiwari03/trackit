import { Router, Response } from 'express';
import { Comment, Task } from '../models';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/comments/task/:taskId
// @desc    Get all comments for a task
// @access  Private
router.get('/task/:taskId', async (req: AuthRequest, res: Response) => {
  try {
    const comments = await Comment.find({ task: req.params.taskId })
      .populate('author', 'name email avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: comments.length,
      data: comments,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: 'Error fetching comments',
    });
  }
});

// @route   POST /api/comments
// @desc    Create a new comment
// @access  Private
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { content, task, attachments } = req.body;

    // Verify task exists
    const taskDoc = await Task.findById(task);
    if (!taskDoc) {
      res.status(404).json({
        success: false,
        message: 'Task not found',
      });
      return;
    }

    const comment = new Comment({
      content,
      task,
      author: req.user?._id,
      attachments: attachments || [],
    });
    await comment.save();

    const populatedComment = await Comment.findById(comment._id).populate(
      'author',
      'name email avatar'
    );

    res.status(201).json({
      success: true,
      data: populatedComment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating comment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   PUT /api/comments/:id
// @desc    Update a comment
// @access  Private
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;

    const comment = await Comment.findOneAndUpdate(
      {
        _id: req.params.id,
        author: req.user?._id,
      },
      { content },
      { new: true, runValidators: true }
    ).populate('author', 'name email avatar');

    if (!comment) {
      res.status(404).json({
        success: false,
        message: 'Comment not found or not authorized',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: comment,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: 'Error updating comment',
    });
  }
});

// @route   DELETE /api/comments/:id
// @desc    Delete a comment
// @access  Private
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const comment = await Comment.findOneAndDelete({
      _id: req.params.id,
      author: req.user?._id,
    });

    if (!comment) {
      res.status(404).json({
        success: false,
        message: 'Comment not found or not authorized',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch {
    res.status(500).json({
      success: false,
      message: 'Error deleting comment',
    });
  }
});

export default router;
