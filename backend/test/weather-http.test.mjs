import 'reflect-metadata';
import { beforeAll, afterAll, it, expect, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { configureApp } from '../dist/configure-app.js';
import { WeatherModule } from '../dist/modules/weather/weather.module.js';
import { WEATHER_FETCH } from '../dist/modules/weather/openweather.service.js';
let app;
const transport = vi.fn(async () => globalThis.Response.json([]));
beforeAll(async () => {
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [() => ({ OPENWEATHER_API_KEY: 'unit-key', NODE_ENV: 'test' })],
      }),
      WeatherModule,
    ],
  })
    .overrideProvider(WEATHER_FETCH)
    .useValue(transport)
    .compile();
  app = module.createNestApplication({ bodyParser: false });
  configureApp(app);
  await app.init();
});
afterAll(async () => app?.close());
it('rejects empty, nonnumeric, out-of-range and unknown weather query fields', async () => {
  for (const query of [
    'lat=&lon=105',
    'lat=NaN&lon=105',
    'lat=91&lon=105',
    'lat=21&lon=181',
    'lat=21&lon=105&units=imperial',
  ])
    await request(app.getHttpServer())
      .get(`/api/v1/weather/current?${query}`)
      .expect(400);
  expect(transport).not.toHaveBeenCalled();
});
it('handles empty searches and reports alerts as unsupported', async () => {
  const r = await request(app.getHttpServer())
    .get('/api/v1/weather/search?q=Unknown')
    .expect(200);
  expect(r.body.data).toEqual([]);
  const a = await request(app.getHttpServer())
    .get('/api/v1/weather/alerts')
    .expect(200);
  expect(a.body.data.status).toBe('UNSUPPORTED');
});
