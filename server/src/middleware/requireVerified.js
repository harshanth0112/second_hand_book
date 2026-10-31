export const requireVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({ message: 'Email verification required' });
  }

  next();
};

