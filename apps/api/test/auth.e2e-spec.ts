import { randomUUID } from 'node:crypto';
import request, { type Response } from 'supertest';
import { type ApiErrorResponse, type AuthResponse } from '@app/shared';
import { createTestApp, TEST_ENV, type TestContext } from './setup-e2e';

const PASSWORD = 'Str0ng!pass';
const uniqueEmail = () => `user-${randomUUID()}@example.com`;
const cookieOf = (res: Response): string => {
  const raw = res.headers['set-cookie'];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const cookie = list.find((c) => c.startsWith('refresh_token='));
  if (!cookie) throw new Error('refresh cookie not set');
  return cookie;
};

describe('Identity API (e2e)', () => {
  let ctx: TestContext;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    ctx = await createTestApp();
    http = request(ctx.app.getHttpServer());
  });
  afterAll(() => ctx?.close());

  // Each call comes from a fresh client IP (TRUST_PROXY=true in tests) so that the per-IP auth
  // rate limit, which is itself under test below, does not interfere with the other tests.
  const freshIp = () => `10.${rand()}.${rand()}.${rand()}`;
  const rand = () => Math.floor(Math.random() * 254) + 1;
  const signUp = (body: Record<string, unknown>) =>
    http.post('/api/v1/auth/sign-up').set('X-Forwarded-For', freshIp()).send(body);
  const signIn = (body: Record<string, unknown>) =>
    http.post('/api/v1/auth/sign-in').set('X-Forwarded-For', freshIp()).send(body);
  const refresh = (cookie?: string) => {
    const req = http.post('/api/v1/auth/refresh').set('X-Forwarded-For', freshIp());
    return cookie ? req.set('Cookie', cookie) : req;
  };

  describe('GET /health', () => {
    it('returns ok with mongo up', async () => {
      const res = await http.get('/api/v1/health').expect(200);
      expect(res.body).toEqual({ status: 'ok', mongo: 'up' });
    });
  });

  describe('POST /auth/sign-up', () => {
    it('201: returns access token + user, sets an httpOnly refresh cookie, leaks no secrets', async () => {
      const email = uniqueEmail();
      const res = await signUp({
        email: email.toUpperCase(),
        name: ' Jane ',
        password: PASSWORD,
      }).expect(201);

      const body = res.body as AuthResponse;
      expect(body.accessToken).toEqual(expect.any(String));
      expect(body.user).toEqual({
        id: expect.any(String),
        email,
        name: 'Jane',
        createdAt: expect.any(String),
      });
      expect(JSON.stringify(body)).not.toMatch(/passwordHash|refreshTokenHash|argon2/);

      const cookie = cookieOf(res);
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/SameSite=Strict/);
      expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
      expect(res.headers['x-request-id']).toEqual(expect.any(String));
    });

    it.each([
      ['invalid email', { email: 'nope', name: 'Jane', password: PASSWORD }, 'email'],
      ['name of 2 chars', { email: uniqueEmail(), name: 'Jo', password: PASSWORD }, 'name'],
      [
        'password of 7 chars',
        { email: uniqueEmail(), name: 'Jane', password: 'Abc123!' },
        'password',
      ],
      [
        'password without letter',
        { email: uniqueEmail(), name: 'Jane', password: '12345678!' },
        'password',
      ],
      [
        'password without number',
        { email: uniqueEmail(), name: 'Jane', password: 'Abcdefgh!' },
        'password',
      ],
      [
        'password without special',
        { email: uniqueEmail(), name: 'Jane', password: 'Abcd1234' },
        'password',
      ],
      ['missing body', {}, 'email'],
    ])('400 on %s with field details and the common error shape', async (_label, body, field) => {
      const res = await signUp(body).expect(400);
      const err = res.body as ApiErrorResponse;
      expect(err).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
        path: '/api/v1/auth/sign-up',
        requestId: expect.any(String),
        timestamp: expect.any(String),
      });
      expect(err.details?.[field]).toEqual(expect.any(Array));
      expect(JSON.stringify(err)).not.toMatch(/\bat\s+\S+\s\(/); // no stack trace
    });

    it('409 on duplicate email (case-insensitive)', async () => {
      const email = uniqueEmail();
      await signUp({ email, name: 'Jane', password: PASSWORD }).expect(201);
      const res = await signUp({
        email: email.toUpperCase(),
        name: 'John',
        password: PASSWORD,
      }).expect(409);
      expect((res.body as ApiErrorResponse).error).toBe('Conflict');
    });

    it('concurrent duplicate sign-ups: exactly one 201 and one 409', async () => {
      const email = uniqueEmail();
      const results = await Promise.all([
        signUp({ email, name: 'Jane', password: PASSWORD }),
        signUp({ email, name: 'John', password: PASSWORD }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    });
  });

  describe('POST /auth/sign-in', () => {
    const email = uniqueEmail();
    beforeAll(() => signUp({ email, name: 'Jane', password: PASSWORD }).expect(201));

    it('200 with correct credentials, sets a new refresh cookie', async () => {
      const res = await signIn({ email, password: PASSWORD }).expect(200);
      expect((res.body as AuthResponse).user.email).toBe(email);
      expect(cookieOf(res)).toMatch(/HttpOnly/);
    });

    it('401 with an identical generic message for wrong password and unknown email', async () => {
      const wrong = await signIn({ email, password: 'Wrong1!pass' }).expect(401);
      const unknown = await signIn({ email: uniqueEmail(), password: PASSWORD }).expect(401);
      expect((wrong.body as ApiErrorResponse).message).toBe('Invalid email or password');
      expect(wrong.body).toMatchObject({ message: (unknown.body as ApiErrorResponse).message });
      expect(unknown.headers['set-cookie']).toBeUndefined();
    });

    it('400 on malformed body', async () => {
      await signIn({ email: 'x', password: '' }).expect(400);
    });
  });

  describe('GET /users/me (protected)', () => {
    it('200 with a valid token and returns the profile without secrets', async () => {
      const email = uniqueEmail();
      const { body } = await signUp({ email, name: 'Jane', password: PASSWORD }).expect(201);
      const auth = body as AuthResponse;
      const res = await http
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .expect(200);
      expect(res.body).toEqual({
        id: auth.user.id,
        email,
        name: 'Jane',
        createdAt: auth.user.createdAt,
      });
    });

    it('401 without a token', async () => {
      await http.get('/api/v1/users/me').expect(401);
    });

    it('401 with a malformed token', async () => {
      await http.get('/api/v1/users/me').set('Authorization', 'Bearer not-a-jwt').expect(401);
    });

    it('401 with an expired token', async () => {
      const { JwtService } = await import('@nestjs/jwt');
      const expired = await new JwtService().signAsync(
        { sub: 'someone', email: 'x@y.z' },
        { secret: TEST_ENV.JWT_ACCESS_SECRET, expiresIn: -10 },
      );
      await http.get('/api/v1/users/me').set('Authorization', `Bearer ${expired}`).expect(401);
    });

    it('401 with a token signed by a different secret', async () => {
      const { JwtService } = await import('@nestjs/jwt');
      const forged = await new JwtService().signAsync(
        { sub: 'someone', email: 'x@y.z' },
        { secret: 'another-secret-another-secret-another-secret', expiresIn: 60 },
      );
      await http.get('/api/v1/users/me').set('Authorization', `Bearer ${forged}`).expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('rotates the refresh token and issues a new access token', async () => {
      const first = await signUp({ email: uniqueEmail(), name: 'Jane', password: PASSWORD }).expect(
        201,
      );
      const res = await refresh(cookieOf(first)).expect(200);
      expect((res.body as AuthResponse).accessToken).toEqual(expect.any(String));
      expect((res.body as AuthResponse).user.id).toBe((first.body as AuthResponse).user.id);
      expect(cookieOf(res)).not.toBe(cookieOf(first));
    });

    it('reuse of a rotated token → 401, session revoked, and the newest token is dead too', async () => {
      const first = await signUp({ email: uniqueEmail(), name: 'Jane', password: PASSWORD }).expect(
        201,
      );
      const rotated = await refresh(cookieOf(first)).expect(200);

      const reuse = await refresh(cookieOf(first)).expect(401);
      expect(cookieOf(reuse)).toMatch(/refresh_token=;/); // cleared
      await refresh(cookieOf(rotated)).expect(401);
    });

    it('401 without a cookie or with garbage', async () => {
      await refresh().expect(401);
      await refresh('refresh_token=garbage').expect(401);
    });
  });

  describe('POST /auth/sign-out', () => {
    it('204, clears the cookie, and the refresh token no longer works', async () => {
      const first = await signUp({ email: uniqueEmail(), name: 'Jane', password: PASSWORD }).expect(
        201,
      );
      const out = await http
        .post('/api/v1/auth/sign-out')
        .set('Cookie', cookieOf(first))
        .expect(204);
      expect(cookieOf(out)).toMatch(/refresh_token=;/);
      await refresh(cookieOf(first)).expect(401);
    });

    it('204 even without a session', async () => {
      await http.post('/api/v1/auth/sign-out').expect(204);
    });
  });

  describe('rate limiting', () => {
    it('429 after the per-IP limit on sign-in', async () => {
      const ip = '203.0.113.42';
      const attempt = () =>
        signIn({ email: 'rl@example.com', password: 'Wrong1!pass' }).set('X-Forwarded-For', ip);
      for (let i = 0; i < 10; i += 1) await attempt().expect(401);
      const res = await attempt().expect(429);
      expect((res.body as ApiErrorResponse).error).toBe('Too Many Requests');
    });
  });

  describe('security headers & docs', () => {
    it('serves helmet headers and the Swagger document', async () => {
      const health = await http.get('/api/v1/health');
      expect(health.headers['x-content-type-options']).toBe('nosniff');
      const docs = await http.get('/api/docs-json').expect(200);
      const paths = Object.keys((docs.body as { paths: Record<string, unknown> }).paths);
      expect(paths).toEqual(
        expect.arrayContaining([
          '/api/v1/auth/sign-up',
          '/api/v1/auth/sign-in',
          '/api/v1/auth/refresh',
          '/api/v1/auth/sign-out',
          '/api/v1/users/me',
          '/api/v1/health',
        ]),
      );
    });
  });
});
