import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_NAME: z.string().default('token'),
  // Email configuration (optional; falls back to console logging if host is empty)
  EMAIL_HOST: z.string().optional().default(''),
  EMAIL_PORT: z.string().optional().default('587').transform((val) => parseInt(val, 10)),
  EMAIL_USER: z.string().optional().default(''),
  EMAIL_PASS: z.string().optional().default(''),
  EMAIL_FROM: z.string().optional().default('noreply@bookexchange.campus'),
  // Google OAuth configuration (optional in dev/test)
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_CALLBACK_URL: z.string().optional().default('http://localhost:5000/api/auth/google/callback'),
  // Cloudinary image hosting (optional in test/dev)
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
  // Admin seed
  ADMIN_EMAIL: z.string().optional().default('admin@college.edu'),
  ADMIN_PASSWORD: z.string().optional().default('Admin1234!'),
  // Background jobs
  JOBS_ENABLED: z.string().optional().default('false').transform((val) => val === 'true'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables:', parsedEnv.error.format());
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
}

export const env = parsedEnv.success
  ? parsedEnv.data
  : {
      PORT: 5000,
      NODE_ENV: 'test',
      CLIENT_URL: 'http://localhost:5173',
      MONGODB_URI: 'mongodb://localhost:27017/test',
      JWT_SECRET: 'test_super_secret_jwt_key_minimum_32_characters_long_123',
      JWT_EXPIRES_IN: '7d',
      COOKIE_NAME: 'token',
      EMAIL_HOST: '',
      EMAIL_PORT: 587,
      EMAIL_USER: '',
      EMAIL_PASS: '',
      EMAIL_FROM: 'noreply@bookexchange.campus',
      GOOGLE_CLIENT_ID: '',
      GOOGLE_CLIENT_SECRET: '',
      GOOGLE_CALLBACK_URL: 'http://localhost:5000/api/auth/google/callback',
      CLOUDINARY_CLOUD_NAME: '',
      CLOUDINARY_API_KEY: '',
      CLOUDINARY_API_SECRET: '',
      ADMIN_EMAIL: 'admin@college.edu',
      ADMIN_PASSWORD: 'Admin1234!',
      JOBS_ENABLED: false,
    };
