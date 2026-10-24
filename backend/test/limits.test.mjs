import 'reflect-metadata';
import { expect, it } from 'vitest';
import { RateLimitService } from '../dist/common/rate-limit.service.js';
import { coordinates } from '../dist/common/location.js';
it('normalizes negative zero and coordinate precision consistently', () => {
  expect(coordinates(-0.00001, 105.123456)).toEqual({
    latitude: 0,
    longitude: 105.1235,
    locationKey: 'ow:0.0000:105.1235',
  });
});
it('enforces the sliding rate limit and releases expired entries', () => {
  const limiter = new RateLimitService();
  limiter.check('client', 2, 60000, 0);
  limiter.check('client', 2, 60000, 1);
  try {
    limiter.check('client', 2, 60000, 2);
    throw new Error('not limited');
  } catch (e) {
    expect(e.getStatus()).toBe(429);
    expect(e.getResponse().retryAfter).toBe(60);
  }
  expect(() => limiter.check('client', 2, 60000, 60000)).not.toThrow();
});
