
import { Resend } from 'resend';
import { env } from '../config/env.js';

const resend = env.RESEND_API_KEY
  ? new Resend(env.RESEND_API_KEY)
  : null;

export const sendMail = async ({ to, subject, text }) => {
  if (!resend) {
    if (env.NODE_ENV === 'production') {
      throw new Error('SMTP service is not configured in production mode');
    }

    console.log('\n[MAILER DEV]');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${text}\n`);
    return;
  }

  const { data, error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    text,
  });

  if (error) {
    console.error('[MAILER] Resend delivery failed:', error.message);
    throw new Error('Email delivery failed');
  }

  return data;
};
