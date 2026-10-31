import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { env } from '../config/env.js';

export const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.[env.COOKIE_NAME];

    if (!token) {
      return res.status(401).json({
        message: 'Authentication required',
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return res.status(401).json({
        message: 'Invalid or expired token',
      });
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(401).json({
        message: 'User no longer exists',
      });
    }

    // Session versioning: normalize missing DB value to 0 (backward compat
    // for Step 1 users who were created before sessionVersion was added).
    const dbVersion = user.sessionVersion ?? 0;
    const tokenVersion = decoded.sessionVersion;

    // Reject tokens that are missing sessionVersion, non-integer, or stale.
    if (
      typeof tokenVersion !== 'number' ||
      !Number.isInteger(tokenVersion) ||
      tokenVersion !== dbVersion
    ) {
      return res.status(401).json({
        message: 'Session invalidated. Please log in again.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
