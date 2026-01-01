import { Router, Response } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import multer from 'multer';
import crypto from 'crypto';
import { protect, AuthRequest } from '../middleware/auth';

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

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY || '',
    secretAccessKey: process.env.AWS_SECRET_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'app-trackit-dev';

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

      const userId = req.user?._id?.toString() || 'anonymous';
      const fileExtension = req.file.originalname.split('.').pop() || 'jpg';
      const fileName = `notes/${userId}/${generateId()}.${fileExtension}`;

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        // Make the object publicly readable
        ACL: 'public-read',
      });

      await s3Client.send(command);

      // Construct the public URL
      const imageUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${fileName}`;

      console.log(`[UPLOAD] Image uploaded: ${imageUrl}`);

      res.json({
        success: true,
        url: imageUrl,
        fileName,
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

export default router;

