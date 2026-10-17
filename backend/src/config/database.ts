import { connect } from 'mongoose';
import { SERVER } from './config';

export const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await connect(SERVER.DB_URI, {
      dbName: SERVER.DB_NAME,
    });
    console.log('Connected to MongoDB:', SERVER.DB_NAME);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};
