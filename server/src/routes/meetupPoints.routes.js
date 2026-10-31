import { Router } from 'express';
import { MeetupPoint } from '../models/MeetupPoint.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/meetup-points (Authenticated)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const points = await MeetupPoint.find({ active: true }).sort({ name: 1 });
    return res.status(200).json(points);
  } catch (err) {
    next(err);
  }
});

export default router;

