import { z } from 'zod';

export const startConversationSchema = z
  .object({
    listingId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid listingId format'),
  })
  .strict();

export const messageCursorQuerySchema = z
  .object({
    before: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid messageId format').optional(),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  })
  .strict();

export const patchOfferSchema = z
  .object({
    action: z.enum(['accept', 'decline']),
  })
  .strict();

