import { Router } from 'express';
import { RequestController } from '../controllers/request.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import {
  patchRequestSchema,
  requestListQuerySchema,
} from '../validators/request.validator.js';
import { listingIdParamsSchema } from '../validators/listing.validator.js';
import { z } from 'zod';

const router = Router();

// All request routes require authentication
router.use(requireAuth);

const requestIdParamsSchema = z
  .object({
    id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id format'),
  })
  .strict();

// GET /api/requests/sent
router.get(
  '/sent',
  validateQuery(requestListQuerySchema),
  RequestController.getSent
);

// GET /api/requests/received
router.get(
  '/received',
  validateQuery(requestListQuerySchema),
  RequestController.getReceived
);

// PATCH /api/requests/:id
router.patch(
  '/:id',
  validateParams(requestIdParamsSchema),
  validateBody(patchRequestSchema),
  RequestController.handleAction
);

export default router;

