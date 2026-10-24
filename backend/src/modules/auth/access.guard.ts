import {
  Injectable,
  createParamDecorator,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import { errors } from 'jose';
import { PrismaService } from '../../prisma/prisma.service.js';
import { fail } from '../../common/api-error.js';
import { TokenService } from './token.service.js';
import { uuid } from './session.service.js';

export interface AuthRequest extends Request {
  auth: { userId: string; sessionId: string };
}
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<AuthRequest>().auth.userId,
);
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly tokens: TokenService,
    private readonly db: PrismaService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const token = this.tokens.cookie(req, 'access');
    if (!token) fail(401, 'AUTH_REQUIRED');
    let payload;
    try {
      payload = await this.tokens.verifyAccess(token);
    } catch (error) {
      fail(
        401,
        error instanceof errors.JWTExpired
          ? 'ACCESS_EXPIRED'
          : 'SESSION_INVALID',
      );
    }
    if (
      typeof payload.sid !== 'string' ||
      typeof payload.sub !== 'string' ||
      !uuid(payload.sid) ||
      !uuid(payload.sub)
    )
      fail(401, 'SESSION_INVALID');
    const session = await this.db.session.findFirst({
      where: {
        id: payload.sid,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!session) fail(401, 'SESSION_INVALID');
    req.auth = { userId: session.userId, sessionId: session.id };
    return true;
  }
}
