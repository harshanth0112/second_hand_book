import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { TrustController } from '../controllers/trust.controller.js';

const router = Router();

router.post('/', requireAuth, TrustController.createReview);

export default router;

