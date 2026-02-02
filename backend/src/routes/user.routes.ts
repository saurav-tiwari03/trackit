import { Router, Response } from 'express';
import multer from 'multer';
import { protect, AuthRequest } from '../middleware/auth';
import { User } from '../models';
import { uploadToS3, deleteFromS3, getSignedS3Url } from '../utils/fileUpload';
import { validateGeminiApiKey, GEMINI_MODELS, GeminiModelId } from '../service/gemini.service';

// Helper to get avatar URL (signed if S3 key, or original if external URL)
const getAvatarUrl = async (avatar?: string): Promise<string> => {
  if (!avatar) return '';
  if (avatar.startsWith('avatars/')) {
    try {
      return await getSignedS3Url(avatar, 7 * 24 * 60 * 60);
    } catch {
      return '';
    }
  }
  return avatar;
};

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

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

// @route   PUT /api/users/profile
// @desc    Update current user's profile
// @access  Private
router.put(
  '/profile',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name } = req.body;
      const userId = req.user?._id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const updateData: { name?: string } = {};
      if (name) updateData.name = name;

      const user = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
      }).select('name email avatar');

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      const avatarUrl = await getAvatarUrl(user.avatar);

      res.json({
        success: true,
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: avatarUrl,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// @route   POST /api/users/avatar
// @desc    Upload user avatar
// @access  Private
router.post(
  '/avatar',
  upload.single('avatar'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      const { file } = req;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      if (!file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
        return;
      }

      // Validate file type
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ];
      if (!allowedTypes.includes(file.mimetype)) {
        res.status(400).json({
          success: false,
          message:
            'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.',
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 5MB.',
        });
        return;
      }

      // Get current user to check for existing avatar
      const currentUser = await User.findById(userId);

      // Delete old avatar from S3 if exists
      if (currentUser?.avatar && currentUser.avatar.includes('avatars/')) {
        try {
          // Extract key from URL
          const urlParts = currentUser.avatar.split('/');
          const keyIndex = urlParts.findIndex(part => part === 'avatars');
          if (keyIndex !== -1) {
            const key = urlParts.slice(keyIndex).join('/');
            await deleteFromS3(key);
          }
        } catch (err) {
          console.error('Failed to delete old avatar:', err);
        }
      }

      // Upload new avatar to S3
      const key = `avatars/${userId}-${Date.now()}-${file.originalname}`;
      await uploadToS3(file.buffer, key, file.mimetype);

      // Store the S3 key in database
      await User.findByIdAndUpdate(userId, { avatar: key });

      // Get signed URL for immediate use (valid for 7 days)
      const signedUrl = await getSignedS3Url(key, 7 * 24 * 60 * 60);

      const user = await User.findById(userId).select('name email avatar');

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: signedUrl, // Return signed URL, not the key
        },
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload avatar',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// @route   DELETE /api/users/avatar
// @desc    Remove user avatar
// @access  Private
router.delete(
  '/avatar',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      // Get current user to check for existing avatar
      const currentUser = await User.findById(userId);

      // Delete avatar from S3 if exists
      if (currentUser?.avatar && currentUser.avatar.includes('avatars/')) {
        try {
          // Extract key from URL
          const urlParts = currentUser.avatar.split('/');
          const keyIndex = urlParts.findIndex(part => part === 'avatars');
          if (keyIndex !== -1) {
            const key = urlParts.slice(keyIndex).join('/');
            await deleteFromS3(key);
          }
        } catch (err) {
          console.error('Failed to delete avatar:', err);
        }
      }

      // Update user to remove avatar
      const user = await User.findByIdAndUpdate(
        userId,
        { avatar: '' },
        { new: true }
      ).select('name email avatar');

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to remove avatar',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// @route   PUT /api/users/gemini-key
// @desc    Update user's Gemini API key and model (validates before saving)
// @access  Private
router.put(
  '/gemini-key',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { geminiApiKey, geminiModel, skipValidation } = req.body;
      const userId = req.user?._id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      // If removing the key, just update and return
      if (!geminiApiKey?.trim()) {
        await User.findByIdAndUpdate(userId, { geminiApiKey: '' });
        res.json({
          success: true,
          message: 'Gemini API key removed',
          data: {
            hasGeminiKey: false,
            valid: false,
          },
        });
        return;
      }

      // Use provided model or default (and normalize to supported models)
      const validModels = GEMINI_MODELS.map(m => m.id) as string[];
      const requestedModel = geminiModel || 'gemini-2.5-flash';
      const modelToUse = validModels.includes(requestedModel) ? requestedModel : 'gemini-2.5-flash';

      // Validate the API key before saving (unless skipped)
      if (!skipValidation) {
        const validation = await validateGeminiApiKey(geminiApiKey.trim(), modelToUse);

        if (!validation.valid) {
          res.status(400).json({
            success: false,
            message: validation.error || 'Invalid API key',
            data: {
              valid: false,
              error: validation.error,
            },
          });
          return;
        }
      }

      // Save the validated key and model preference
      await User.findByIdAndUpdate(userId, {
        geminiApiKey: geminiApiKey.trim(),
        geminiModel: modelToUse,
      });

      res.json({
        success: true,
        message: 'Gemini API key saved and validated',
        data: {
          hasGeminiKey: true,
          valid: true,
          geminiModel: modelToUse,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update Gemini API key',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// @route   POST /api/users/gemini-key/validate
// @desc    Validate a Gemini API key without saving
// @access  Private
router.post(
  '/gemini-key/validate',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { geminiApiKey } = req.body;

      if (!geminiApiKey?.trim()) {
        res.status(400).json({
          success: false,
          message: 'API key is required',
        });
        return;
      }

      const validation = await validateGeminiApiKey(geminiApiKey.trim());

      res.json({
        success: true,
        data: {
          valid: validation.valid,
          error: validation.error,
          modelsTested: validation.modelsTested,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to validate API key',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// @route   GET /api/users/gemini-key/status
// @desc    Check if user has a Gemini API key configured and get model preference
// @access  Private
router.get(
  '/gemini-key/status',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      const validModels = GEMINI_MODELS.map(m => m.id) as string[];

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const user = await User.findById(userId).select('+geminiApiKey geminiModel');

      // Mask the API key for display (show first 4 and last 4 characters)
      const apiKey = user?.geminiApiKey?.trim();
      let maskedKey = '';
      if (apiKey && apiKey.length > 8) {
        maskedKey = `${apiKey.slice(0, 4)}${'•'.repeat(Math.min(apiKey.length - 8, 20))}${apiKey.slice(-4)}`;
      } else if (apiKey) {
        maskedKey = '••••••••••••';
      }

      // If user's saved model is invalid/expired, migrate to default to stop 404s
      const currentModel = user?.geminiModel || 'gemini-2.5-flash';
      const normalizedModel = validModels.includes(currentModel) ? currentModel : 'gemini-2.5-flash';
      if (user && currentModel !== normalizedModel) {
        await User.findByIdAndUpdate(userId, { geminiModel: normalizedModel });
      }

      res.json({
        success: true,
        data: {
          hasGeminiKey: !!apiKey,
          maskedKey,
          geminiModel: normalizedModel,
          availableModels: GEMINI_MODELS,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to check Gemini API key status',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// @route   PUT /api/users/gemini-model
// @desc    Update user's preferred Gemini model
// @access  Private
router.put(
  '/gemini-model',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { geminiModel } = req.body;
      const userId = req.user?._id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      // Validate model ID
      const validModels = GEMINI_MODELS.map(m => m.id) as string[];
      if (!validModels.includes(geminiModel)) {
        res.status(400).json({
          success: false,
          message: `Invalid model. Must be one of: ${validModels.join(', ')}`,
        });
        return;
      }

      await User.findByIdAndUpdate(userId, { geminiModel });

      res.json({
        success: true,
        message: 'Gemini model preference updated',
        data: {
          geminiModel,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update Gemini model',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
