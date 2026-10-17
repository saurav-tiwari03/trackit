import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AWS_S3_CONFIG } from '../config/config';

// Initialize S3 client
const s3Client = new S3Client({
  region: AWS_S3_CONFIG.AWS_REGION,
  credentials: {
    accessKeyId: AWS_S3_CONFIG.AWS_ACCESS_KEY,
    secretAccessKey: AWS_S3_CONFIG.AWS_SECRET_KEY,
  },
});

/**
 * Upload a file to S3
 * @param buffer - File buffer
 * @param key - S3 object key (path)
 * @param contentType - MIME type of the file
 * @returns The S3 key of the uploaded file
 */
export const uploadToS3 = async (
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: AWS_S3_CONFIG.AWS_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return key;
};

/**
 * Delete a file from S3
 * @param key - S3 object key (path)
 */
export const deleteFromS3 = async (key: string): Promise<void> => {
  const command = new DeleteObjectCommand({
    Bucket: AWS_S3_CONFIG.AWS_BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
};

/**
 * Get a signed URL for accessing a private S3 object
 * @param key - S3 object key (path)
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Signed URL
 */
export const getSignedS3Url = async (
  key: string,
  expiresIn: number = 3600
): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: AWS_S3_CONFIG.AWS_BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
};

/**
 * Get the public URL for an S3 object (if bucket is public)
 * @param key - S3 object key (path)
 * @returns Public URL
 */
export const getPublicS3Url = (key: string): string =>
  `https://${AWS_S3_CONFIG.AWS_BUCKET_NAME}.s3.${AWS_S3_CONFIG.AWS_REGION}.amazonaws.com/${key}`;
