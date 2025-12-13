import dotenv from 'dotenv';

dotenv.config({
  path: `.env.${process.env.NODE_ENV}`,
  override: true,
});

export const SERVER = {
  PORT: process.env.PORT || 5000,
  DB_URI: process.env.DB_URI || 'mongodb://localhost:27017/trackit',
  DB_NAME: process.env.DB_NAME || 'dev',
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
};
