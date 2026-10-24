import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { HealthModule } from '../dist/modules/health/health.module.js';
import { PrismaService } from '../dist/prisma/prisma.service.js';
import { configureApp } from '../dist/configure-app.js';

describe('Health API (mock DB)', () => {
  let app;
  const query = vi.fn();
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        HealthModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({ $queryRaw: query })
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });
  it('liveness does not query the database', async () => {
    query.mockClear();
    const response = await request(app.getHttpServer())
      .get('/api/v1/health/live')
      .expect(200);
    expect(response.body.data).toEqual({ status: 'ok' });
    expect(response.body.meta.requestId).toBe(response.headers['x-request-id']);
    expect(query).not.toHaveBeenCalled();
  });
  it('readiness checks the database', async () => {
    query.mockResolvedValueOnce([{ '?column?': 1 }]);
    const response = await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(200);
    expect(response.body.data).toEqual({ status: 'ready' });
  });
  it('reports 503 without leaking internal DB errors', async () => {
    query.mockRejectedValueOnce(
      new Error('private-db-password sql-stack-trace'),
    );
    const response = await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(503);
    expect(response.body.error.code).toBe('DATABASE_UNAVAILABLE');
    expect(JSON.stringify(response.body)).not.toMatch(/private-db|sql-stack/);
  });
  it('returns the error envelope for unknown endpoints', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/does-not-exist')
      .expect(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.headers['cache-control']).toBe('no-store');
  });
});
