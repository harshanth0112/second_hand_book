import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { env } from './config/env.js';
import { configurePassport } from './config/passport.js';
import authRoutes from './routes/auth.routes.js';
import meRoutes from './routes/me.routes.js';
import listingRoutes from './routes/listings.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Initialize Passport (session: false — no Express sessions used)
  configurePassport();
  app.use(passport.initialize());

  // Mount API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/me', meRoutes);
  app.use('/api/listings', listingRoutes);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 404 handler for unknown routes
  app.use((req, res) => {
    res.status(404).json({ message: 'Resource not found' });
  });

  // Centralized error handler
  app.use(errorHandler);

  return app;
};
