import express from 'express';
import { startBot } from './bot.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Start the bot in a separate thread (Node.js uses worker threads or child processes for this)
let botProcess = null;

// Define startup and shutdown handling
const startupHandler = () => {
  console.log('Starting up server and bot...');

  // Start the bot in the background
  botProcess = startBot();

  console.log('Bot started successfully');
};

const shutdownHandler = () => {
  console.log('Shutting down server and bot...');

  // Clean up bot process if needed
  if (botProcess && typeof botProcess.stop === 'function') {
    botProcess.stop();
  }

  console.log('Bot stopped successfully');
};

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Server is running and bot is alive!' });
});

// Start the server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  startupHandler();
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  shutdownHandler();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  shutdownHandler();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
