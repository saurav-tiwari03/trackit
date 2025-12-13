import { Router, Response } from 'express';
import { Task, Project, Comment } from '../models';
import { protect, AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';

const router = Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/tasks
// @desc    Get all tasks for current user
// @access  Private
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, priority, project, search } = req.query;

    const query: Record<string, unknown> = {
      $or: [{ assignee: req.user?._id }, { creator: req.user?._id }],
    };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (project) query.project = project;

    // Add text search if search query is provided
    if (search && typeof search === 'string' && search.trim()) {
      query.$and = [
        { $or: query.$or },
        {
          $or: [
            { title: { $regex: search.trim(), $options: 'i' } },
            { description: { $regex: search.trim(), $options: 'i' } },
          ],
        },
      ];
      delete query.$or;
    }

    const tasks = await Task.find(query)
      .populate('project', 'name color')
      .populate('assignee', 'name email avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching tasks',
    });
  }
});

// @route   GET /api/tasks/stats
// @desc    Get task statistics for dashboard
// @access  Private
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    const [open, overdue, inProgress, completed] = await Promise.all([
      Task.countDocuments({
        $or: [{ assignee: userId }, { creator: userId }],
        status: 'open',
      }),
      Task.countDocuments({
        $or: [{ assignee: userId }, { creator: userId }],
        dueDate: { $lt: new Date() },
        isCompleted: false,
      }),
      Task.countDocuments({
        $or: [{ assignee: userId }, { creator: userId }],
        status: 'in_progress',
      }),
      Task.countDocuments({
        $or: [{ assignee: userId }, { creator: userId }],
        isCompleted: true,
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        open,
        overdue,
        inProgress,
        completed,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching stats',
    });
  }
});

// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      description,
      project,
      section,
      assignee,
      priority,
      dueDate,
      labels,
    } = req.body;

    // Verify user has access to project
    const projectDoc = await Project.findOne({
      _id: project,
      $or: [{ owner: req.user?._id }, { members: req.user?._id }],
    });

    if (!projectDoc) {
      res.status(404).json({
        success: false,
        message: 'Project not found',
      });
      return;
    }

    // Get max order for this section
    const maxOrderTask = await Task.findOne({
      project,
      section,
    }).sort({ order: -1 });

    const task = new Task({
      title,
      description,
      project,
      section,
      assignee,
      creator: req.user?._id,
      priority: priority || 'P4',
      dueDate,
      labels,
      order: maxOrderTask ? maxOrderTask.order + 1 : 0,
    });
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignee', 'name email avatar')
      .populate('creator', 'name email avatar')
      .populate('project', 'name color');

    res.status(201).json({
      success: true,
      data: populatedTask,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating task',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   GET /api/tasks/:id
// @desc    Get a single task with comments
// @access  Private
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'name color sections')
      .populate('assignee', 'name email avatar')
      .populate('creator', 'name email avatar');

    if (!task) {
      res.status(404).json({
        success: false,
        message: 'Task not found',
      });
      return;
    }

    // Get comments for this task
    const comments = await Comment.find({ task: task._id })
      .populate('author', 'name email avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        ...task.toObject(),
        comments,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching task',
    });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update a task
// @access  Private
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      description,
      section,
      assignee,
      priority,
      status,
      dueDate,
      labels,
      isCompleted,
      order,
    } = req.body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (section !== undefined) updateData.section = section;
    if (assignee !== undefined) updateData.assignee = assignee;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (labels !== undefined) updateData.labels = labels;
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted;
    if (order !== undefined) updateData.order = order;

    const task = await Task.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('assignee', 'name email avatar')
      .populate('creator', 'name email avatar')
      .populate('project', 'name color');

    if (!task) {
      res.status(404).json({
        success: false,
        message: 'Task not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating task',
    });
  }
});

// @route   PUT /api/tasks/:id/move
// @desc    Move task to different section
// @access  Private
router.put('/:id/move', async (req: AuthRequest, res: Response) => {
  try {
    const { section, order } = req.body;

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { section, order },
      { new: true }
    )
      .populate('assignee', 'name email avatar')
      .populate('creator', 'name email avatar');

    if (!task) {
      res.status(404).json({
        success: false,
        message: 'Task not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error moving task',
    });
  }
});

// @route   POST /api/tasks/:id/subtasks
// @desc    Add a subtask
// @access  Private
router.post('/:id/subtasks', async (req: AuthRequest, res: Response) => {
  try {
    const { title } = req.body;

    const task = await Task.findById(req.params.id);

    if (!task) {
      res.status(404).json({
        success: false,
        message: 'Task not found',
      });
      return;
    }

    const maxOrder = Math.max(...task.subtasks.map(s => s.order), -1);

    task.subtasks.push({
      _id: new mongoose.Types.ObjectId(),
      title,
      isCompleted: false,
      order: maxOrder + 1,
    });

    await task.save();

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding subtask',
    });
  }
});

// @route   PUT /api/tasks/:id/subtasks/:subtaskId
// @desc    Update a subtask
// @access  Private
router.put(
  '/:id/subtasks/:subtaskId',
  async (req: AuthRequest, res: Response) => {
    try {
      const { title, isCompleted } = req.body;

      const task = await Task.findById(req.params.id);

      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Task not found',
        });
        return;
      }

      const subtask = task.subtasks.find(
        s => s._id.toString() === req.params.subtaskId
      );

      if (!subtask) {
        res.status(404).json({
          success: false,
          message: 'Subtask not found',
        });
        return;
      }

      if (title !== undefined) subtask.title = title;
      if (isCompleted !== undefined) subtask.isCompleted = isCompleted;

      await task.save();

      res.status(200).json({
        success: true,
        data: task,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating subtask',
      });
    }
  }
);

// @route   DELETE /api/tasks/:id/subtasks/:subtaskId
// @desc    Delete a subtask
// @access  Private
router.delete(
  '/:id/subtasks/:subtaskId',
  async (req: AuthRequest, res: Response) => {
    try {
      const task = await Task.findById(req.params.id);

      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Task not found',
        });
        return;
      }

      task.subtasks = task.subtasks.filter(
        s => s._id.toString() !== req.params.subtaskId
      );

      await task.save();

      res.status(200).json({
        success: true,
        data: task,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting subtask',
      });
    }
  }
);

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
// @access  Private
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      res.status(404).json({
        success: false,
        message: 'Task not found',
      });
      return;
    }

    // Delete all comments for this task
    await Comment.deleteMany({ task: task._id });

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting task',
    });
  }
});

export default router;

