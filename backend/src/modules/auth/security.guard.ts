import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { fail } from '../../common/api-error.js';
import { RateLimitService } from '../../common/rate-limit.service.js';
import { TokenService, safeEqual } from './token.service.js';
import { SessionService } from './session.service.js';

@Injectable()
export class SecurityGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly tokens: TokenService,
    private readonly sessions: SessionService,
    private readonly limits: RateLimitService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const path = req.path.replace(/\/$/, '');
    if (path.startsWith('/api/v1/health/')) return true;
    const ip = req.ip ?? 'unknown'; // Express trust proxy is off; never trust arbitrary forwarded headers.
    this.limits.check(`global:${ip}`, 120, 60000);
    if (path.endsWith('/auth/register'))
      this.limits.check(`register:${ip}`, 5, 3600000);
    if (path.endsWith('/auth/login')) {
      this.limits.check(`login:${ip}`, 10, 60000);
      const email: unknown = req.body?.email;
      if (typeof email === 'string' && email.length <= 254)
        this.limits.check(
          `email:${this.tokens.emailKey(email.trim().toLowerCase())}`,
          5,
          900000,
        );
    }
    for (const route of ['auth/csrf', 'auth/refresh', 'weather/search'])
      if (path.endsWith(`/${route}`))
        this.limits.check(`${route}:${ip}`, 30, 60000);
    if (/\/weather\/(current|forecast)$/.test(path))
      this.limits.check(`weather:${ip}`, 60, 60000);
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
    let origin = req.get('origin');
    if (!origin && req.get('referer')) {
      try {
        origin = new URL(req.get('referer')!).origin;
      } catch {
        /* reject below */
      }
    }
    if (origin !== this.config.get('APP_ORIGIN')) fail(403, 'ORIGIN_FORBIDDEN');
    if (
      (Number(req.get('content-length') ?? 0) > 0 ||
        req.get('transfer-encoding')) &&
      !req.is('application/json')
    )
      fail(415, 'UNSUPPORTED_MEDIA_TYPE');
    const csrf = req.get('x-csrf-token') ?? '';
    const cookie = this.tokens.cookie(req, 'csrf') ?? '';
    if (!csrf || !cookie || !safeEqual(csrf, cookie)) fail(403, 'CSRF_INVALID');
    const session = await this.sessions.current(req);
    if (!this.tokens.validCsrf(csrf, session?.id ?? 'anonymous'))
      fail(403, 'CSRF_INVALID');
    if (session) this.limits.check(`mutation:${session.userId}`, 30, 60000);
    return true;
  }
}
