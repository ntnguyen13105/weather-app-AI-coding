import 'reflect-metadata';
import process from 'node:process';
import { URL } from 'node:url';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AuthModule } from '../dist/modules/auth/auth.module.js';
import { UsersModule } from '../dist/modules/users/users.module.js';
import { PrismaService } from '../dist/prisma/prisma.service.js';
import { configureApp } from '../dist/configure-app.js';

const url = process.env.TEST_DATABASE_URL;
if (!url || new URL(url).pathname !== '/weather_app_test')
  throw new Error(
    'TEST_DATABASE_URL phải trỏ tới weather_app_test. Không dùng database ứng dụng.',
  );
const origin = 'http://localhost:5173';
describe('HTTP + PostgreSQL integration', () => {
  let app, db, a, csrf, email, userId;
  const ids = [];
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              DATABASE_URL: url,
              APP_ORIGIN: origin,
              JWT_SECRET: 'j'.repeat(64),
              CSRF_SECRET: 'c'.repeat(64),
              NODE_ENV: 'test',
            }),
          ],
        }),
        AuthModule,
        UsersModule,
      ],
    }).compile();
    app = module.createNestApplication({ bodyParser: false });
    configureApp(app);
    await app.init();
    db = app.get(PrismaService);
    a = request.agent(app.getHttpServer());
    email = `${randomUUID()}@example.com`;
  });
  afterAll(async () => {
    if (db) await db.user.deleteMany({ where: { id: { in: ids } } });
    await app?.close();
  });
  it('denies unauthenticated access, missing CSRF and cross-origin registration', async () => {
    await a.get('/api/v1/auth/me').expect(401);
    await a
      .post('/api/v1/auth/register')
      .set('Origin', origin)
      .send({})
      .expect(403);
    csrf = (await a.get('/api/v1/auth/csrf').expect(200)).body.data.csrfToken;
    await a
      .post('/api/v1/auth/register')
      .set('Origin', 'https://attacker.example')
      .set('X-CSRF-Token', csrf)
      .send({})
      .expect(403);
  });
  it('registers, sets HttpOnly cookies, and exposes only public user fields', async () => {
    const r = await a
      .post('/api/v1/auth/register')
      .set('Origin', origin)
      .set('X-CSRF-Token', csrf)
      .send({
        email,
        password: 'long-password-123',
        displayName: ' Người học ',
      })
      .expect(201);
    userId = r.body.data.user.id;
    ids.push(userId);
    csrf = r.body.data.csrfToken;
    expect(
      r.headers['set-cookie'].every(
        (c) => c.includes('HttpOnly') && c.includes('SameSite=Lax'),
      ),
    ).toBe(true);
    expect(r.body.data.user.displayName).toBe('Người học');
    expect(JSON.stringify(r.body)).not.toMatch(
      /passwordHash|refreshToken|long-password/,
    );
    expect(
      (await db.user.findUnique({ where: { id: userId } })).passwordHash,
    ).toMatch(/^\$argon2id\$/);
    expect((await a.get('/api/v1/auth/me').expect(200)).body.data.id).toBe(
      userId,
    );
  });
  it('rejects extra userId, empty profile and oversized input', async () => {
    for (const body of [{ userId }, {}])
      await a
        .patch('/api/v1/users/me')
        .set('Origin', origin)
        .set('X-CSRF-Token', csrf)
        .send(body)
        .expect(400);
    await a
      .patch('/api/v1/users/me')
      .set('Origin', origin)
      .set('X-CSRF-Token', csrf)
      .send({ displayName: 'x'.repeat(17000) })
      .expect(413);
    const r = await a
      .patch('/api/v1/users/me')
      .set('Origin', origin)
      .set('X-CSRF-Token', csrf)
      .send({ preferredTemperatureUnit: 'F' })
      .expect(200);
    expect(r.body.data.preferredTemperatureUnit).toBe('F');
  });
  it('rotates refresh tokens and rejects reuse without extending the session', async () => {
    const before = await db.session.findFirst({
      where: { userId, revokedAt: null },
    });
    const r = await a
      .post('/api/v1/auth/refresh')
      .set('Origin', origin)
      .set('X-CSRF-Token', csrf)
      .expect(200);
    csrf = r.body.data.csrfToken;
    const after = await db.session.findUnique({ where: { id: before.id } });
    expect(after.refreshTokenHash).not.toBe(before.refreshTokenHash);
    expect(after.expiresAt).toEqual(before.expiresAt);
  });
  it('changes password, revokes all sessions and requires the new password', async () => {
    await a
      .patch('/api/v1/users/me/password')
      .set('Origin', origin)
      .set('X-CSRF-Token', csrf)
      .send({ currentPassword: 'wrong', newPassword: 'next-password-123' })
      .expect(400);
    await a
      .patch('/api/v1/users/me/password')
      .set('Origin', origin)
      .set('X-CSRF-Token', csrf)
      .send({
        currentPassword: 'long-password-123',
        newPassword: 'next-password-123',
      })
      .expect(204);
    await a.get('/api/v1/auth/me').expect(401);
    expect(await db.session.count({ where: { userId, revokedAt: null } })).toBe(
      0,
    );
    csrf = (await a.get('/api/v1/auth/csrf')).body.data.csrfToken;
    await a
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .set('X-CSRF-Token', csrf)
      .send({ email, password: 'long-password-123' })
      .expect(401);
    const r = await a
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .set('X-CSRF-Token', csrf)
      .send({ email, password: 'next-password-123' })
      .expect(200);
    csrf = r.body.data.csrfToken;
    await a
      .post('/api/v1/auth/logout')
      .set('Origin', origin)
      .set('X-CSRF-Token', csrf)
      .expect(204);
    await a.get('/api/v1/auth/me').expect(401);
  });
});
