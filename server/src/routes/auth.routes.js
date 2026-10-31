import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../config/env.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator.js';

const router = Router();

// ── Step 1 ────────────────────────────────────────────────────────────────────
router.post('/register', validateBody(registerSchema), AuthController.register);
router.post('/login', validateBody(loginSchema), AuthController.login);
router.post('/logout', AuthController.logout);
router.get('/me', requireAuth, AuthController.me);

// ── Email Verification ────────────────────────────────────────────────────────
router.get('/verify-email/:token', AuthController.verifyEmail);
router.post('/resend-verification', requireAuth, AuthController.resendVerification);

// ── Password Reset ────────────────────────────────────────────────────────────
router.post('/forgot-password', validateBody(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', validateBody(resetPasswordSchema), AuthController.resetPassword);

// ── Google OAuth ──────────────────────────────────────────────────────────────
router.get('/google', AuthController.initiateGoogleOAuth);
router.get(
  '/google/callback',
  AuthController.validateOAuthState,
  AuthController.handleGoogleCallback,
  // Fallback error handler — catches errors that Passport passes to next(err)
  // when no strategy is registered (e.g. test environment without credentials).
  (err, req, res, _next) => {
    res.redirect(`${env.CLIENT_URL}/login?error=oauth_failed`);
  }
);

export default router;
