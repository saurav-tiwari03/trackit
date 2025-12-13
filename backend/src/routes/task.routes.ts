import { Router, Response } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Task, Project, Comment } from '../models';
import { protect, AuthRequest } from '../middleware/auth';
import { AWS_S3_CONFIG } from '../config/config';

const router = Router();

const isS3Enabled =
  !!AWS_S3_CONFIG.AWS_BUCKET_NAME &&
  !!AWS_S3_CONFIG.AWS_REGION &&
  !!AWS_S3_CONFIG.AWS_ACCESS_KEY &&
  !!AWS_S3_CONFIG.AWS_SECRET_KEY;

const s3 = isS3Enabled
  ? new S3Client({
      region: AWS_S3_CONFIG.AWS_REGION,
      // NOTE: we intentionally use our config variables here.
      // `fromEnv()` expects AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY, but this project uses AWS_ACCESS_KEY / AWS_SECRET_KEY.
      credentials: {
        accessKeyId: AWS_S3_CONFIG.AWS_ACCESS_KEY,
        secretAccessKey: AWS_S3_CONFIG.AWS_SECRET_KEY,
      },
    })
  : null;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF and images are allowed'));
  },
});

const safeFileName = (original: string) =>
  original.replace(/[^a-zA-Z0-9.\-_]/g, '_');

const getAbsoluteLocalUrl = (req: AuthRequest, relative: string) =>
  `${req.protocol}://${req.get('host')}${relative}`;

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
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
    res.status(500).json({
      success: false,
      message: 'Error updating task',
    });
  }
});

