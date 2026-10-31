import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { TrustController } from '../controllers/trust.controller.js';

const router = Router();

router.get('/:id', TrustController.getUserProfile);
router.get('/:id/reviews', TrustController.getUserReviews);
router.post('/:id/report', requireAuth, TrustController.reportUser);
router.post('/:id/block', requireAuth, TrustController.blockUser);
router.delete('/:id/block', requireAuth, TrustController.unblockUser);

export default router;

