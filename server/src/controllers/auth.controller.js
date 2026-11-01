import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { AuthService } from '../services/auth.service.js';
import { env } from '../config/env.js';

// ── Cookie helpers ────────────────────────────────────────────────────────────

const getCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
});

/**
 * Set the authentication cookie on the response.
 */
const setAuthCookie = (res, token) => {
  res.cookie(env.COOKIE_NAME, token, getCookieOptions());
};

// ── AuthController ────────────────────────────────────────────────────────────

export class AuthController {
  // ── Step 1 ───────────────────────────────────────────────────────────────────

  static async register(req, res, next) {
    try {
      const { user, token } = await AuthService.register(req.body);
      setAuthCookie(res, token);
      return res.status(201).json(user.toMeJSON());
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { user, token } = await AuthService.login(req.body);
      setAuthCookie(res, token);
      return res.status(200).json(user.toMeJSON());
    } catch (error) {
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      res.clearCookie(env.COOKIE_NAME, getCookieOptions());
      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async me(req, res, next) {
    try {
      return res.status(200).json(req.user.toMeJSON());
    } catch (error) {
      next(error);
    }
  }

  // ── Email Verification ────────────────────────────────────────────────────────

  static async verifyEmail(req, res, next) {
    try {
      await AuthService.verifyEmail(req.params.token);
      return res.status(200).json({ message: 'Email verified successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async resendVerification(req, res, next) {
    try {
      await AuthService.resendVerification(req.user._id);
      return res.status(200).json({ message: 'Verification email sent' });
    } catch (error) {
      next(error);
    }
  }

  // ── Password Reset ────────────────────────────────────────────────────────────

  static async forgotPassword(req, res, next) {
    try {
      // Always returns 200 to prevent user enumeration
      await AuthService.forgotPassword(req.body.email);
      return res.status(200).json({
        message: 'If that email is registered, a reset link has been sent',
      });
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req, res, next) {
    try {
      await AuthService.resetPassword(req.body.token, req.body.password);
      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // ── Change Password (authenticated) ──────────────────────────────────────────

  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const { token } = await AuthService.changePassword(
        req.user._id,
        currentPassword,
        newPassword
      );
      // Issue a new cookie with the updated sessionVersion so the current
      // session remains valid immediately after the change.
      setAuthCookie(res, token);
      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────────

  /**
   * Step 1 of OAuth: Generate a signed ephemeral state, store it in an httpOnly
   * cookie, then redirect to Google.
   *
   * State protection design:
   *  - rawState = 32 random bytes (hex) — sent to Google as the `state` param.
   *  - A short-lived JWT containing `{ state: rawState, purpose: 'oauth_state' }`
   *    is signed and stored in an httpOnly cookie named `oauth_state`.
   *  - On callback we verify both the JWT signature/expiry AND that the returned
   *    `state` query param matches the claim inside the JWT using
   *    crypto.timingSafeEqual() after a length pre-check.
   *
   * LIMITATION: This stateless approach does not prevent a concurrent race
   * callback within the same browser session if two callbacks arrive before
   * the first one clears the cookie. A server-side state store (Redis/DB) would
   * be required for strict one-time guarantee.
   */
  static async initiateGoogleOAuth(req, res, next) {
    try {
      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
        return res.redirect(`${env.CLIENT_URL}/login?error=oauth_failed`);
      }

      const rawState = crypto.randomBytes(32).toString('hex');

      // Sign a short-lived JWT to bind the state to this browser session
      const stateJwt = jwt.sign(
        { state: rawState, purpose: 'oauth_state' },
        env.JWT_SECRET,
        { expiresIn: '10m' }
      );

      // Store in an httpOnly cookie scoped to the callback path
      res.cookie('oauth_state', stateJwt, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000, // 10 minutes
        path: '/api/auth/google',
      });

      // Delegate the redirect to Passport
      passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: rawState,
        session: false,
      })(req, res, next);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate OAuth state from cookie before allowing Passport to process the
   * callback. Clears the cookie immediately to prevent replay.
   *
   * Returns 'oauth_failed' redirect for any of:
   *   - Missing state query param
   *   - Missing oauth_state cookie
   *   - Invalid/expired JWT signature
   *   - Wrong purpose claim
   *   - state mismatch (timing-safe comparison)
   */
  static validateOAuthState(req, res, next) {
    const returnedState = req.query.state;
    const cookieValue = req.cookies?.oauth_state;

    // Clear cookie immediately (best-effort replay prevention)
    res.clearCookie('oauth_state', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth/google',
    });

    if (!returnedState || !cookieValue) {
      return res.redirect(`${env.CLIENT_URL}/login?error=oauth_failed`);
    }

    let decoded;
    try {
      decoded = jwt.verify(cookieValue, env.JWT_SECRET);
    } catch {
      return res.redirect(`${env.CLIENT_URL}/login?error=oauth_failed`);
    }

    // Validate purpose claim
    if (decoded.purpose !== 'oauth_state') {
      return res.redirect(`${env.CLIENT_URL}/login?error=oauth_failed`);
    }

    // Timing-safe comparison of state values
    const storedState = decoded.state || '';
    if (storedState.length !== returnedState.length) {
      return res.redirect(`${env.CLIENT_URL}/login?error=oauth_failed`);
    }

    try {
      const storedBuf = Buffer.from(storedState, 'utf8');
      const returnedBuf = Buffer.from(returnedState, 'utf8');
      if (!crypto.timingSafeEqual(storedBuf, returnedBuf)) {
        return res.redirect(`${env.CLIENT_URL}/login?error=oauth_failed`);
      }
    } catch {
      return res.redirect(`${env.CLIENT_URL}/login?error=oauth_failed`);
    }

    next();
  }

  /**
   * Final OAuth callback handler — called after Passport authenticates the user.
   */
  static handleGoogleCallback(req, res, next) {
    // When no Passport strategy is registered (e.g. test env without GOOGLE_CLIENT_ID),
    // passport.authenticate() throws synchronously. We wrap in try/catch to handle gracefully.
    let authenticateFn;
    try {
      authenticateFn = passport.authenticate('google', { session: false }, (err, result) => {
        if (err || !result) {
          return res.redirect(`${env.CLIENT_URL}/login?error=oauth_failed`);
        }

        const { token } = result;
        setAuthCookie(res, token);
        return res.redirect(`${env.CLIENT_URL}/dashboard`);
      });
    } catch {
      return res.redirect(`${env.CLIENT_URL}/login?error=oauth_failed`);
    }

    try {
      authenticateFn(req, res, next);
    } catch {
      return res.redirect(`${env.CLIENT_URL}/login?error=oauth_failed`);
    }
  }

  // ── Profile (Me) ──────────────────────────────────────────────────────────────

  static async getProfile(req, res, next) {
    try {
      return res.status(200).json(req.user.toMeJSON());
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const allowed = ['name', 'department', 'semester', 'avatar', 'emailNotifications'];
      const user = req.user;

      for (const field of allowed) {
        if (req.body[field] !== undefined) {
          user[field] = req.body[field];
        }
      }

      await user.save();
      return res.status(200).json(user.toMeJSON());
    } catch (error) {
      next(error);
    }
  }
}
