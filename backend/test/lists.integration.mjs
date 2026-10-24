import 'reflect-metadata';
import process from 'node:process';
import { URL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { AuthModule } from '../dist/modules/auth/auth.module.js';
import { FavoritesModule } from '../dist/modules/favorites/favorites.module.js';
import { FavoritesService } from '../dist/modules/favorites/favorites.service.js';
import { SearchHistoryModule } from '../dist/modules/search-history/search-history.module.js';
import { SearchHistoryService } from '../dist/modules/search-history/search-history.service.js';
import { PrismaService } from '../dist/prisma/prisma.service.js';
import { locationData } from '../dist/common/location.js';
import { configureApp } from '../dist/configure-app.js';
const url = process.env.TEST_DATABASE_URL;
if (!url || new URL(url).pathname !== '/weather_app_test')
  throw new Error('Dedicated test database required');
const origin = 'http://localhost:5173';
const location = {
  name: 'Hà Nội',
  country: 'VN',
  latitude: 21.0285,
  longitude: 105.8542,
};
describe('Personal data isolation and transaction limits', () => {
  let app, db, favorites, history, a, b;
  const ids = [];
  async function account() {
    const agent = request.agent(app.getHttpServer());
    const csrf = (await agent.get('/api/v1/auth/csrf')).body.data.csrfToken;
    const result = await agent
      .post('/api/v1/auth/register')
      .set('Origin', origin)
      .set('X-CSRF-Token', csrf)
      .send({
        email: `${randomUUID()}@example.com`,
        password: 'test-password-123',
        displayName: 'Test',
      })
      .expect(201);
    ids.push(result.body.data.user.id);
    return {
      agent,
      csrf: result.body.data.csrfToken,
      id: result.body.data.user.id,
    };
  }
  const mutation = (actor, method, path) =>
    actor.agent[method](`/api/v1${path}`)
      .set('Origin', origin)
      .set('X-CSRF-Token', actor.csrf);
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
        FavoritesModule,
        SearchHistoryModule,
      ],
    }).compile();
    app = module.createNestApplication({ bodyParser: false });
    configureApp(app);
    await app.init();
    db = app.get(PrismaService);
    favorites = app.get(FavoritesService);
    history = app.get(SearchHistoryService);
    a = await account();
    b = await account();
  });
  afterAll(async () => {
    if (db) await db.user.deleteMany({ where: { id: { in: ids } } });
    await app?.close();
  });
  it('does not expose or delete another account favorites or history', async () => {
    await request(app.getHttpServer()).get('/api/v1/favorites').expect(401);
    const favorite = (
      await mutation(a, 'post', '/favorites').send(location).expect(201)
    ).body.data;
    expect(
      (await b.agent.get('/api/v1/favorites').expect(200)).body.data,
    ).toEqual([]);
    await mutation(b, 'delete', `/favorites/${favorite.id}`).expect(404);
    await mutation(a, 'post', '/favorites')
      .send({ ...location, name: 'Hanoi' })
      .expect(409);
    await mutation(a, 'post', '/favorites')
      .send({ ...location, userId: b.id })
      .expect(400);
    await mutation(a, 'post', '/favorites')
      .send({ ...location, latitude: 91 })
      .expect(400);
    const r = (
      await mutation(a, 'post', '/search-history').send(location).expect(200)
    ).body.data;
    const repeated = (
      await mutation(a, 'post', '/search-history')
        .send({ ...location, name: 'Hanoi' })
        .expect(200)
    ).body.data;
    expect(repeated.id).toBe(r.id);
    await mutation(b, 'delete', `/search-history/${r.id}`).expect(404);
    await mutation(b, 'delete', '/search-history').expect(204);
    expect(
      (await a.agent.get('/api/v1/search-history').expect(200)).body.meta
        .pagination.totalItems,
    ).toBe(1);
    await mutation(a, 'delete', `/favorites/${favorite.id}`).expect(204);
    await mutation(a, 'delete', '/favorites/not-uuid').expect(400);
    await a.agent.get('/api/v1/favorites?page=&pageSize=2').expect(400);
  });
  it('serializes concurrent duplicate favorites', async () => {
    const results = await Promise.allSettled([
      favorites.add(a.id, location),
      favorites.add(a.id, location),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      results.find((r) => r.status === 'rejected').reason.getStatus(),
    ).toBe(409);
  });
  it('never exceeds 50 favorites under concurrent inserts', async () => {
    await db.favorite.createMany({
      data: Array.from({ length: 48 }, (_, i) => ({
        ...locationData({ ...location, latitude: i }),
        userId: a.id,
      })),
    });
    const results = await Promise.allSettled([
      favorites.add(a.id, { ...location, latitude: -1 }),
      favorites.add(a.id, { ...location, latitude: -2 }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await db.favorite.count({ where: { userId: a.id } })).toBe(50);
  });
  it('keeps only 20 recent unique history items, including concurrent records', async () => {
    for (let i = 0; i < 23; i++)
      await history.record(a.id, { ...location, latitude: i });
    await Promise.all([
      history.record(a.id, { ...location, latitude: -1 }),
      history.record(a.id, { ...location, latitude: -2 }),
    ]);
    expect(await db.searchHistory.count({ where: { userId: a.id } })).toBe(20);
    expect(
      await db.searchHistory.count({ where: { userId: a.id, latitude: 0 } }),
    ).toBe(0);
    const r = await a.agent
      .get('/api/v1/search-history?page=2&pageSize=3')
      .expect(200);
    expect(r.body.data).toHaveLength(3);
    expect(r.body.meta.pagination.totalItems).toBe(20);
    await mutation(a, 'delete', '/search-history').expect(204);
    expect(await db.searchHistory.count({ where: { userId: a.id } })).toBe(0);
  });
  it('enforces database CHECK constraints and cascade deletion', async () => {
    await expect(
      db.favorite.create({
        data: { ...locationData(location), userId: b.id, latitude: 91 },
      }),
    ).rejects.toThrow();
    await favorites.add(b.id, location);
    await db.user.delete({ where: { id: b.id } });
    expect(await db.favorite.count({ where: { userId: b.id } })).toBe(0);
    expect(await db.session.count({ where: { userId: b.id } })).toBe(0);
  });
});
