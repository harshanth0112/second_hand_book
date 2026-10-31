import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

export const connectDB = async (uri) => {
  try {
    const conn = await mongoose.connect(uri);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error(`Database connection error: ${error.message}`);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB Disconnected');
  } catch (error) {
    logger.error(`Database disconnection error: ${error.message}`);
  }
};
