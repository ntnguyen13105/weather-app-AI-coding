import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { PasswordService } from '../dist/modules/auth/password.service.js';
import { TokenService } from '../dist/modules/auth/token.service.js';

describe('Authentication security primitives', () => {
  const passwords = new PasswordService();
  const tokens = new TokenService(
    new ConfigService({
      JWT_SECRET: 'a'.repeat(64),
      CSRF_SECRET: 'b'.repeat(64),
      NODE_ENV: 'test',
    }),
  );
  it('hashes with Argon2id and distinguishes passwords without trimming', async () => {
    const hash = await passwords.hash('a long password ');
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await passwords.verify(hash, 'a long password ')).toBe(true);
    expect(await passwords.verify(hash, 'a long password')).toBe(false);
  });
  it('binds CSRF to the session, expiry and random nonce', () => {
    const csrf = tokens.csrf('session-one');
    expect(tokens.validCsrf(csrf.token, 'session-one')).toBe(true);
    expect(tokens.validCsrf(csrf.token, 'session-two')).toBe(false);
    expect(tokens.validCsrf(`${csrf.token}x`, 'session-one')).toBe(false);
    expect(
      tokens.validCsrf(tokens.csrf('session-one', -1).token, 'session-one'),
    ).toBe(false);
  });
  it('rejects JWT tampering and expired tokens', async () => {
    const jwt = await tokens.access(
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002',
      new Date(Date.now() + 60000),
    );
    expect((await tokens.verifyAccess(jwt)).sid).toBe(
      '00000000-0000-4000-8000-000000000002',
    );
    await expect(tokens.verifyAccess(`${jwt}x`)).rejects.toThrow();
    await expect(
      tokens.verifyAccess(await tokens.access('x', 'y', new Date(0))),
    ).rejects.toThrow();
  });
});
