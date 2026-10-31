import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';

const app = createApp();

describe('Auth API & Foundation Tests (Step 1)', () => {
  const validUser = {
    name: 'Alice Student',
    email: 'alice@college.edu',
    password: 'Password123!',
    college: 'Metro State University',
    department: 'Computer Science',
  };

  describe('POST /api/auth/register', () => {
    it('registers a new student successfully and returns Me shape with httpOnly cookie', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.name).toBe(validUser.name);
      expect(res.body.email).toBe(validUser.email);
      expect(res.body.role).toBe('student');
      expect(res.body.college).toBe(validUser.college);
      expect(res.body.department).toBe(validUser.department);
      expect(res.body.isVerified).toBe(false);

      // Verify sensitive fields are NOT exposed
      expect(res.body.password).toBeUndefined();

      // Verify token cookie is set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/token=/);
      expect(cookies[0]).toMatch(/HttpOnly/i);
    });

    it('returns 409 conflict when registering with an existing email', async () => {
      await request(app).post('/api/auth/register').send(validUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already registered|already exists/i);
    });

    it('rejects registration with invalid email format (400 standard error shape)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, email: 'not-an-email' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message', 'Validation failed');
      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors.some((e) => e.field === 'email')).toBe(true);
    });

    it('rejects registration with short password (< 8 chars)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, password: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors.some((e) => e.field === 'password')).toBe(true);
    });

    it('rejects unknown request-body fields with strict Zod parsing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, role: 'admin', hackingField: 'injected' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/login', () => {
    it('authenticates valid credentials and issues httpOnly cookie', async () => {
      await request(app).post('/api/auth/register').send(validUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUser.email,
          password: validUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(validUser.email);
      expect(res.body.name).toBe(validUser.name);
      expect(res.body.password).toBeUndefined();

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/token=/);
      expect(cookies[0]).toMatch(/HttpOnly/i);
    });

    it('returns generic 401 on wrong password without disclosing details', async () => {
      await request(app).post('/api/auth/register').send(validUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUser.email,
          password: 'WrongPassword999!',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('returns same 401 on non-existent email to prevent user enumeration', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@college.edu',
          password: 'SomePassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password');
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns authenticated user details when valid token cookie is sent', async () => {
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      const cookie = registerRes.headers['set-cookie'];

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body._id).toBe(registerRes.body._id);
      expect(res.body.email).toBe(validUser.email);
      expect(res.body.name).toBe(validUser.name);
      expect(res.body.password).toBeUndefined();
    });

    it('returns 401 when no auth cookie is present', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Authentication required/i);
    });

    it('returns 401 when invalid cookie token is supplied', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', ['token=invalid_forged_token; Path=/']);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Invalid or expired token/i);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('clears token cookie and returns 204 no content', async () => {
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      const cookie = registerRes.headers['set-cookie'];

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookie);

      expect(res.status).toBe(204);
      expect(res.text).toBe('');

      // Check cookie was cleared / expired
      const cookies = res.headers['set-cookie'];
      expect(cookies[0]).toMatch(/token=;/);
    });
  });

  describe('Health check and 404 handler', () => {
    it('returns 200 on /api/health', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('returns standard 404 for non-existent route', async () => {
      const res = await request(app).get('/api/unknown-endpoint');
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Resource not found');
    });
  });
});
