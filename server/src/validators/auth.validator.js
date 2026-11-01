import { z } from 'zod';
import { DEPARTMENTS } from '../models/User.js';

// ── Shared password rule ──────────────────────────────────────────────────────
// 8-72 chars, at least one letter AND one digit
const passwordRule = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password cannot exceed 72 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one digit');

// ── Step 1 schemas (unchanged) ────────────────────────────────────────────────

export const registerSchema = z
  .object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(60, 'Name cannot exceed 60 characters'),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Please enter a valid email address'),
    password: passwordRule,
    college: z.string().trim().optional(),
    department: z.string().trim().optional(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Please enter a valid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(1, 'Password is required'),
  })
  .strict();

// ── Step 2 schemas ────────────────────────────────────────────────────────────

export const forgotPasswordSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Please enter a valid email address'),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z
      .string({ required_error: 'Reset token is required' })
      .min(1, 'Reset token is required'),
    password: passwordRule,
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: 'Current password is required' })
      .min(1, 'Current password is required'),
    newPassword: passwordRule,
  })
  .strict();

// ── Profile update schema ─────────────────────────────────────────────────────

export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(60, 'Name cannot exceed 60 characters')
      .optional(),
    department: z
      .enum(DEPARTMENTS, {
        errorMap: () => ({ message: 'Invalid department value' }),
      })
      .optional(),
    semester: z
      .number()
      .int('Semester must be an integer')
      .min(1, 'Semester must be between 1 and 8')
      .max(8, 'Semester must be between 1 and 8')
      .optional()
      .nullable(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Please enter a valid email address')
      .optional(),
    avatar: z.string().trim().optional(),
    emailNotifications: z.boolean().optional(),
  })
  .strict();
