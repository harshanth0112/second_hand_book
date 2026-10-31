import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import {
  startConversationSchema,
  messageCursorQuerySchema,
} from '../validators/chat.validator.js';
import { z } from 'zod';

const router = Router();

router.use(requireAuth);

const conversationIdParamsSchema = z
  .object({
    id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid conversationId format'),
  })
  .strict();

// Start or get conversation
router.post(
  '/',
  validateBody(startConversationSchema),
  ChatController.startConversation
);

// Get conversations inbox
router.get('/', ChatController.getInbox);

// Get messages for a conversation (cursor pagination)
router.get(
  '/:id/messages',
  validateParams(conversationIdParamsSchema),
  validateQuery(messageCursorQuerySchema),
  ChatController.getMessages
);

// Mark conversation read
router.patch(
  '/:id/read',
  validateParams(conversationIdParamsSchema),
  ChatController.markRead
);

export default router;

