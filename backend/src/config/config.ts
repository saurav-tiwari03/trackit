import dotenv from 'dotenv';

dotenv.config({
  path: `.env.${process.env.NODE_ENV}`,
  override: true,
});

export const SERVER = {
  PORT: process.env.PORT || 3000,
  DB_URI: process.env.DB_URI || 'mongodb://localhost:27017/trackit',
  DB_NAME: process.env.DB_NAME || 'dev',
};
