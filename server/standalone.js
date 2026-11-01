/**
 * ⚠️ DEVELOPMENT ONLY: Standalone In-Memory Server
 * DO NOT use as the production entry point or in Render deployment.
 * Production entry point is server.js (npm start).
 * Requires mongodb-memory-server (devDependencies).
 */
import http from 'http';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from './src/app.js';
import { connectDB } from './src/config/db.js';
import { env } from './src/config/env.js';
import { logger } from './src/utils/logger.js';
import { setupSocketServer } from './src/socket/index.js';
import { startExpiryJob } from './src/jobs/expiry.js';
import { seedDemoData } from './src/seeds/demo.js';

const startStandaloneServer = async () => {
  logger.info('[Standalone] Starting in-memory MongoDB instance...');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  logger.info(`[Standalone] In-memory MongoDB running at: ${uri}`);

  // Connect to the in-memory database
  await connectDB(uri);

  // Automatically seed demo data
  logger.info('[Standalone] Populating demo dataset (students, books, chat, reviews)...');
  await seedDemoData();

  const app = createApp();
  const httpServer = http.createServer(app);

  setupSocketServer(httpServer);
  startExpiryJob();

  httpServer.listen(env.PORT, () => {
    logger.info(`=======================================================`);
    logger.info(`🚀 Server running on http://localhost:${env.PORT}`);
    logger.info(`🌐 Accepting requests from: ${env.CLIENT_URL}`);
    logger.info(`👤 Demo Logins:`);
    logger.info(`   - Admin:   admin@college.edu / Admin1234!`);
    logger.info(`   - Alice:   alice@college.edu / Password123!`);
    logger.info(`   - Charlie: charlie@college.edu / Password123!`);
    logger.info(`   - Diana:   diana@college.edu / Password123!`);
    logger.info(`   - Bob:     bob@college.edu / Password123!`);
    logger.info(`=======================================================`);
  });

  // Graceful shutdown: close HTTP connections and Mongoose before stopping in-memory server
  let isShuttingDown = false;
  const shutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`[Standalone] Shutting down (${signal})...`);

    httpServer.close(async (err) => {
      if (err) {
        logger.error('[Standalone] Error while closing HTTP server:', err);
      }
      try {
        await mongoose.disconnect();
        await mongod.stop();
        logger.info('[Standalone] Cleanup complete. Exiting.');
        process.exit(0);
      } catch (cleanupErr) {
        logger.error('[Standalone] Error during cleanup:', cleanupErr);
        process.exit(1);
      }
    });

    // Fallback force exit after 5s timeout
    setTimeout(() => {
      logger.warn('[Standalone] Forced shutdown after timeout.');
      process.exit(1);
    }, 5000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

startStandaloneServer().catch((err) => {
  logger.error('Failed to start standalone server:', err);
  process.exit(1);
});

