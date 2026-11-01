import crypto from 'crypto';
import { User } from '../models/User.js';
import { signToken } from '../utils/jwt.js';
import { sendMail, sendNotificationEmail, sendPasswordResetEmail } from '../utils/mailer.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

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

const sendWelcomeEmail = (user) => sendMail({
  to: user.email,
  templateSlug: 'welcome',
  data: {
    name: user.name || 'Student',
    product: 'CampusBooks',
  },
}).catch((err) => console.error('[AuthService] Welcome email failed:', err.message));

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

    sendWelcomeEmail(user);

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
    if (!user || user.deletedAt) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }

    if (user.isBanned) {
      const err = new Error('Your account has been banned');
      err.status = 403;
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
      templateSlug: 'verify-email',
      data: {
        name: user.name || 'Student',
        link: verificationUrl,
      },
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
   *
   * We intentionally do not use the built-in Sendliberty `password-reset`
   * template because its rendered content is not verified to make the `code`
   * variable a clickable link. Sendliberty supports raw HTML email bodies, so
   * the reset message includes an explicit link.
   */
  static async forgotPassword(email) {
    const user = await User.findOne({ email });

    if (!user) return;

    const { raw, hash } = generateToken();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${raw}`;

    try {
      const result = await User.updateOne(
        { _id: user._id },
        { $push: { passwordResetPendingTokens: { tokenHash: hash, expires } } },
      );
      if (result.matchedCount === 0) return;
    } catch {
      logger.error({
        event: 'password_reset_state_persist_failed',
        purpose: 'password_reset',
        stage: 'prepare',
      });
      return;
    }

    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        link: resetUrl,
      });
    } catch (err) {
      const category = err.statusCode === 429
        ? 'rate_limited'
        : err.statusCode
          ? 'provider_rejected'
          : 'network_or_configuration_failure';

      logger.error({
        event: 'email_delivery_failed',
        provider: 'sendliberty',
        purpose: 'password_reset',
        category,
        statusCode: err.statusCode,
        retryAfter: err.retryAfter,
      });

      try {
        await User.updateOne(
          { _id: user._id },
          { $pull: { passwordResetPendingTokens: { tokenHash: hash } } },
        );
      } catch {
        logger.error({
          event: 'password_reset_state_cleanup_failed',
          purpose: 'password_reset',
          stage: 'send_failure',
        });
      }
      return;
    }

    try {
      await User.updateOne(
        { _id: user._id, 'passwordResetPendingTokens.tokenHash': hash },
        {
          $set: {
            passwordResetTokenHash: hash,
            passwordResetExpires: expires,
          },
          $pull: { passwordResetPendingTokens: { tokenHash: hash } },
        },
      );
    } catch {
      // The pending hash remains usable if promotion fails after delivery.
      logger.error({
        event: 'password_reset_state_persist_failed',
        purpose: 'password_reset',
        stage: 'promote',
      });
    }
  }

  /**
   * Complete a password reset using the raw token.
   */
  static async resetPassword(rawToken, newPassword) {
    const hash = hashToken(rawToken);

    const user = await User.findOne({
      $or: [
        { passwordResetTokenHash: hash },
        { 'passwordResetPendingTokens.tokenHash': hash },
      ],
    });
    if (!user) {
      const err = new Error('Invalid or expired reset token');
      err.status = 400;
      throw err;
    }

    const pendingToken = user.passwordResetPendingTokens.find(
      (token) => token.tokenHash === hash,
    );
    const expires = pendingToken?.expires ?? user.passwordResetExpires;
    if (!expires || expires < new Date()) {
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
    user.passwordResetPendingTokens = [];

    // Ensure 'local' provider is registered (e.g. Google user setting a password)
    if (!user.authProviders.includes('local')) {
      user.authProviders.push('local');
    }

    await user.save();

    // Security alert: send password change notification email.
    sendNotificationEmail({
      to: user.email,
      name: user.name,
      subject: 'Security Alert: Your CampusBooks Password Was Changed',
      message: `Your CampusBooks account password was changed on ${new Date().toUTCString()}. If you did not make this change, reset your password or contact support.`,
      link: `${env.CLIENT_URL}/forgot-password`,
    }).catch((err) => console.error('[Password Reset Alert Mail Error]:', err.message));

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
    user.passwordResetTokenHash = null;
    user.passwordResetExpires = null;
    user.passwordResetPendingTokens = [];
    await user.save();

    // Issue a new token with the updated sessionVersion so the current
    // session remains valid immediately after the change.
    const token = signToken(user);

    // Security alert: send password change notification email.
    sendNotificationEmail({
      to: user.email,
      name: user.name,
      subject: 'Security Alert: Your CampusBooks Password Was Changed',
      message: `Your CampusBooks account password was changed on ${new Date().toUTCString()}. If you did not make this change, reset your password or contact support.`,
      link: `${env.CLIENT_URL}/forgot-password`,
    }).catch((err) => console.error('[Password Change Alert Mail Error]:', err.message));

    return { user, token };
  }

  // ── Google OAuth ─────────────────────────────────────────────────────────────

  /**
   * Find or create a user from Google profile data.
   * Logic:
   *   1. Find by googleId → return existing user (checking banned/deleted status).
   *   2. Find by email → link Google provider to existing account if Google email is verified.
   *   3. Create new account with Google data.
   */
  static async findOrCreateGoogleUser({ googleId, email, name, avatar, emailVerified = true }) {
    // 1. Existing Google user by googleId
    let user = await User.findOne({ googleId });
    if (user) {
      if (user.deletedAt) {
        const err = new Error('This account has been deleted');
        err.status = 403;
        throw err;
      }
      if (user.isBanned) {
        const err = new Error('Your account has been banned');
        err.status = 403;
        throw err;
      }

      // Keep avatar updated if missing
      let modified = false;
      if (!user.avatar && avatar) {
        user.avatar = avatar;
        modified = true;
      }
      if (modified) {
        await user.save();
      }

      const token = signToken(user);
      return { user, token };
    }

    // 2. Existing account with matching email → link Google securely
    user = await User.findOne({ email });
    if (user) {
      if (user.deletedAt) {
        const err = new Error('This account has been deleted');
        err.status = 403;
        throw err;
      }
      if (user.isBanned) {
        const err = new Error('Your account has been banned');
        err.status = 403;
        throw err;
      }

      // Security check: Only link if Google verified this email address
      if (!emailVerified) {
        const err = new Error('Google email address must be verified to link accounts');
        err.status = 400;
        throw err;
      }

      // Prevent takeover if this user already has a different googleId attached
      if (user.googleId && user.googleId !== googleId) {
        const err = new Error('Account is already linked to a different Google account');
        err.status = 409;
        throw err;
      }

      user.googleId = googleId;
      if (!user.authProviders.includes('google')) {
        user.authProviders.push('google');
      }
      if (!user.avatar && avatar) {
        user.avatar = avatar;
      }

      user.emailVerified = true;
      user.isVerified = true;
      user.emailVerificationTokenHash = null;
      user.emailVerificationExpires = null;

      await user.save();
      const token = signToken(user);
      return { user, token };
    }

    // 3. New Google user — require email verification link via Gmail
    user = await User.create({
      name: name || email.split('@')[0],
      email,
      password: null, // Google-only; set via password reset if needed
      googleId,
      emailVerified: false,
      isVerified: false,
      authProviders: ['google'],
      sessionVersion: 0,
      avatar: avatar || '',
      role: 'student',
      emailVerified,
      isVerified: emailVerified,
    });

    sendWelcomeEmail(user);
    if (!emailVerified) {
      await AuthService.sendVerificationEmail(user).catch((err) =>
        console.error('[Google Signup Verification Email Error]:', err.message)
      );
    }

    const token = signToken(user);
    return { user, token };
  }
}
