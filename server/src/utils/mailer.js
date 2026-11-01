import { env } from '../config/env.js';

const SENDLIBERTY_ENDPOINT = 'https://sendliberty.com/api/send';
const REQUEST_TIMEOUT_MS = 10_000;

// Required variables per built-in template slug
const TEMPLATE_REQUIRED_VARS = {
  'verify-email': ['name', 'link'],
  'welcome': ['name', 'product'],
  'otp': ['name', 'code'],
  'account-suspended': ['name', 'reason', 'support_url'],
  'campusbooks-notification': ['name', 'subject', 'message', 'link'],
};

/**
 * Validate that all required variables for a template slug are present and non-empty.
 * Returns an array of missing variable names (empty means valid).
 */
function getMissingVars(templateSlug, data) {
  const required = TEMPLATE_REQUIRED_VARS[templateSlug];
  if (!required) return [];
  return required.filter((key) => (
    !data || typeof data[key] !== 'string' || data[key].trim() === ''
  ));
}

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));

const textAsHtml = (text) => (
  `<div style="font-family:Arial,sans-serif;white-space:pre-wrap">${escapeHtml(text)}</div>`
);

export class MailerError extends Error {
  constructor(message, { statusCode, retryAfter } = {}) {
    super(message);
    this.name = 'MailerError';
    this.statusCode = statusCode;
    this.retryAfter = retryAfter;
  }
}

export const sendMail = async ({ to, templateSlug, data, subject, html, text }) => {
  if (!to || typeof to !== 'string') {
    throw new MailerError('Sendliberty recipient is required');
  }

  if (templateSlug) {
    if (!Object.hasOwn(TEMPLATE_REQUIRED_VARS, templateSlug)) {
      throw new MailerError(`Sendliberty template slug is not documented: "${templateSlug}"`);
    }
    const missing = getMissingVars(templateSlug, data);
    if (missing.length > 0) {
      throw new MailerError(
        `Sendliberty template "${templateSlug}" is missing required variables: ${missing.join(', ')}`,
      );
    }
  } else if (!subject || (!html && !text)) {
    throw new MailerError('Sendliberty raw email requires subject and html or text');
  }

  const apiKey = env.SENDLIBERTY_API_KEY;
  if (!apiKey) {
    throw new MailerError('SENDLIBERTY_API_KEY is not configured; email was not sent');
  }

  const payload = { to };

  if (templateSlug) {
    payload.template = templateSlug;
    payload.data = data || {};
  } else {
    payload.subject = subject;
    payload.html = html || textAsHtml(text);
    if (text) payload.text = text;
  }

  try {
    const response = await fetch(SENDLIBERTY_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok || body?.success === false || body?.error) {
      const statusCode = response.status;
      const retryAfter = response.headers?.get?.('retry-after') || undefined;
      const issue = statusCode === 429
        ? `Sendliberty rate limit reached${retryAfter ? `; retry after ${retryAfter} seconds` : ''}`
        : statusCode === 401
          ? 'Sendliberty authentication failed; check SENDLIBERTY_API_KEY'
          : statusCode === 403
            ? 'Sendliberty rejected the sender account or API key permissions'
            : statusCode === 400
              ? `Sendliberty rejected the request; check the template slug and required variables${templateSlug ? ` for "${templateSlug}"` : ''}`
              : `Sendliberty rejected the request with HTTP ${statusCode}`;

      throw new MailerError(issue, { statusCode, retryAfter });
    }

    return body;
  } catch (err) {
    if (err instanceof MailerError) throw err;
    throw new MailerError(`Sendliberty network request failed (${err.name || 'network error'})`);
  }
};

export const sendPasswordResetEmail = ({ to, name, link }) => {
  if (!link || typeof link !== 'string') {
    throw new MailerError('Password reset email requires a reset link');
  }

  const greetingName = name || 'Student';
  const safeName = escapeHtml(greetingName);
  const safeLink = escapeHtml(link);
  const text = `Hi ${greetingName},\n\nUse this link to reset your CampusBooks password. It expires in one hour:\n${link}\n\nIf you did not request a password reset, you can ignore this email.`;
  const html = `<p>Hi ${safeName},</p><p>Use the link below to reset your CampusBooks password. It expires in one hour.</p><p><a href="${safeLink}">Reset your password</a></p><p>If you did not request a password reset, you can ignore this email.</p>`;

  return sendMail({
    to,
    subject: 'Reset your CampusBooks password',
    html,
    text,
  });
};

export const sendNotificationEmail = ({ to, name, subject, message, link }) => sendMail({
  to,
  templateSlug: 'campusbooks-notification',
  data: {
    name: name || 'Student',
    subject,
    message,
    link,
  },
});
