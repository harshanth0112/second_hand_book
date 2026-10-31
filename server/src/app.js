import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { env } from './config/env.js';
import { configurePassport } from './config/passport.js';
import authRoutes from './routes/auth.routes.js';
import meRoutes from './routes/me.routes.js';
import listingRoutes from './routes/listings.routes.js';
import requestRoutes from './routes/requests.routes.js';
import meetupPointRoutes from './routes/meetupPoints.routes.js';
import conversationRoutes from './routes/conversations.routes.js';
import messageRoutes from './routes/messages.routes.js';
import notificationRoutes from './routes/notifications.routes.js';
import wantedRoutes from './routes/wanted.routes.js';
import reviewRoutes from './routes/reviews.routes.js';
import userRoutes from './routes/users.routes.js';
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
  app.use('/api/requests', requestRoutes);
  app.use('/api/meetup-points', meetupPointRoutes);
  app.use('/api/conversations', conversationRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/wanted', wantedRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/users', userRoutes);

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
