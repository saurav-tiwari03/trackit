import { Router, Response } from 'express';
import { User } from '../models';
import { protect, generateToken, AuthRequest } from '../middleware/auth';
import { getSignedS3Url } from '../utils/fileUpload';

// Helper to get avatar URL (signed if S3 key, or original if external URL)
const getAvatarUrl = async (avatar?: string): Promise<string> => {
  if (!avatar) return '';
  // If it's an S3 key (starts with 'avatars/'), generate signed URL
  if (avatar.startsWith('avatars/')) {
    try {
      return await getSignedS3Url(avatar, 7 * 24 * 60 * 60); // 7 days
    } catch {
      return '';
    }
  }
  // Otherwise return as-is (external URL or legacy)
  return avatar;
};

const router = Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
      return;
    }

    // Create user
    const user = new User({
      name,
      email,
      password,
    });
    await user.save();

    // Generate token
    const token = generateToken(user._id.toString());

    const avatarUrl = await getAvatarUrl(user.avatar);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: avatarUrl,
          labels: user.labels || [],
          subscriptionPlan: user.subscriptionPlan || 'free',
          subscriptionStatus: user.subscriptionStatus || 'active',
          subscriptionExpiresAt: user.subscriptionExpiresAt,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
      return;
    }

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
      return;
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
      return;
    }

    // Generate token
    const token = generateToken(user._id.toString());
    const avatarUrl = await getAvatarUrl(user.avatar);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: avatarUrl,
          labels: user.labels || [],
          subscriptionPlan: user.subscriptionPlan || 'free',
          subscriptionStatus: user.subscriptionStatus || 'active',
          subscriptionExpiresAt: user.subscriptionExpiresAt,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req: AuthRequest, res: Response) => {
  try {
    const avatarUrl = await getAvatarUrl(req.user?.avatar);

    res.status(200).json({
      success: true,
      data: {
        id: req.user?._id,
        name: req.user?.name,
        email: req.user?.email,
        avatar: avatarUrl,
        labels: req.user?.labels || [],
        subscriptionPlan: req.user?.subscriptionPlan || 'free',
        subscriptionStatus: req.user?.subscriptionStatus || 'active',
        subscriptionExpiresAt: req.user?.subscriptionExpiresAt,
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', protect, async (_req: AuthRequest, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

export default router;