// @route   POST /api/tasks/:id/attachments
// @desc    Upload attachments (pdf/images) to a task
// @access  Private
router.post(
  '/:id/attachments',
  upload.array('files', 10),
  async (req: AuthRequest, res: Response) => {
    try {
      const task = await Task.findById(req.params.id);
      if (!task) {
        res.status(404).json({ success: false, message: 'Task not found' });
        return;
      }

      // Ensure user has access via project membership
      const projectDoc = await Project.findOne({
        _id: task.project,
        $or: [{ owner: req.user?._id }, { members: req.user?._id }],
      });
      if (!projectDoc) {
        res.status(403).json({ success: false, message: 'Not authorized' });
        return;
      }

      const files = (req.files || []) as Express.Multer.File[];
      if (files.length === 0) {
        res.status(400).json({ success: false, message: 'No files uploaded' });
        return;
      }

      const newAttachments = await Promise.all(
        files.map(async f => {
          const id = new mongoose.Types.ObjectId();
          const { originalname: originalName, mimetype: mimeType, size } = f;

          if (isS3Enabled && s3) {
            const key = `tasks/${task._id.toString()}/${Date.now()}-${id.toString()}-${safeFileName(originalName)}`;

            await s3.send(
              new PutObjectCommand({
                Bucket: AWS_S3_CONFIG.AWS_BUCKET_NAME,
                Key: key,
                Body: f.buffer,
                ContentType: mimeType,
              })
            );

            return {
              _id: id,
              name: originalName,
              // for s3 we store key in url, and keep key explicitly too
              url: key,
              key,
              storage: 's3' as const,
              mimeType,
              size,
              uploadedAt: new Date(),
            };
          }

          // Local fallback
          const fileName = `${Date.now()}-${id.toString()}-${safeFileName(originalName)}`;
          const uploadsDir = path.join(process.cwd(), 'uploads');
          await fs.mkdir(uploadsDir, { recursive: true });
          await fs.writeFile(path.join(uploadsDir, fileName), f.buffer);

          return {
            _id: id,
            name: originalName,
            url: `/uploads/${fileName}`,
            key: fileName,
            storage: 'local' as const,
            mimeType,
            size,
            uploadedAt: new Date(),
          };
        })
      );

      task.attachments = [...(task.attachments || []), ...newAttachments];
      await task.save();

      const populatedTask = await Task.findById(task._id)
        .populate('assignee', 'name email avatar')
        .populate('creator', 'name email avatar')
        .populate('project', 'name color');

      res.status(200).json({ success: true, data: populatedTask });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error uploading attachments',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// @route   GET /api/tasks/:id/attachments/:attachmentId/url
// @desc    Get a preview/open URL for an attachment (signed for S3)
// @access  Private
router.get(
  '/:id/attachments/:attachmentId/url',
  async (req: AuthRequest, res: Response) => {
    try {
      const task = await Task.findById(req.params.id);
      if (!task) {
        res.status(404).json({ success: false, message: 'Task not found' });
        return;
      }

      const projectDoc = await Project.findOne({
        _id: task.project,
        $or: [{ owner: req.user?._id }, { members: req.user?._id }],
      });
      if (!projectDoc) {
        res.status(403).json({ success: false, message: 'Not authorized' });
        return;
      }

      const attachment = (task.attachments || []).find(
        a => a._id.toString() === req.params.attachmentId
      );
      if (!attachment) {
        res
          .status(404)
          .json({ success: false, message: 'Attachment not found' });
        return;
      }

      if (attachment.storage === 's3') {
        if (!isS3Enabled || !s3) {
          res
            .status(500)
            .json({ success: false, message: 'S3 not configured' });
          return;
        }
        const key = attachment.key || attachment.url;
        const signedUrl = await getSignedUrl(
          s3,
          new GetObjectCommand({
            Bucket: AWS_S3_CONFIG.AWS_BUCKET_NAME,
            Key: key,
          }),
          { expiresIn: 60 * 10 }
        );
        res.status(200).json({ success: true, data: { url: signedUrl } });
        return;
      }

      // Local
      res.status(200).json({
        success: true,
        data: { url: getAbsoluteLocalUrl(req, attachment.url) },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting attachment url',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// @route   DELETE /api/tasks/:id/attachments/:attachmentId
// @desc    Remove an attachment from task and delete from storage (S3/local)
// @access  Private
router.delete(
  '/:id/attachments/:attachmentId',
  async (req: AuthRequest, res: Response) => {
    try {
      const task = await Task.findById(req.params.id);
      if (!task) {
        res.status(404).json({ success: false, message: 'Task not found' });
        return;
      }

      const projectDoc = await Project.findOne({
        _id: task.project,
        $or: [{ owner: req.user?._id }, { members: req.user?._id }],
      });
      if (!projectDoc) {
        res.status(403).json({ success: false, message: 'Not authorized' });
        return;
      }

      const attachment = (task.attachments || []).find(
        a => a._id.toString() === req.params.attachmentId
      );
      if (!attachment) {
        res
          .status(404)
          .json({ success: false, message: 'Attachment not found' });
        return;
      }

      if (attachment.storage === 's3') {
        if (!isS3Enabled || !s3) {
          res
            .status(500)
            .json({ success: false, message: 'S3 not configured' });
          return;
        }
        const key = attachment.key || attachment.url;
        await s3.send(
          new DeleteObjectCommand({
            Bucket: AWS_S3_CONFIG.AWS_BUCKET_NAME,
            Key: key,
          })
        );
      } else {
        const { key } = attachment;
        if (key) {
          const filePath = path.join(process.cwd(), 'uploads', key);
          try {
            await fs.unlink(filePath);
          } catch {
            // ignore missing local file
          }
        }
      }

      task.attachments = (task.attachments || []).filter(
        a => a._id.toString() !== req.params.attachmentId
      );
      await task.save();

      const populatedTask = await Task.findById(task._id)
        .populate('assignee', 'name email avatar')
        .populate('creator', 'name email avatar')
        .populate('project', 'name color');

      res.status(200).json({ success: true, data: populatedTask });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting attachment',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

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
  } catch {
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
  } catch {
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
    } catch {
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
    } catch {
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
  } catch {
    res.status(500).json({
      success: false,
      message: 'Error deleting task',
    });
  }
});

export default router;
