import { Router, Response } from 'express';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import crypto from 'crypto';
import { protect, AuthRequest } from '../middleware/auth';
import { AWS_S3_CONFIG } from '../config/config';

// Generate a unique ID for file names
const generateId = () => `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (_req, file, cb) => {
    // Only allow images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Check if S3 is enabled
const isS3Enabled = Boolean(
  AWS_S3_CONFIG.AWS_ACCESS_KEY &&
  AWS_S3_CONFIG.AWS_SECRET_KEY &&
  AWS_S3_CONFIG.AWS_BUCKET_NAME
);

// Initialize S3 client (only if credentials are available)
const s3Client = isS3Enabled
  ? new S3Client({
      region: AWS_S3_CONFIG.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: AWS_S3_CONFIG.AWS_ACCESS_KEY,
        secretAccessKey: AWS_S3_CONFIG.AWS_SECRET_KEY,
      },
    })
  : null;

// Upload image to S3
router.post(
  '/image',
  protect,
  upload.single('image'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No image file provided' });
        return;
      }

      if (!isS3Enabled || !s3Client) {
        res.status(500).json({ success: false, message: 'S3 is not configured' });
        return;
      }

      const userId = req.user?._id?.toString() || 'anonymous';
      const fileExtension = req.file.originalname.split('.').pop() || 'jpg';
      const fileName = `notes/${userId}/${generateId()}.${fileExtension}`;

      // Upload to S3
      const putCommand = new PutObjectCommand({
        Bucket: AWS_S3_CONFIG.AWS_BUCKET_NAME,
        Key: fileName,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      });

      await s3Client.send(putCommand);

      // Generate a presigned URL that lasts for 7 days
      const getCommand = new GetObjectCommand({
        Bucket: AWS_S3_CONFIG.AWS_BUCKET_NAME,
        Key: fileName,
      });

      const imageUrl = await getSignedUrl(s3Client, getCommand, {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
      });

      console.log(`[UPLOAD] Image uploaded: ${fileName}`);

      res.json({
        success: true,
        url: imageUrl,
        key: fileName,
      });
    } catch (error) {
      console.error('[UPLOAD] Error uploading image:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload image',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// Get a fresh presigned URL for an existing image
router.get(
  '/image/*key',
  protect,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!isS3Enabled || !s3Client) {
        res.status(500).json({ success: false, message: 'S3 is not configured' });
        return;
      }

      const key = req.params.key as string;

      const getCommand = new GetObjectCommand({
        Bucket: AWS_S3_CONFIG.AWS_BUCKET_NAME,
        Key: key,
      });

      const imageUrl = await getSignedUrl(s3Client, getCommand, {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
      });

      res.json({
        success: true,
        url: imageUrl,
      });
    } catch (error) {
      console.error('[UPLOAD] Error getting image URL:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get image URL',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
