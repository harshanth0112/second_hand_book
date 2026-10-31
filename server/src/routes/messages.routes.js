import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { patchOfferSchema } from '../validators/chat.validator.js';
import { z } from 'zod';

const router = Router();

router.use(requireAuth);

const messageIdParamsSchema = z
  .object({
    id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid messageId format'),
  })
  .strict();

// PATCH /api/messages/:id/offer
router.patch(
  '/:id/offer',
  validateParams(messageIdParamsSchema),
  validateBody(patchOfferSchema),
  ChatController.handleOffer
);

export default router;

