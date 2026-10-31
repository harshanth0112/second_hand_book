import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { env } from '../config/env.js';

export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.[env.COOKIE_NAME];
    if (!token) {
      req.user = null;
      return next();
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      req.user = null;
      return next();
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      req.user = null;
      return next();
    }

    const dbVersion = user.sessionVersion ?? 0;
    const tokenVersion = decoded.sessionVersion;

    if (
      typeof tokenVersion !== 'number' ||
      !Number.isInteger(tokenVersion) ||
      tokenVersion !== dbVersion
    ) {
      req.user = null;
      return next();
    }

    req.user = user;
    next();
  } catch {
    req.user = null;
    next();
  }
};

