import { z } from 'zod';
import { DEPARTMENTS } from '../models/User.js';

export const createWantedSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').max(300).optional(),
  subject: z.string().trim().min(1, 'Subject cannot be empty').max(100).optional(),
  department: z.enum(DEPARTMENTS).optional(),
  maxPrice: z.number().nonnegative().optional()
}).refine((data) => Boolean(data.title || data.subject), {
  message: 'At least one of title or subject must be provided'
});

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unread: z.preprocess((val) => {
    if (val === 'true' || val === true) return true;
    if (val === 'false' || val === false) return false;
    return undefined;
  }, z.boolean().optional())
});

export const patchNotificationSchema = z.object({
  read: z.literal(true)
});

export const wishlistQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

