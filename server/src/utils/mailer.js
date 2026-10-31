import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

/**
 * Send an email.
 *
 * When EMAIL_HOST is not configured (development / test), the email is logged
 * to the console instead of being sent via SMTP. This allows developers to
 * follow verification and reset links without real email credentials.
 *
 * SECURITY: EMAIL_PASS and other credentials are never logged.
 *
 * @param {{ to: string, subject: string, text: string }} options
 */
export const sendMail = async ({ to, subject, text }) => {
  if (!env.EMAIL_HOST) {
    if (env.NODE_ENV === 'production') {
      throw new Error('SMTP service is not configured in production mode');
    }

    // Dev / test fallback — log to console, never attempt SMTP
    console.log(`\n[MAILER DEV] ─────────────────────────────────────`);
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${text}`);
    console.log(`──────────────────────────────────────────────────\n`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: env.EMAIL_PORT === 465,
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASS, // credential not logged
    },
  });

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    text,
  });
};

