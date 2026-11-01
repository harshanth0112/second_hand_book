import { Resend } from 'resend';
import { env } from '../config/env.js';

let resendInstance = null;
function getResend() {
  if (!resendInstance && env.RESEND_API_KEY) {
    resendInstance = new Resend(env.RESEND_API_KEY);
  }
  return resendInstance;
}

// Cache template slug/alias -> actual template id
const templateIdCache = new Map();

/**
 * Resolve template identifier (handles either raw UUID/template ID or slug/alias)
 */
async function resolveTemplateId(slugOrId) {
  if (!slugOrId) return null;

  // If already in cache, return resolved id
  if (templateIdCache.has(slugOrId)) {
    return templateIdCache.get(slugOrId);
  }

  // UUID format check: if it already looks like a UUID or template id (e.g., starts with d- or 36 char hex-dash)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
  if (isUuid) {
    templateIdCache.set(slugOrId, slugOrId);
    return slugOrId;
  }

  const resend = getResend();
  if (!resend) return slugOrId;

  try {
    // Attempt lookup via Resend templates API list
    const { data } = await resend.templates.list().catch(() => ({ data: null }));
    if (data && Array.isArray(data)) {
      const match = data.find((t) => t.alias === slugOrId || t.name === slugOrId || t.id === slugOrId);
      if (match && match.id) {
        templateIdCache.set(slugOrId, match.id);
        return match.id;
      }
    }
  } catch (err) {
    // Graceful fallback to provided slugOrId
  }

  // Fallback to slugOrId directly as Resend accepts template id or alias depending on deployment
  templateIdCache.set(slugOrId, slugOrId);
  return slugOrId;
}

/**
 * Send email using raw text/html or Resend template
 */
export const sendMail = async ({ to, subject, text, html, templateId, variables }) => {
  if (!to) return null;

  const resend = getResend();

  if (!resend) {
    if (env.NODE_ENV === 'production') {
      console.warn('[MAILER PROD WARNING] Resend API key is not configured. Email not dispatched to:', to);
      return null;
    }

    console.log('\n[MAILER DEV SIMULATION]');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject || '(Template subject)'}`);
    if (templateId) {
      console.log(`Template: ${templateId}`);
      console.log(`Variables:`, variables);
    }
    if (text) console.log(`Body:\n${text}\n`);
    return { id: 'dev-simulated-id' };
  }

  try {
    let payload = {
      from: env.EMAIL_FROM,
      to,
    };

    if (templateId) {
      const resolvedId = await resolveTemplateId(templateId);
      payload.template = {
        id: resolvedId,
        variables: variables || {},
      };
      if (subject) payload.subject = subject;
    } else {
      payload.subject = subject;
      if (text) payload.text = text;
      if (html) payload.html = html;
    }

    const { data, error } = await resend.emails.send(payload);

    if (error) {
      // If template send fails (e.g. invalid template ID or slug rejection), attempt fallback to text/subject if available
      if (templateId && (text || html || subject)) {
        console.warn(`[MAILER] Template send failed (${error.message}). Attempting fallback to direct email.`);
        const fallback = await resend.emails.send({
          from: env.EMAIL_FROM,
          to,
          subject: subject || 'CampusBooks Notification',
          text: text || JSON.stringify(variables, null, 2),
          html: html,
        });
        if (fallback.error) {
          console.error('[MAILER] Fallback email also failed:', fallback.error.message);
          return null;
        }
        return fallback.data;
      }

      console.error('[MAILER] Resend delivery failed:', error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error('[MAILER] Unexpected sendMail error:', err.message);
    return null;
  }
};
