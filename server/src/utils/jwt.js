import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Sign a JWT for the given user.
 * Payload includes: sub (user ID), role, and sessionVersion.
 * sessionVersion is used for session invalidation on password change/reset.
 * Missing sessionVersion in the user object is normalized to 0 (backward compat).
 */
export const signToken = (user) => {
  const payload = {
    sub: user._id.toString(),
    role: user.role,
    sessionVersion: user.sessionVersion ?? 0,
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};
