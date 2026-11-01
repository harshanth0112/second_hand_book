import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../src/config/env.js';
import { sendMail, sendNotificationEmail, sendPasswordResetEmail } from '../src/utils/mailer.js';

describe('Sendliberty mailer', () => {
  let originalApiKey;

  beforeEach(() => {
    originalApiKey = env.SENDLIBERTY_API_KEY;
    env.SENDLIBERTY_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    env.SENDLIBERTY_API_KEY = originalApiKey;
    vi.unstubAllGlobals();
  });

  it('sends verification email using the documented template request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ messageId: 'mock-message-id' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await sendMail({
      to: 'student@example.edu',
      templateSlug: 'verify-email',
      data: { name: 'Student', link: 'https://campusbooks.example/verify/token' },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://sendliberty.com/api/send');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer test-api-key');
    expect(JSON.parse(options.body)).toEqual({
      to: 'student@example.edu',
      template: 'verify-email',
      data: { name: 'Student', link: 'https://campusbooks.example/verify/token' },
    });
  });

  it.each([
    ['welcome', { name: 'Student', product: 'CampusBooks' }],
  ])('sends %s with its dynamic variables', async (templateSlug, data) => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ messageId: 'mock-message-id' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await sendMail({ to: 'student@example.edu', templateSlug, data });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      to: 'student@example.edu',
      template: templateSlug,
      data,
    });
  });

  it('does not assume the provider password-reset template renders its code as a link', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(sendMail({
      to: 'student@example.edu',
      templateSlug: 'password-reset',
      data: { name: 'Student', code: 'https://campusbooks.example/reset?token=token' },
    })).rejects.toThrow(/template slug is not documented/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends a password-reset email with a clickable, escaped reset link', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ messageId: 'mock-message-id' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const link = 'https://campusbooks.example/reset-password?token=reset-token&source=email';

    await sendPasswordResetEmail({
      to: 'student@example.edu',
      name: 'Student <Test>',
      link,
    });

    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.subject).toBe('Reset your CampusBooks password');
    expect(payload.html).toContain(
      '<a href="https://campusbooks.example/reset-password?token=reset-token&amp;source=email">Reset your password</a>',
    );
    expect(payload.html).toContain('Hi Student &lt;Test&gt;');
    expect(payload.text).toContain(link);
    expect(payload.template).toBeUndefined();
  });

  it('uses the shared notification template and all dynamic values', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ messageId: 'mock-message-id' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await sendNotificationEmail({
      to: 'student@example.edu',
      name: 'Student',
      subject: 'New message',
      message: 'A seller sent you a message.',
      link: 'https://campusbooks.example/chat/123',
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      to: 'student@example.edu',
      template: 'campusbooks-notification',
      data: {
        name: 'Student',
        subject: 'New message',
        message: 'A seller sent you a message.',
        link: 'https://campusbooks.example/chat/123',
      },
    });
  });

  it('rejects missing required template variables without making a request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(sendMail({
      to: 'student@example.edu',
      templateSlug: 'verify-email',
      data: { name: 'Student' },
    })).rejects.toThrow(/missing required variables: link/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([400, 401, 403, 404, 429, 500])('surfaces provider HTTP %s as a failure', async (status) => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status,
      headers: { get: (name) => name === 'retry-after' && status === 429 ? '2' : null },
      json: async () => ({ error: 'provider detail is not logged' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(sendMail({
      to: 'student@example.edu',
      templateSlug: 'welcome',
      data: { name: 'Student', product: 'CampusBooks' },
    })).rejects.toMatchObject({ statusCode: status });
  });

  it('does not simulate successful delivery when the API key is missing', async () => {
    env.SENDLIBERTY_API_KEY = '';

    await expect(sendMail({
      to: 'student@example.edu',
      templateSlug: 'welcome',
      data: { name: 'Student', product: 'CampusBooks' },
    })).rejects.toThrow(/SENDLIBERTY_API_KEY is not configured/);
  });

  it('surfaces network failures without exposing request content', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('private network detail'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(sendMail({
      to: 'student@example.edu',
      templateSlug: 'welcome',
      data: { name: 'Student', product: 'CampusBooks' },
    })).rejects.toThrow('Sendliberty network request failed (Error)');
  });
});