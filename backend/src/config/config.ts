import dotenv from 'dotenv';

dotenv.config({
  path: `.env.${process.env.NODE_ENV}`,
  override: true,
});

export const SERVER = {
  PORT: process.env.PORT || 5000,
  DB_URI: process.env.DB_URI || 'mongodb://localhost:27017/trackit',
  DB_NAME: process.env.DB_NAME || 'dev',
  JWT_SECRET:
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
};

export const AWS_S3_CONFIG = {
  AWS_SECRET_KEY: process.env.AWS_SECRET_KEY || '',
  AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY || '',
  AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME || '',
  AWS_REGION: process.env.AWS_REGION || '',
};

export const GOOGLE_CONFIG = {
  CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  REDIRECT_URI:
    process.env.GOOGLE_REDIRECT_URI ||
    'http://localhost:5000/api/calendar/google/callback',
};

export const RAZORPAY_CONFIG = {
  KEY_ID: process.env.RAZORPAY_API_KEY || '',
  KEY_SECRET: process.env.RAZORPAY_SECRET_KEY || '',
  WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',
};

// Razorpay Plan IDs (created in Razorpay Dashboard)
export const SUBSCRIPTION_PLANS = {
  plus: {
    name: 'Plus',
    planId: 'plan_RyEhVsLqxpORQ1', // Razorpay Plan ID
    amount: 9900, // ₹99
    currency: 'INR',
    description: 'Plus Plan - Monthly Subscription',
    features: [
      'Unlimited projects',
      'Priority support',
      'Advanced analytics',
      'Custom labels',
    ],
  },
  pro: {
    name: 'Pro',
    planId: 'plan_RyEhrrkZinypDf', // Razorpay Plan ID
    amount: 19900, // ₹199
    currency: 'INR',
    description: 'Pro Plan - Monthly Subscription',
    features: [
      'Everything in Plus',
      'Team collaboration',
      'API access',
      'White-label options',
      'Dedicated support',
    ],
  },
};
