import { z } from 'zod';
import { REPORT_REASONS } from '../models/Report.js';

export const createReviewSchema = z
  .object({
    requestId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid requestId format'),
    rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
    comment: z.string().trim().max(1000, 'Comment cannot exceed 1000 characters').optional().default(''),
  })
  .strict();

export const createReportSchema = z
  .object({
    reason: z.enum(REPORT_REASONS, {
      errorMap: () => ({ message: 'Invalid report reason' }),
    }),
    details: z.string().trim().max(1000, 'Details cannot exceed 1000 characters').optional().default(''),
  })
  .strict();

export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

