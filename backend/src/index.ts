import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import { SERVER } from './config/config';
import { connectDB } from './config/database';
import app from './app';
import { initSockets } from './sockets';
import { initCronJobs } from './cron';

// Load environment variables first
dotenv.config({
  path: `.env.${process.env.NODE_ENV}`,
  override: true,
});

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: SERVER.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Initialize socket handlers
initSockets(io);

// Start server
server.listen(SERVER.PORT, () => {
  console.log(`Server is running on http://localhost:${SERVER.PORT}`);
  connectDB();
  // Initialize cron jobs after DB connection
  initCronJobs();
});
