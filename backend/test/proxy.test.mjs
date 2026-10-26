import 'reflect-metadata';
import { afterEach, expect, it } from 'vitest';
import { Controller, Get, Req } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { configureApp } from '../dist/configure-app.js';
import { validateEnvironment } from '../dist/config/environment.js';

class Probe {
  ip(req) {
    return { ip: req.ip };
  }
}
Controller('probe')(Probe);
Get()(
  Probe.prototype,
  'ip',
  Object.getOwnPropertyDescriptor(Probe.prototype, 'ip'),
);
Req()(Probe.prototype, 'ip', 0);
let app;
afterEach(async () => app?.close());
async function setup(proxy) {
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [() => ({ TRUST_PROXY_IP: proxy, NODE_ENV: 'test' })],
      }),
    ],
    controllers: [Probe],
  }).compile();
  app = module.createNestApplication();
  configureApp(app);
  await app.init();
  return request(app.getHttpServer());
}
it('ignores forwarded client IP unless the immediate peer is trusted', async () => {
  const client = await setup('172.30.77.10');
  const response = await client
    .get('/api/v1/probe')
    .set('X-Forwarded-For', '198.51.100.1');
  expect(response.body.data.ip).not.toBe('198.51.100.1');
});
it('uses the forwarded client only from the explicitly configured peer', async () => {
  const client = await setup('127.0.0.1');
  const response = await client
    .get('/api/v1/probe')
    .set('X-Forwarded-For', '198.51.100.1');
  expect(response.body.data.ip).toBe('198.51.100.1');
});
it('rejects trust-all and malformed proxy settings', () => {
  for (const value of ['true', '*', '0.0.0.0/0', '1', 'proxy.example.com'])
    expect(() => validateEnvironment({ TRUST_PROXY_IP: value })).toThrow(
      /TRUST_PROXY_IP/,
    );
});
