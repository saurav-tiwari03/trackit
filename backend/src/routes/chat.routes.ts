import { Router, Response } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Chat } from '../models';
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
      // PDF
      'application/pdf',
      // Images
      'image/png',
      'image/jpeg',
      'image/webp',
      // Video
      'video/mp4',
      'video/webm',
      'video/quicktime',
      // Voice recordings / audio
      'audio/mpeg', // mp3
      'audio/mp4', // m4a
      'audio/wav',
      'audio/webm',
      'audio/ogg',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image, video, pdf, and audio files are allowed'));
  },
});

const safeFileName = (original: string) =>
  original.replace(/[^a-zA-Z0-9.\-_]/g, '_');

const getAbsoluteLocalUrl = (req: AuthRequest, relative: string) =>
  `${req.protocol}://${req.get('host')}${relative}`;

// All routes require authentication
router.use(protect);

// @route   POST /api/chats/:chatId/attachments
// @desc    Upload chat attachments (pdf/images/videos)
// @access  Private
router.post(
  '/:chatId/attachments',
  upload.array('files', 10),
  async (req: AuthRequest, res: Response) => {
    try {
      const chat = await Chat.findOne({
        _id: req.params.chatId,
        participants: req.user?._id,
      });

      if (!chat) {
        res.status(404).json({ success: false, message: 'Chat not found' });
        return;
      }

      const files = (req.files || []) as Express.Multer.File[];
      if (files.length === 0) {
        res.status(400).json({ success: false, message: 'No files uploaded' });
        return;
      }

      const attachments = await Promise.all(
        files.map(async f => {
          const id = new mongoose.Types.ObjectId();
          const { originalname: originalName, mimetype: mimeType, size } = f;

          if (isS3Enabled && s3) {
            const key = `chats/${chat._id.toString()}/${Date.now()}-${id.toString()}-${safeFileName(originalName)}`;

            await s3.send(
              new PutObjectCommand({
                Bucket: AWS_S3_CONFIG.AWS_BUCKET_NAME,
                Key: key,
                Body: f.buffer,
                ContentType: mimeType,
              })
            );

            const previewUrl = await getSignedUrl(
              s3,
              new GetObjectCommand({
                Bucket: AWS_S3_CONFIG.AWS_BUCKET_NAME,
                Key: key,
              }),
              { expiresIn: 60 * 10 }
            );

            return {
              _id: id,
              name: originalName,
              // store the key in url (same pattern as tasks)
              url: key,
              key,
              storage: 's3' as const,
              mimeType,
              size,
              uploadedAt: new Date(),
              previewUrl,
            };
          }

          // Local fallback
          const fileName = `${Date.now()}-${id.toString()}-${safeFileName(originalName)}`;
          const uploadsDir = path.join(process.cwd(), 'uploads');
          await fs.mkdir(uploadsDir, { recursive: true });
          await fs.writeFile(path.join(uploadsDir, fileName), f.buffer);

          const url = `/uploads/${fileName}`;

          return {
            _id: id,
            name: originalName,
            url,
            key: fileName,
            storage: 'local' as const,
            mimeType,
            size,
            uploadedAt: new Date(),
            previewUrl: getAbsoluteLocalUrl(req, url),
          };
        })
      );

      res.status(200).json({ success: true, data: attachments });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error uploading attachments',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
