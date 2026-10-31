import { createApp } from './src/app.js';
import { connectDB } from './src/config/db.js';
import { env } from './src/config/env.js';
import { logger } from './src/utils/logger.js';

const startServer = async () => {
  await connectDB(env.MONGODB_URI);

  const app = createApp();

  app.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
    logger.info(`Accepting requests from client origin: ${env.CLIENT_URL}`);
  });
};

startServer().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
