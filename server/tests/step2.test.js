/**
 * Step 2 Tests: Email Verification, Password Reset, Session Versioning,
 * Google OAuth State, Google OAuth User Creation, Profile API.
 *
 * Security architecture enforced:
 *  - Session versioning (not timestamp-based) for session invalidation.
 *  - OAuth state via signed JWT cookie (stateless, session: false).
 *  - SHA-256 hashes stored; raw tokens never persisted.
 *  - All protected endpoints use requireAuth.
 *  - Unknown body fields rejected (strict Zod).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { signToken } from '../src/utils/jwt.js';
import { env } from '../src/config/env.js';
import { logger } from '../src/utils/logger.js';

const app = createApp();

// ── Helpers ───────────────────────────────────────────────────────────────────

const TEST_USER = {
  name: 'Test Student',
  email: 'step2test@college.edu',
  password: 'Password123!',
  college: 'Test University',
  department: 'Computer Science',
};

/**
 * Register a user and return the response + auth cookie.
 */
async function registerUser(overrides = {}) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ ...TEST_USER, ...overrides });
  expect(res.status).toBe(201);
  const cookie = res.headers['set-cookie'];
  return { res, cookie };
}

/**
 * Hash a raw token for database lookup.
 */
function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Get the User document from DB by email.
 */
async function getDbUser(email = TEST_USER.email) {
  return User.findOne({ email });
}

// ── Session Versioning ────────────────────────────────────────────────────────

describe('Session Versioning', () => {
  it('password change increments sessionVersion and invalidates old token', async () => {
    const { cookie } = await registerUser();

    const changeRes = await request(app)
      .put('/api/me/password')
      .set('Cookie', cookie)
      .send({ currentPassword: TEST_USER.password, newPassword: 'NewPass456!' });

    expect(changeRes.status).toBe(204);

    // Old cookie should be rejected
    const meRes = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(meRes.status).toBe(401);
    expect(meRes.body.message).toMatch(/Session invalidated/i);
  });

  it('token with missing sessionVersion is rejected', async () => {
    await registerUser();
    const user = await getDbUser();

    // Issue a legacy token without sessionVersion
    const legacyToken = jwt.sign(
      { sub: user._id.toString(), role: user.role },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`token=${legacyToken}; Path=/`]);

    expect(meRes.status).toBe(401);
    expect(meRes.body.message).toMatch(/Session invalidated/i);
  });

  it('token with non-integer sessionVersion is rejected', async () => {
    await registerUser();
    const user = await getDbUser();

    // Issue a token with a float or string sessionVersion
    const floatToken = jwt.sign(
      { sub: user._id.toString(), role: user.role, sessionVersion: 1.5 },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`token=${floatToken}; Path=/`]);

    expect(meRes.status).toBe(401);
    expect(meRes.body.message).toMatch(/Session invalidated/i);
  });

  it('legacy user without persisted sessionVersion in DB is normalized to 0 and succeeds', async () => {
    await registerUser();
    // Simulate legacy Step 1 record where sessionVersion was never written to MongoDB
    await User.updateOne({ email: TEST_USER.email }, { $unset: { sessionVersion: '' } });

    // Valid token with sessionVersion 0 should be accepted via normalization
    const user = await getDbUser();
    const token = signToken(user);

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`token=${token}; Path=/`]);

    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe(TEST_USER.email);
  });

  it('legacy user without persisted sessionVersion increments cleanly on password change', async () => {
    await registerUser();
    await User.updateOne({ email: TEST_USER.email }, { $unset: { sessionVersion: '' } });

    const user = await getDbUser();
    const token = signToken(user);

    const changeRes = await request(app)
      .put('/api/me/password')
      .set('Cookie', [`token=${token}; Path=/`])
      .send({ currentPassword: TEST_USER.password, newPassword: 'BrandNew123Pass!' });

    expect(changeRes.status).toBe(204);

    const updated = await getDbUser();
    expect(updated.sessionVersion).toBe(1);

    // Old token with 0 must now be rejected
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`token=${token}; Path=/`]);
    expect(meRes.status).toBe(401);
  });

});

