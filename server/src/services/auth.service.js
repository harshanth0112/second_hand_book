import crypto from 'crypto';
import { User } from '../models/User.js';
import { signToken } from '../utils/jwt.js';
import { sendMail } from '../utils/mailer.js';
import { env } from '../config/env.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically random token and return both the raw value
 * (to be sent to the user) and its SHA-256 hash (to be stored in MongoDB).
 * Raw tokens are NEVER stored in the database.
 */
const generateToken = () => {
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
};

/**
 * Hash a raw token for database lookup.
 */
const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

// ── AuthService ───────────────────────────────────────────────────────────────

export class AuthService {
  // ── Registration ────────────────────────────────────────────────────────────

  static async register({ name, email, password, college, department }) {
    const existing = await User.findOne({ email });
    if (existing) {
      const err = new Error('Email is already registered');
      err.status = 409;
      throw err;
    }

    const user = await User.create({
      name,
      email,
      password,
      college: college || '',
      department: department || '',
      emailVerified: false,
      isVerified: false,
      role: 'student',
      authProviders: ['local'],
      sessionVersion: 0,
    });

    try {
      await AuthService.sendVerificationEmail(user);
    } catch (mailErr) {
      console.error('[AuthService] Verification email send failed:', mailErr.message);
    }

    const token = signToken(user);
    return { user, token };
  }

  // ── Login ────────────────────────────────────────────────────────────────────

  static async login({ email, password }) {
    const user = await User.findOne({ email });
    if (!user) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }

    // Google-only accounts cannot log in with a password
    if (!user.password && !user.authProviders.includes('local')) {
      const err = new Error('This account uses Google login. Please sign in with Google.');
      err.status = 401;
      throw err;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }

    const token = signToken(user);
    return { user, token };
  }

  // ── Email Verification ───────────────────────────────────────────────────────

  /**
   * Generate and store a verification token, then send the verification email.
   * Only the SHA-256 hash is stored in MongoDB.
   */
  static async sendVerificationEmail(user) {
    const { raw, hash } = generateToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    user.emailVerificationTokenHash = hash;
    user.emailVerificationExpires = expires;
    await user.save();

    const verificationUrl = `${env.CLIENT_URL}/verify-email/${raw}`;

    await sendMail({
      to: user.email,
      subject: 'Verify your Book Exchange email address',
      text: `Hello ${user.name},\n\nPlease verify your email address by clicking the link below:\n\n${verificationUrl}\n\nThis link expires in 24 hours.\n\nIf you did not create an account, please ignore this email.\n`,
    });
  }

  /**
   * Verify the email using the raw token sent to the user.
   */
  static async verifyEmail(rawToken) {
    const hash = hashToken(rawToken);

    const user = await User.findOne({ emailVerificationTokenHash: hash });
    if (!user) {
      const err = new Error('Invalid or expired verification token');
      err.status = 400;
      throw err;
    }

    if (!user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
      const err = new Error('Verification token has expired');
      err.status = 400;
      throw err;
    }

    user.emailVerified = true;
    user.isVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpires = null;
    await user.save();

    return user;
  }

  /**
   * Resend verification email. Limited to 3 requests per hour (tracked by
   * checking emailVerificationExpires — if a token was issued in the last 20
   * minutes, we still allow resend but this simple approach avoids a separate
   * counter field). Full rate-limit counting is enforced in the controller
   * via the rate-limiter middleware.
   */
  static async resendVerification(userId) {
    const user = await User.findById(userId);
    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    if (user.emailVerified) {
      const err = new Error('Email address is already verified');
      err.status = 409;
      throw err;
    }

    await AuthService.sendVerificationEmail(user);
    return user;
  }

  // ── Password Reset ───────────────────────────────────────────────────────────

  /**
   * Initiate a password reset flow. Always returns successfully to prevent
   * user enumeration — even if the email is not found.
   */
  static async forgotPassword(email) {
    const user = await User.findOne({ email });

    // Always respond the same way regardless of whether the user exists
    if (!user) return;

    const { raw, hash } = generateToken();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.passwordResetTokenHash = hash;
    user.passwordResetExpires = expires;
    await user.save();

    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${raw}`;

    await sendMail({
      to: user.email,
      subject: 'Reset your Book Exchange password',
      text: `Hello ${user.name},\n\nYou requested a password reset. Click the link below to set a new password:\n\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you did not request this, please ignore this email.\n`,
    });
  }

  /**
   * Complete a password reset using the raw token.
   */
  static async resetPassword(rawToken, newPassword) {
    const hash = hashToken(rawToken);

    const user = await User.findOne({ passwordResetTokenHash: hash });
    if (!user) {
      const err = new Error('Invalid or expired reset token');
      err.status = 400;
      throw err;
    }

    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      const err = new Error('Reset token has expired');
      err.status = 400;
      throw err;
    }

    // Invalidate all previous sessions by incrementing sessionVersion
    user.sessionVersion = (user.sessionVersion ?? 0) + 1;
    user.passwordChangedAt = new Date(); // audit timestamp
    user.password = newPassword; // will be hashed by pre-save hook
    user.passwordResetTokenHash = null;
    user.passwordResetExpires = null;

    // Ensure 'local' provider is registered (e.g. Google user setting a password)
    if (!user.authProviders.includes('local')) {
      user.authProviders.push('local');
    }

    await user.save();
    return user;
  }

  // ── Change Password (authenticated) ─────────────────────────────────────────

  /**
   * Change password for an authenticated user.
   * Returns a new JWT token with the incremented sessionVersion.
   */
  static async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId);
    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    // Google-only accounts cannot change password until they set one via reset
    if (!user.authProviders.includes('local') || !user.password) {
      const err = new Error(
        'This account uses Google login. Use forgot password to set a local password.'
      );
      err.status = 409;
      throw err;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      const err = new Error('Current password is incorrect');
      err.status = 401;
      throw err;
    }

    // Invalidate all previous sessions by incrementing sessionVersion
    user.sessionVersion = (user.sessionVersion ?? 0) + 1;
    user.passwordChangedAt = new Date(); // audit timestamp
    user.password = newPassword; // will be hashed by pre-save hook
    await user.save();

    // Issue a new token with the updated sessionVersion so the current
    // session remains valid immediately after the change.
    const token = signToken(user);
    return { user, token };
  }

  // ── Google OAuth ─────────────────────────────────────────────────────────────

  /**
   * Find or create a user from Google profile data.
   * Logic:
   *   1. Find by googleId → return existing user.
   *   2. Find by email → link Google provider to existing account.
   *   3. Create new account with Google data.
   */
  static async findOrCreateGoogleUser({ googleId, email, name, avatar }) {
    // 1. Existing Google user
    let user = await User.findOne({ googleId });
    if (user) {
      const token = signToken(user);
      return { user, token };
    }

    // 2. Existing email account → link Google
    user = await User.findOne({ email });
    if (user) {
      user.googleId = googleId;
      user.emailVerified = true;
      user.isVerified = true;
      if (!user.authProviders.includes('google')) {
        user.authProviders.push('google');
      }
      if (!user.avatar && avatar) {
        user.avatar = avatar;
      }
      await user.save();
      const token = signToken(user);
      return { user, token };
    }

    // 3. New Google user
    user = await User.create({
      name,
      email,
      password: null, // Google-only; set via password reset if needed
      googleId,
      emailVerified: true,
      isVerified: true,
      authProviders: ['google'],
      sessionVersion: 0,
      avatar: avatar || '',
      role: 'student',
    });

    const token = signToken(user);
    return { user, token };
  }
}
