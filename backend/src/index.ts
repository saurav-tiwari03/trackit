import dotenv from 'dotenv';
import { SERVER } from './config/config';
import { connectDB } from './config/database';
import app from './app';

// Load environment variables first
dotenv.config({
  path: `.env.${process.env.NODE_ENV}`,
  override: true,
});

// Start server
app.listen(SERVER.PORT, () => {
  console.log(`Server is running on http://localhost:${SERVER.PORT}`);
  connectDB();
});
