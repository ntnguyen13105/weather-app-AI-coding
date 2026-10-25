import 'reflect-metadata';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { configureApp } from '../dist/configure-app.js';
import { AuthModule } from '../dist/modules/auth/auth.module.js';
import { UsersModule } from '../dist/modules/users/users.module.js';
import { FavoritesModule } from '../dist/modules/favorites/favorites.module.js';
import { SearchHistoryModule } from '../dist/modules/search-history/search-history.module.js';
import { WeatherModule } from '../dist/modules/weather/weather.module.js';
import { HealthModule } from '../dist/modules/health/health.module.js';
import { TokenService } from '../dist/modules/auth/token.service.js';
let app;
beforeAll(async () => {
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [
          () => ({
            NODE_ENV: 'development',
            APP_ORIGIN: 'http://localhost:5173',
            DATABASE_URL: 'postgresql://no:private-password@127.0.0.1:55433/no',
            JWT_SECRET: 'j'.repeat(64),
            CSRF_SECRET: 'c'.repeat(64),
          }),
        ],
      }),
      AuthModule,
      UsersModule,
      FavoritesModule,
      SearchHistoryModule,
      WeatherModule,
      HealthModule,
    ],
  }).compile();
  app = module.createNestApplication({ bodyParser: false });
  configureApp(app);
  await app.init();
});
afterAll(async () => app?.close());
it('documents all 21 operations with envelopes, request DTOs and CSRF', async () => {
  const { body: doc } = await request(app.getHttpServer())
    .get('/api/docs-json')
    .expect(200);
  const operations = Object.values(doc.paths).flatMap((p) =>
    Object.entries(p).filter(([m]) =>
      ['get', 'post', 'patch', 'delete'].includes(m),
    ),
  );
  expect(operations).toHaveLength(21);
  for (const [method, operation] of operations) {
    const success = operation.responses['200'] ?? operation.responses['201'];
    if (success)
      expect(
        success.content['application/json'].schema.properties.meta,
      ).toBeDefined();
    else expect(operation.responses['204'].content).toBeUndefined();
    if (method !== 'get')
      expect(
        operation.parameters.find((p) => p.name === 'X-CSRF-Token').required,
      ).toBe(true);
  }
  expect(doc.components.schemas.RegisterDto.properties.password.minLength).toBe(
    12,
  );
  expect(
    doc.paths['/api/v1/weather/forecast'].get.parameters.map((p) => p.name),
  ).toEqual(expect.arrayContaining(['lat', 'lon']));
});
it('keeps liveness available and reports DB failure as sanitized 503', async () => {
  await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);
  const ready = await request(app.getHttpServer())
    .get('/api/v1/health/ready')
    .expect(503);
  expect(ready.body.error.code).toBe('DATABASE_UNAVAILABLE');
  const tokens = app.get(TokenService);
  const jwt = await tokens.access(
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002',
    new Date(Date.now() + 60000),
  );
  const r = await request(app.getHttpServer())
    .get('/api/v1/auth/me')
    .set('Cookie', `wa-access=${jwt}`)
    .expect(503);
  expect(r.body.error.code).toBe('DATABASE_UNAVAILABLE');
  expect(JSON.stringify(r.body)).not.toMatch(
    /private-password|Prisma|SELECT|55433/,
  );
});
