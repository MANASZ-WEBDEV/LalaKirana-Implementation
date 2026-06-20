import app from './app.js';
import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables at startup
const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET', 'FRONTEND_URL'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing env var: ${key}`);
  }
}

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`LalaKirana API running on port ${PORT}`);
});

// Graceful Shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
