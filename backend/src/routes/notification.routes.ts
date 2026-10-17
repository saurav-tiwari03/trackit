import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { Notification } from '../models';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(protect);

// @route   GET /api/notifications
// @desc    List notifications for current user
// @access  Private
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const recipient = req.user?._id;
    const unreadOnly = String(req.query.unreadOnly || '') === 'true';
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(100, limitRaw))
      : 50;

    const query: Record<string, unknown> = { recipient };
    if (unreadOnly) query.readAt = null;

    const [items, unreadCount] = await Promise.all([
      Notification.find(query)
        .populate('actor', 'name email avatar')
        .populate('project', 'name color')
        .sort({ createdAt: -1 })
        .limit(limit),
      Notification.countDocuments({ recipient, readAt: null }),
    ]);

    res.status(200).json({
      success: true,
      data: items,
      unreadCount,
    });
  } catch {
    res
      .status(500)
      .json({ success: false, message: 'Error fetching notifications' });
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Get unread notifications count
// @access  Private
router.get('/unread-count', async (req: AuthRequest, res: Response) => {
  try {
    const recipient = req.user?._id;
    const unreadCount = await Notification.countDocuments({
      recipient,
      readAt: null,
    });
    res.status(200).json({ success: true, data: { unreadCount } });
  } catch {
    res
      .status(500)
      .json({ success: false, message: 'Error fetching unread count' });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark a notification read
// @access  Private
router.put('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const recipient = req.user?._id;
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res
        .status(400)
        .json({ success: false, message: 'Invalid notification id' });
      return;
    }

    const updated = await Notification.findOneAndUpdate(
      { _id: id, recipient, readAt: null },
      { readAt: new Date() },
      { new: true }
    )
      .populate('actor', 'name email avatar')
      .populate('project', 'name color');

    res.status(200).json({ success: true, data: updated });
  } catch {
    res
      .status(500)
      .json({ success: false, message: 'Error updating notification' });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications read
// @access  Private
router.put('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    const recipient = req.user?._id;
    await Notification.updateMany(
      { recipient, readAt: null },
      { $set: { readAt: new Date() } }
    );
    res.status(200).json({ success: true });
  } catch {
    res
      .status(500)
      .json({ success: false, message: 'Error marking notifications read' });
  }
});

// @route   DELETE /api/notifications/clear-all
// @desc    Delete all notifications for current user
// @access  Private
router.delete('/clear-all', async (req: AuthRequest, res: Response) => {
  try {
    const recipient = req.user?._id;
    await Notification.deleteMany({ recipient });
    res.status(200).json({ success: true });
  } catch {
    res
      .status(500)
      .json({ success: false, message: 'Error clearing notifications' });
  }
});

export default router;
