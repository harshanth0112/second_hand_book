import { z } from 'zod';

export const createRequestSchema = z
  .object({
    message: z.string().trim().max(500, 'Message cannot exceed 500 characters').optional().default(''),
    offeredBook: z.string().trim().max(150, 'Offered book cannot exceed 150 characters').optional().default(''),
  })
  .strict();

export const patchRequestSchema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('accept'),
      meetupPointId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid meetupPointId format'),
      meetupTime: z.string().datetime({ message: 'meetupTime must be a valid ISO 8601 string' }),
    })
    .strict(),
  z
    .object({
      action: z.literal('reject'),
    })
    .strict(),
  z
    .object({
      action: z.literal('cancel'),
    })
    .strict(),
  z
    .object({
      action: z.literal('confirmHandover'),
    })
    .strict(),
]);

export const requestListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
    status: z.enum(['pending', 'accepted', 'rejected', 'cancelled', 'completed']).optional(),
  })
  .strict();

