import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TokenService, randomToken, tokenHash } from './token.service.js';
import { fail } from '../../common/api-error.js';
import type { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class SessionService implements OnModuleDestroy {
  private readonly cleanup: NodeJS.Timeout;
  constructor(
    private readonly db: PrismaService,
    private readonly tokens: TokenService,
  ) {
    this.cleanup = setInterval(() => {
      void this.purge().catch(() => {
        console.warn('session_cleanup_failed');
      });
    }, 3600000);
    this.cleanup.unref();
  }
  onModuleDestroy() {
    clearInterval(this.cleanup);
  }
  purge() {
    return this.db.session.deleteMany({
      where: {
        OR: [{ revokedAt: { not: null } }, { expiresAt: { lte: new Date() } }],
      },
    });
  }
  async lock(tx: Prisma.TransactionClient, userId: string) {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;
  }
  async findRefresh(request: Request) {
    const token = this.tokens.cookie(request, 'refresh');
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    return this.db.session.findFirst({
      where: {
        refreshTokenHash: tokenHash(token),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  }
  async current(request: Request) {
    const refresh = await this.findRefresh(request);
    if (refresh) return refresh;
    const token = this.tokens.cookie(request, 'access');
    if (!token) return null;
    let payload;
    try {
      payload = await this.tokens.verifyAccess(token);
    } catch {
      return null;
    }
    if (
      typeof payload.sid !== 'string' ||
      typeof payload.sub !== 'string' ||
      !uuid(payload.sid) ||
      !uuid(payload.sub)
    )
      return null;
    return this.db.session.findFirst({
      where: {
        id: payload.sid,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  }
  async create(
    tx: Prisma.TransactionClient,
    userId: string,
    previousId?: string,
  ) {
    if (previousId)
      await tx.session.updateMany({
        where: { id: previousId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    await tx.session.deleteMany({
      where: {
        userId,
        OR: [{ revokedAt: { not: null } }, { expiresAt: { lte: new Date() } }],
      },
    });
    const active = await tx.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: 4,
    });
    if (active.length)
      await tx.session.updateMany({
        where: { id: { in: active.map((s) => s.id) } },
        data: { revokedAt: new Date() },
      });
    const refreshToken = randomToken();
    const session = await tx.session.create({
      data: {
        userId,
        refreshTokenHash: tokenHash(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
      include: { user: true },
    });
    return { session, refreshToken };
  }
  async rotate(request: Request) {
    const previous = await this.findRefresh(request);
    if (!previous) fail(401, 'REFRESH_INVALID');
    const refreshToken = randomToken();
    return this.db.$transaction(async (tx) => {
      await this.lock(tx, previous.userId);
      const updated = await tx.session.updateMany({
        where: {
          id: previous.id,
          refreshTokenHash: previous.refreshTokenHash,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { refreshTokenHash: tokenHash(refreshToken) },
      });
      if (updated.count !== 1) fail(401, 'REFRESH_INVALID');
      const session = await tx.session.findUniqueOrThrow({
        where: { id: previous.id },
        include: { user: true },
      });
      return { session, refreshToken };
    });
  }
}
export const uuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
