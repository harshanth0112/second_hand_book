import { z } from 'zod';

export const adminReportsQuerySchema = z.object({
  status: z.enum(['open', 'resolved', 'dismissed']).default('open'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const updateReportSchema = z.object({
  status: z.enum(['resolved', 'dismissed', 'open']),
});

export const banUserSchema = z.object({
  banned: z.boolean(),
});

export const createMeetupPointSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().trim().max(300).default(''),
  area: z.string().trim().max(100).default(''),
  active: z.boolean().default(true),
});

export const updateMeetupPointSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
  description: z.string().trim().max(300).optional(),
  area: z.string().trim().max(100).optional(),
  active: z.boolean().optional(),
});

export const deleteAccountSchema = z.object({
  confirm: z.string(),
  password: z.string().optional(),
});