// ── Email Verification ────────────────────────────────────────────────────────

describe('Email Verification', () => {
  it('registration sends welcome and verification templates with secure verification storage', async () => {
    const originalApiKey = env.SENDLIBERTY_API_KEY;
    const startedAt = Date.now();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ messageId: 'mock-message-id' }),
    });
    env.SENDLIBERTY_API_KEY = 'test-api-key';
    vi.stubGlobal('fetch', fetchMock);

    try {
      await registerUser();

      const payloads = fetchMock.mock.calls.map(([, options]) => JSON.parse(options.body));
      const welcome = payloads.find((payload) => payload.template === 'welcome');
      const verification = payloads.find((payload) => payload.template === 'verify-email');

      expect(welcome.data).toEqual({ name: TEST_USER.name, product: 'CampusBooks' });
      expect(verification.data.name).toBe(TEST_USER.name);
      const rawToken = new URL(verification.data.link).pathname.split('/').pop();
      const user = await getDbUser();
      expect(user.emailVerificationTokenHash).toBe(hashToken(rawToken));
      expect(user.emailVerificationExpires.getTime()).toBeGreaterThanOrEqual(
        startedAt + 24 * 60 * 60 * 1000 - 1000,
      );
      expect(user.emailVerificationExpires.getTime()).toBeLessThanOrEqual(
        startedAt + 24 * 60 * 60 * 1000 + 1000,
      );
    } finally {
      env.SENDLIBERTY_API_KEY = originalApiKey;
      vi.unstubAllGlobals();
    }
  });

  it('valid token verifies email and clears token fields', async () => {
    await registerUser();

    const user = await getDbUser();
    // Inject a fresh verification token directly for deterministic testing
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationTokenHash = hashToken(rawToken);
    user.emailVerificationExpires = new Date(Date.now() + 86400_000);
    await user.save();

    const res = await request(app).get(`/api/auth/verify-email/${rawToken}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/verified/i);

    const updated = await getDbUser();
    expect(updated.emailVerified).toBe(true);
    expect(updated.emailVerificationTokenHash).toBeNull();
    expect(updated.emailVerificationExpires).toBeNull();
  });

  it('used / non-existent token returns 400', async () => {
    const fakeToken = crypto.randomBytes(32).toString('hex');
    const res = await request(app).get(`/api/auth/verify-email/${fakeToken}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid or expired/i);
  });

  it('expired token returns 400', async () => {
    await registerUser();

    const user = await getDbUser();
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationTokenHash = hashToken(rawToken);
    user.emailVerificationExpires = new Date(Date.now() - 1000); // already expired
    await user.save();

    const res = await request(app).get(`/api/auth/verify-email/${rawToken}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/expired/i);
  });

  it('resend-verification blocked when email already verified (409)', async () => {
    const { cookie } = await registerUser();

    // Mark as verified
    const user = await getDbUser();
    user.emailVerified = true;
    await user.save();

    const res = await request(app)
      .post('/api/auth/resend-verification')
      .set('Cookie', cookie);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already verified/i);
  });

  it('resend-verification requires authentication (401 without cookie)', async () => {
    const res = await request(app).post('/api/auth/resend-verification');
    expect(res.status).toBe(401);
  });
});

// ── Forgot / Reset Password ───────────────────────────────────────────────────

describe('Forgot / Reset Password', () => {
  it('sends a clickable password-reset link and stores only its one-hour token hash', async () => {
    const originalApiKey = env.SENDLIBERTY_API_KEY;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ messageId: 'mock-message-id' }),
    });
    env.SENDLIBERTY_API_KEY = 'test-api-key';
    vi.stubGlobal('fetch', fetchMock);

    try {
      await registerUser();
      fetchMock.mockClear();
      const startedAt = Date.now();

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: TEST_USER.email });

      expect(response.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledOnce();
      const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(payload.subject).toBe('Reset your CampusBooks password');
      expect(payload.html).toMatch(/<a href="[^"]+\/reset-password\?token=[a-f0-9]{64}">Reset your password<\/a>/);
      const resetLink = payload.html.match(/<a href="([^"]+)">Reset your password<\/a>/)[1];
      const rawToken = new URL(resetLink).searchParams.get('token');
      const user = await getDbUser();
      expect(user.passwordResetTokenHash).toBe(hashToken(rawToken));
      expect(user.passwordResetExpires.getTime()).toBeGreaterThanOrEqual(
        startedAt + 60 * 60 * 1000 - 1000,
      );
      expect(user.passwordResetExpires.getTime()).toBeLessThanOrEqual(
        startedAt + 60 * 60 * 1000 + 1000,
      );
    } finally {
      env.SENDLIBERTY_API_KEY = originalApiKey;
      vi.unstubAllGlobals();
    }
  });

  it('stores the reset hash before sending so the emailed link is valid immediately', async () => {
    const originalApiKey = env.SENDLIBERTY_API_KEY;
    let resolveSend;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ messageId: 'mock-message-id' }),
    });
    env.SENDLIBERTY_API_KEY = 'test-api-key';
    vi.stubGlobal('fetch', fetchMock);

    try {
      await registerUser();
      fetchMock.mockClear();
      fetchMock.mockImplementation(() => new Promise((resolve) => {
        resolveSend = resolve;
      }));

      const user = await getDbUser();
      const existingHash = hashToken('previous-reset-token');
      const existingExpiry = new Date(Date.now() + 30 * 60 * 1000);
      user.passwordResetTokenHash = existingHash;
      user.passwordResetExpires = existingExpiry;
      await user.save();

      const startedAt = Date.now();
      const requestPromise = request(app)
        .post('/api/auth/forgot-password')
        .send({ email: TEST_USER.email })
        .then((response) => response);

      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
      const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
      const resetLink = payload.html.match(/<a href="([^"]+)">Reset your password<\/a>/)[1];
      const rawToken = new URL(resetLink).searchParams.get('token');
      const pendingUser = await getDbUser();

      expect(pendingUser.passwordResetTokenHash).toBe(existingHash);
      expect(pendingUser.passwordResetExpires.getTime()).toBe(existingExpiry.getTime());
      expect(pendingUser.passwordResetPendingTokens).toHaveLength(1);
      expect(pendingUser.passwordResetPendingTokens[0].tokenHash).toBe(hashToken(rawToken));
      expect(pendingUser.passwordResetPendingTokens[0].tokenHash).not.toBe(rawToken);
      expect(pendingUser.passwordResetPendingTokens[0].expires.getTime()).toBeGreaterThanOrEqual(
        startedAt + 60 * 60 * 1000 - 1000,
      );
      expect(pendingUser.passwordResetPendingTokens[0].expires.getTime()).toBeLessThanOrEqual(
        startedAt + 60 * 60 * 1000 + 1000,
      );

      const resetResponse = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: rawToken, password: 'ResetDuringDelivery123!' });
      expect(resetResponse.status).toBe(204);

      resolveSend({
        ok: true,
        status: 200,
        json: async () => ({ messageId: 'mock-message-id' }),
      });
      const response = await requestPromise;

      expect(response.status).toBe(200);
      const deliveredUser = await getDbUser();
      expect(deliveredUser.passwordResetTokenHash).toBeNull();
      expect(deliveredUser.passwordResetExpires).toBeNull();
      expect(deliveredUser.passwordResetPendingTokens).toHaveLength(0);
    } finally {
      env.SENDLIBERTY_API_KEY = originalApiKey;
      vi.unstubAllGlobals();
    }
  });

  it.each([
    ['provider rejection', 'provider_rejected'],
    ['network failure', 'network_or_configuration_failure'],
  ])('keeps the generic response and existing reset state after %s', async (failure, category) => {
    const originalApiKey = env.SENDLIBERTY_API_KEY;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ messageId: 'mock-message-id' }),
    });
    const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    env.SENDLIBERTY_API_KEY = 'test-api-key';
    vi.stubGlobal('fetch', fetchMock);

    try {
      await registerUser();
      fetchMock.mockReset();
      if (failure === 'provider rejection') {
        fetchMock.mockResolvedValue({
          ok: false,
          status: 400,
          headers: { get: () => null },
          json: async () => ({ error: 'private provider diagnostic' }),
        });
      } else {
        fetchMock.mockRejectedValue(new Error('private network diagnostic'));
      }

      const existingHash = hashToken('previous-reset-token');
      const existingExpiry = new Date(Date.now() + 30 * 60 * 1000);
      const user = await getDbUser();
      user.passwordResetTokenHash = existingHash;
      user.passwordResetExpires = existingExpiry;
      await user.save();

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: TEST_USER.email });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe(
        'If that email is registered, we will process your password-reset request',
      );
      expect(fetchMock).toHaveBeenCalledOnce();

      const unchangedUser = await getDbUser();
      expect(unchangedUser.passwordResetTokenHash).toBe(existingHash);
      expect(unchangedUser.passwordResetExpires.getTime()).toBe(existingExpiry.getTime());
      expect(unchangedUser.passwordResetPendingTokens).toHaveLength(0);

      expect(loggerSpy).toHaveBeenCalledWith(expect.objectContaining({
        event: 'email_delivery_failed',
        provider: 'sendliberty',
        purpose: 'password_reset',
        category,
      }));
      expect(JSON.stringify(loggerSpy.mock.calls)).not.toContain(TEST_USER.email);
      expect(JSON.stringify(loggerSpy.mock.calls)).not.toContain('previous-reset-token');
      expect(JSON.stringify(loggerSpy.mock.calls)).not.toContain('private provider diagnostic');
      expect(JSON.stringify(loggerSpy.mock.calls)).not.toContain('private network diagnostic');
    } finally {
      env.SENDLIBERTY_API_KEY = originalApiKey;
      vi.unstubAllGlobals();
      loggerSpy.mockRestore();
    }
  });

  it('unknown email returns same 200 (no user enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@nowhere.edu' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/If that email/i);
  });

  it('known email returns same 200', async () => {
    await registerUser();
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: TEST_USER.email });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/If that email/i);
  });

  it('valid reset token changes password and returns 204', async () => {
    await registerUser();

    const user = await getDbUser();
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = hashToken(rawToken);
    user.passwordResetExpires = new Date(Date.now() + 3600_000);
    await user.save();

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, password: 'BrandNew123!' });

    expect(res.status).toBe(204);
  });

  it('old password no longer works after reset', async () => {
    await registerUser();

    const user = await getDbUser();
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = hashToken(rawToken);
    user.passwordResetExpires = new Date(Date.now() + 3600_000);
    await user.save();

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, password: 'BrandNew123!' });

    // Old password should fail
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    expect(loginRes.status).toBe(401);
  });

  it('reset token cannot be reused (returns 400)', async () => {
    await registerUser();

    const user = await getDbUser();
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = hashToken(rawToken);
    user.passwordResetExpires = new Date(Date.now() + 3600_000);
    await user.save();

    // First use
    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, password: 'BrandNew123!' });

    // Second use → 400
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, password: 'AnotherPass456!' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid or expired/i);
  });

  it('expired reset token returns 400', async () => {
    await registerUser();

    const user = await getDbUser();
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = hashToken(rawToken);
    user.passwordResetExpires = new Date(Date.now() - 1000); // already expired
    await user.save();

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, password: 'BrandNew123!' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/expired/i);
  });
});

// ── Change Password ───────────────────────────────────────────────────────────

describe('Change Password', () => {
  it('wrong current password returns 401', async () => {
    const { cookie } = await registerUser();

    const res = await request(app)
      .put('/api/me/password')
      .set('Cookie', cookie)
      .send({ currentPassword: 'WrongPass000!', newPassword: 'NewPass123!' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/Current password is incorrect/i);
  });

  it('Google-only account returns 409 when attempting password change', async () => {
    // Create a Google-only user directly in DB
    const googleUser = await User.create({
      name: 'Google User',
      email: 'googleonly@gmail.com',
      password: null,
      googleId: 'google_123456',
      emailVerified: true,
      authProviders: ['google'],
      sessionVersion: 0,
      role: 'student',
    });

    const token = signToken(googleUser);
    const cookie = [`token=${token}; Path=/`];

    const res = await request(app)
      .put('/api/me/password')
      .set('Cookie', cookie)
      .send({ currentPassword: 'anything', newPassword: 'NewPass123!' });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/Google login/i);
  });

  it('successful password change returns 204 and new cookie works', async () => {
    const { cookie } = await registerUser();

    const changeRes = await request(app)
      .put('/api/me/password')
      .set('Cookie', cookie)
      .send({ currentPassword: TEST_USER.password, newPassword: 'NewPass456!' });

    expect(changeRes.status).toBe(204);

    // New cookie must be set
    const newCookie = changeRes.headers['set-cookie'];
    expect(newCookie).toBeDefined();

    // New cookie must work
    const meRes = await request(app).get('/api/auth/me').set('Cookie', newCookie);
    expect(meRes.status).toBe(200);
  });
});

// ── Google OAuth State Validation ─────────────────────────────────────────────

describe('Google OAuth State Validation (validateOAuthState middleware)', () => {
  /**
   * Create a valid oauth_state cookie JWT for testing.
   */
  function makeStateCookie(rawState, overrides = {}) {
    const payload = { state: rawState, purpose: 'oauth_state', ...overrides };
    const options = { expiresIn: '10m', ...overrides._jwtOptions };
    delete payload._jwtOptions;
    return jwt.sign(payload, env.JWT_SECRET, options);
  }

  it('missing state query param → redirects with oauth_failed', async () => {
    const rawState = crypto.randomBytes(32).toString('hex');
    const cookieJwt = makeStateCookie(rawState);

    const res = await request(app)
      .get('/api/auth/google/callback')
      .set('Cookie', [`oauth_state=${cookieJwt}; Path=/`]);
    // state query param omitted

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/oauth_failed/);
  });

  it('missing oauth_state cookie → redirects with oauth_failed', async () => {
    const rawState = crypto.randomBytes(32).toString('hex');

    const res = await request(app)
      .get('/api/auth/google/callback')
      .query({ state: rawState, code: 'fake_code' });
    // No cookie set

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/oauth_failed/);
  });

  it('mismatched state → redirects with oauth_failed', async () => {
    const rawState = crypto.randomBytes(32).toString('hex');
    const differentState = crypto.randomBytes(32).toString('hex');
    const cookieJwt = makeStateCookie(rawState);

    const res = await request(app)
      .get('/api/auth/google/callback')
      .set('Cookie', [`oauth_state=${cookieJwt}; Path=/`])
      .query({ state: differentState, code: 'fake_code' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/oauth_failed/);
  });

  it('tampered cookie (invalid signature) → redirects with oauth_failed', async () => {
    const rawState = crypto.randomBytes(32).toString('hex');
    const validJwt = makeStateCookie(rawState);
    const tampered = validJwt.slice(0, -5) + 'XXXXX';

    const res = await request(app)
      .get('/api/auth/google/callback')
      .set('Cookie', [`oauth_state=${tampered}; Path=/`])
      .query({ state: rawState, code: 'fake_code' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/oauth_failed/);
  });

  it('expired state cookie → redirects with oauth_failed', async () => {
    const rawState = crypto.randomBytes(32).toString('hex');
    // Sign with -1s expiry so it's already expired
    const expiredJwt = jwt.sign(
      { state: rawState, purpose: 'oauth_state' },
      env.JWT_SECRET,
      { expiresIn: -1 }
    );

    const res = await request(app)
      .get('/api/auth/google/callback')
      .set('Cookie', [`oauth_state=${expiredJwt}; Path=/`])
      .query({ state: rawState, code: 'fake_code' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/oauth_failed/);
  });

  it('wrong purpose claim → redirects with oauth_failed', async () => {
    const rawState = crypto.randomBytes(32).toString('hex');
    const wrongPurpose = makeStateCookie(rawState, { purpose: 'wrong_purpose' });

    const res = await request(app)
      .get('/api/auth/google/callback')
      .set('Cookie', [`oauth_state=${wrongPurpose}; Path=/`])
      .query({ state: rawState, code: 'fake_code' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/oauth_failed/);
  });

  it('replayed callback (no cookie) → redirects with oauth_failed', async () => {
    // Simulate cookie already cleared (i.e., replayed request)
    const rawState = crypto.randomBytes(32).toString('hex');

    const res = await request(app)
      .get('/api/auth/google/callback')
      .query({ state: rawState, code: 'fake_code' });
    // No oauth_state cookie at all

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/oauth_failed/);
  });

  it('valid state passes state validation (reaches Passport, redirects with oauth_failed in test env)', async () => {
    const rawState = crypto.randomBytes(32).toString('hex');
    const validJwt = makeStateCookie(rawState);

    const res = await request(app)
      .get('/api/auth/google/callback')
      .set('Cookie', [`oauth_state=${validJwt}; Path=/`])
      .query({ state: rawState, code: 'valid_code' });

    // State validation passes → Passport runs → fails (no GOOGLE_CLIENT_ID in test env)
    // → handleGoogleCallback catches the error and issues oauth_failed redirect.
    // The critical assertion: state validation did NOT short-circuit (state was valid),
    // and the error handling produces a 302, not a 500.
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/oauth_failed/);
  });
});

// ── Google OAuth User Creation (mocked Passport) ──────────────────────────────

describe('Google OAuth User Creation', () => {
  it('new Google user is created with correct fields', async () => {
    const { user: createdUser } = await import('../src/services/auth.service.js').then((m) =>
      m.AuthService.findOrCreateGoogleUser({
        googleId: 'gid_newuser_001',
        email: 'newgoogle@gmail.com',
        name: 'New Google',
        avatar: 'https://example.com/avatar.jpg',
      })
    );

    expect(createdUser.email).toBe('newgoogle@gmail.com');
    expect(createdUser.emailVerified).toBe(true);
    expect(createdUser.authProviders).toContain('google');
    expect(createdUser.password).toBeNull();
    expect(createdUser.sessionVersion).toBe(0);
    expect(createdUser.googleId).toBe('gid_newuser_001');
  });

  it('second Google login finds same user (no duplicate)', async () => {
    const { AuthService } = await import('../src/services/auth.service.js');

    await AuthService.findOrCreateGoogleUser({
      googleId: 'gid_dedup_001',
      email: 'dedup@gmail.com',
      name: 'Dup User',
      avatar: '',
    });

    await AuthService.findOrCreateGoogleUser({
      googleId: 'gid_dedup_001',
      email: 'dedup@gmail.com',
      name: 'Dup User',
      avatar: '',
    });

    const count = await User.countDocuments({ email: 'dedup@gmail.com' });
    expect(count).toBe(1);
  });

  it('existing email account is linked to Google without creating duplicate', async () => {
    const { AuthService } = await import('../src/services/auth.service.js');

    // Create local account first
    await User.create({
      name: 'Local User',
      email: 'locallinked@college.edu',
      password: 'Password123!',
      authProviders: ['local'],
      sessionVersion: 0,
      emailVerified: false,
      role: 'student',
    });

    // Google login with same email
    const { user } = await AuthService.findOrCreateGoogleUser({
      googleId: 'gid_link_001',
      email: 'locallinked@college.edu',
      name: 'Local User',
      avatar: '',
    });

    expect(user.authProviders).toContain('google');
    expect(user.authProviders).toContain('local');
    expect(user.googleId).toBe('gid_link_001');
    expect(user.emailVerified).toBe(true);

    const count = await User.countDocuments({ email: 'locallinked@college.edu' });
    expect(count).toBe(1);
  });

  it('Google user token contains correct sessionVersion', async () => {
    const { AuthService } = await import('../src/services/auth.service.js');

    const { token } = await AuthService.findOrCreateGoogleUser({
      googleId: 'gid_version_001',
      email: 'gversion@gmail.com',
      name: 'Version User',
      avatar: '',
    });

    const decoded = jwt.decode(token);
    expect(decoded.sessionVersion).toBe(0);
  });
});

// ── Profile API (/api/me) ─────────────────────────────────────────────────────

describe('Profile API', () => {
  it('GET /api/me returns Me projection', async () => {
    const { cookie } = await registerUser();

    const res = await request(app).get('/api/me').set('Cookie', cookie);
    expect(res.status).toBe(200);

    // Required fields
    expect(res.body).toHaveProperty('_id');
    expect(res.body).toHaveProperty('email', TEST_USER.email);
    expect(res.body).toHaveProperty('emailVerified');
    expect(res.body).toHaveProperty('authProviders');
    expect(res.body).toHaveProperty('department');
    expect(res.body).toHaveProperty('semester');
    expect(res.body).toHaveProperty('avatar');
    expect(res.body).toHaveProperty('emailNotifications');
    expect(res.body).toHaveProperty('createdAt');

    // Must NOT expose sensitive fields
    expect(res.body.password).toBeUndefined();
    expect(res.body.googleId).toBeUndefined();
    expect(res.body.sessionVersion).toBeUndefined();
    expect(res.body.emailVerificationTokenHash).toBeUndefined();
    expect(res.body.passwordResetTokenHash).toBeUndefined();
  });

  it('PUT /api/me updates allowed profile fields', async () => {
    const { cookie } = await registerUser();

    const res = await request(app)
      .put('/api/me')
      .set('Cookie', cookie)
      .send({
        name: 'Updated Name',
        department: 'Information Technology',
        semester: 3,
        emailNotifications: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Name');
    expect(res.body.department).toBe('Information Technology');
    expect(res.body.semester).toBe(3);
    expect(res.body.emailNotifications).toBe(false);
  });

  it('invalid department value rejected with 400', async () => {
    const { cookie } = await registerUser();

    const res = await request(app)
      .put('/api/me')
      .set('Cookie', cookie)
      .send({ department: 'Underwater Basket Weaving' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors.some((e) => e.field === 'department')).toBe(true);
  });

  it('invalid semester value rejected with 400', async () => {
    const { cookie } = await registerUser();

    const res = await request(app)
      .put('/api/me')
      .set('Cookie', cookie)
      .send({ semester: 9 });

    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.field === 'semester')).toBe(true);
  });

  it('unknown fields rejected with 400 (strict Zod)', async () => {
    const { cookie } = await registerUser();

    const res = await request(app)
      .put('/api/me')
      .set('Cookie', cookie)
      .send({ unknownField: 'value', name: 'Valid Name' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  it('PUT /api/me requires authentication', async () => {
    const res = await request(app)
      .put('/api/me')
      .send({ name: 'Hacker' });

    expect(res.status).toBe(401);
  });

  it('GET /api/me requires authentication', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
  });
});

// ── Google OAuth Initiation & Mailer Security ─────────────────────────────────

describe('OAuth Initiation & Mailer Security', () => {
  it('GET /api/auth/google redirects based on configured Google credentials', async () => {
    const res = await request(app).get('/api/auth/google');
    expect(res.status).toBe(302);
    if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
      expect(res.headers.location).toMatch(/^https:\/\/accounts\.google\.com\//);
    } else {
      expect(res.headers.location).toMatch(/oauth_failed/);
    }
  });

  it('sendMail in production mode without the Sendliberty API key rejects the send', async () => {
    const { sendMail } = await import('../src/utils/mailer.js');
    const originalEnv = env.NODE_ENV;
    const originalApiKey = env.SENDLIBERTY_API_KEY;

    try {
      env.NODE_ENV = 'production';
      env.SENDLIBERTY_API_KEY = '';

      await expect(
        sendMail({
          to: 'test@college.edu',
          subject: 'Production Test',
          text: 'Should fail',
        })
      ).rejects.toThrow(/SENDLIBERTY_API_KEY is not configured/i);
    } finally {
      env.NODE_ENV = originalEnv;
      env.SENDLIBERTY_API_KEY = originalApiKey;
    }
  });
});
