import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  randomBytes,
  createHash,
  createHmac,
  timingSafeEqual,
} from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import { parseCookie } from 'cookie';
import type { Request, Response } from 'express';

export const randomToken = () => randomBytes(32).toString('base64url');
export const tokenHash = (token: string) =>
  createHash('sha256').update(token).digest('hex');
export function safeEqual(a: string, b: string) {
  return (
    a.length === b.length &&
    Buffer.byteLength(a) === Buffer.byteLength(b) &&
    timingSafeEqual(Buffer.from(a), Buffer.from(b))
  );
}

@Injectable()
export class TokenService {
  private readonly jwtKey: Uint8Array;
  private readonly csrfKey: string;
  private readonly secure: boolean;
  constructor(config: ConfigService) {
    const jwt = config.getOrThrow<string>('JWT_SECRET');
    this.csrfKey = config.getOrThrow<string>('CSRF_SECRET');
    if (jwt.length < 43 || this.csrfKey.length < 43 || jwt === this.csrfKey)
      throw new Error(
        'JWT_SECRET và CSRF_SECRET phải độc lập, dài ít nhất 43 ký tự.',
      );
    this.jwtKey = new TextEncoder().encode(jwt);
    this.secure = config.get('NODE_ENV') === 'production';
  }
  name(kind: string) {
    return `${this.secure ? '__Host-' : ''}wa-${kind}`;
  }
  cookie(request: Request, kind: string) {
    return parseCookie(request.headers.cookie ?? '')[this.name(kind)];
  }
  setCookie(response: Response, kind: string, value: string, expires: Date) {
    response.cookie(this.name(kind), value, {
      httpOnly: true,
      secure: this.secure,
      sameSite: 'lax',
      path: '/',
      expires,
    });
  }
  clear(response: Response) {
    for (const kind of ['access', 'refresh', 'csrf'])
      response.clearCookie(this.name(kind), {
        httpOnly: true,
        secure: this.secure,
        sameSite: 'lax',
        path: '/',
      });
  }
  access(userId: string, sessionId: string, expires: Date) {
    return new SignJWT({ sid: sessionId })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer('weather-app')
      .setAudience('weather-app-web')
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime(Math.floor(expires.getTime() / 1000))
      .sign(this.jwtKey);
  }
  async verifyAccess(token: string) {
    const { payload } = await jwtVerify(token, this.jwtKey, {
      algorithms: ['HS256'],
      issuer: 'weather-app',
      audience: 'weather-app-web',
      requiredClaims: ['exp', 'iat', 'sub', 'sid'],
    });
    return payload;
  }
  // OWASP signed double-submit pattern: signature binds nonce and expiry to this session.
  csrf(binding: string, ttlMs = 3600000) {
    const expiresAt = new Date(Date.now() + ttlMs);
    const body = `${expiresAt.getTime()}.${randomToken()}`;
    return { token: `${body}.${this.signature(binding, body)}`, expiresAt };
  }
  validCsrf(token: string, binding: string) {
    if (token.length > 256) return false;
    const parts = token.split('.');
    if (
      parts.length !== 3 ||
      !/^\d+$/.test(parts[0]) ||
      Number(parts[0]) <= Date.now() ||
      !/^[A-Za-z0-9_-]{43}$/.test(parts[1])
    )
      return false;
    return safeEqual(
      parts[2],
      this.signature(binding, `${parts[0]}.${parts[1]}`),
    );
  }
  emailKey(email: string) {
    return this.signature('login-limit', email);
  }
  private signature(binding: string, value: string) {
    return createHmac('sha256', this.csrfKey)
      .update(`${binding.length}!${binding}!${value.length}!${value}`)
      .digest('base64url');
  }
}
