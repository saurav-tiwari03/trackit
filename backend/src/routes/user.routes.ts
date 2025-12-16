import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import { User } from '../models';

const router = Router();

router.use(protect);

router.get(
  '/search',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { query } = req.query;

      if (!query || typeof query !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Search query is required',
        });
        return;
      }

      const users = await User.find({
        $and: [
          { _id: { $ne: req.user?._id } }, // Exclude current user
          {
            $or: [
              { name: { $regex: query, $options: 'i' } },
              { email: { $regex: query, $options: 'i' } },
            ],
          },
        ],
      })
        .select('name email avatar status')
        .limit(10);

      res.json({
        success: true,
        data: users,
      });
    } catch {
      res.status(500).json({
        success: false,
        message: 'Failed to search users',
      });
    }
  }
);

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select(
      'name email avatar status'
    );

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: user,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
    });
  }
});

export default router;
