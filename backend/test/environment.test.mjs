import { describe, expect, it } from 'vitest';
import { validateEnvironment } from '../dist/config/environment.js';

const valid = {
  DATABASE_URL:
    'postgresql://weather_app:test-password@127.0.0.1:55432/weather_app',
  APP_ORIGIN: 'http://localhost:5173',
};

describe('Environment boundary', () => {
  it('accepts a local phase-3 configuration without weather/auth secrets', () => {
    expect(validateEnvironment(valid)).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
    });
  });
  it.each(['', 'abc', '-1', '65536', '3000oops'])(
    'rejects invalid PORT %j',
    (PORT) => {
      expect(() => validateEnvironment({ ...valid, PORT })).toThrow(/PORT/);
    },
  );
  it.each([
    'https://example.com',
    'not-a-url',
    'postgresql://user:REPLACE_WITH_YOUR_PASSWORD@localhost/db',
  ])('rejects invalid/unconfigured database URLs', (DATABASE_URL) => {
    expect(() => validateEnvironment({ ...valid, DATABASE_URL })).toThrow(
      /DATABASE_URL/,
    );
  });
  it('rejects non-origin APP_ORIGIN and keeps secrets out of errors', () => {
    const secret = 'do-not-echo-this-password';
    expect(() =>
      validateEnvironment({ ...valid, APP_ORIGIN: 'https://example.com/path' }),
    ).toThrow(/APP_ORIGIN/);
    try {
      validateEnvironment({
        ...valid,
        DATABASE_URL: `https://user:${secret}@host`,
      });
      throw new Error('Expected validation to fail');
    } catch (error) {
      expect(error.message).not.toContain(secret);
    }
  });
  it('rejects insecure or unconfigured production settings', () => {
    expect(() =>
      validateEnvironment({ ...valid, NODE_ENV: 'production' }),
    ).toThrow();
  });
});
