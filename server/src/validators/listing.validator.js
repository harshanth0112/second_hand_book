import { z } from 'zod';
import { DEPARTMENTS } from '../models/User.js';

const baseListingFields = {
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, 'Title must be at least 1 character')
    .max(150, 'Title cannot exceed 150 characters'),
  author: z
    .string({ required_error: 'Author is required' })
    .trim()
    .min(1, 'Author must be at least 1 character')
    .max(100, 'Author cannot exceed 100 characters'),
  subject: z
    .string()
    .trim()
    .max(60, 'Subject cannot exceed 60 characters')
    .optional()
    .default(''),
  isbn: z
    .string()
    .trim()
    .transform((val) => val.replace(/[-\s]/g, ''))
    .refine((val) => val === '' || /^\d{10}(\d{3})?$/.test(val), {
      message: 'ISBN must be 10 or 13 digits',
    })
    .optional()
    .default(''),
  courseCode: z
    .string()
    .trim()
    .max(20, 'Course code cannot exceed 20 characters')
    .optional()
    .default(''),
  department: z
    .enum(DEPARTMENTS, {
      errorMap: () => ({ message: 'Invalid department' }),
    })
    .optional(),
  semester: z
    .number()
    .int('Semester must be an integer')
    .min(1, 'Semester must be between 1 and 8')
    .max(8, 'Semester must be between 1 and 8')
    .optional()
    .nullable(),
  condition: z.enum(['like new', 'good', 'fair'], {
    errorMap: () => ({ message: 'Condition must be like new, good, or fair' }),
  }),
  note: z
    .string()
    .trim()
    .max(500, 'Note cannot exceed 500 characters')
    .optional()
    .default(''),
};

const sellListingSchema = z
  .object({
    ...baseListingFields,
    listingType: z.literal('sell'),
    price: z
      .number({ required_error: 'Price is required' })
      .int('Price must be a whole number')
      .min(1, 'Price must be at least 1')
      .max(100000, 'Price cannot exceed 100,000'),
    swapFor: z.undefined().optional(),
  })
  .strict();

const freeListingSchema = z
  .object({
    ...baseListingFields,
    listingType: z.literal('free'),
    price: z
      .number()
      .int()
      .default(0)
      .refine((val) => val === 0, {
        message: 'Price must be 0 for free listings',
      }),
    swapFor: z.undefined().optional(),
  })
  .strict();

const swapListingSchema = z
  .object({
    ...baseListingFields,
    listingType: z.literal('swap'),
    price: z.number().optional().default(0).transform(() => 0),
    swapFor: z
      .string({ required_error: 'Swap for is required' })
      .trim()
      .min(1, 'Swap for must be at least 1 character')
      .max(150, 'Swap for cannot exceed 150 characters'),
  })
  .strict();

export const listingSchema = z.discriminatedUnion('listingType', [
  sellListingSchema,
  freeListingSchema,
  swapListingSchema,
]);

export const myListingsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
    status: z.enum(['available', 'reserved', 'sold', 'expired']).optional(),
  })
  .strict();

export const listingIdParamsSchema = z
  .object({
    id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id format'),
  })
  .strict();

export const imageIndexParamsSchema = z
  .object({
    id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id format'),
    index: z.coerce.number().int().min(0).max(3),
  })
  .strict();

