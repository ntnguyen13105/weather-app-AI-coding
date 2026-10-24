import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { User } from '../../generated/prisma/client.js';
import { fail } from '../../common/api-error.js';
import { PasswordService } from './password.service.js';
import { TokenService, randomToken } from './token.service.js';
import { SessionService } from './session.service.js';
import type { LoginDto, RegisterDto } from './auth.dto.js';

export function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    preferredTemperatureUnit: user.preferredTemperatureUnit,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
@Injectable()
export class AuthService implements OnModuleInit {
  private dummyHash: string;
  constructor(
    private readonly db: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly tokens: TokenService,
  ) {}
  async onModuleInit() {
    this.dummyHash = await this.passwords.hash(randomToken());
  }
  async csrf(req: Request, res: Response) {
    const session = await this.sessions.current(req);
    const csrf = this.tokens.csrf(session?.id ?? 'anonymous');
    this.tokens.setCookie(res, 'csrf', csrf.token, csrf.expiresAt);
    return { csrfToken: csrf.token, expiresAt: csrf.expiresAt };
  }
  async register(input: RegisterDto, req: Request, res: Response) {
    const passwordHash = await this.passwords.hash(input.password);
    const previous = await this.sessions.current(req);
    try {
      const result = await this.db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: input.email,
            displayName: input.displayName,
            passwordHash,
          },
        });
        return this.sessions.create(tx, user.id, previous?.id);
      });
      return this.respond(result, res);
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      )
        fail(409, 'EMAIL_ALREADY_EXISTS');
      throw error;
    }
  }
  async login(input: LoginDto, req: Request, res: Response) {
    const user = await this.db.user.findUnique({
      where: { email: input.email },
    });
    const valid = await this.passwords.verify(
      user?.passwordHash ?? this.dummyHash,
      input.password,
    );
    if (!user || !valid) fail(401, 'INVALID_CREDENTIALS');
    const previous = await this.sessions.current(req);
    const result = await this.db.$transaction(async (tx) => {
      await this.sessions.lock(tx, user.id);
      const latest = await tx.user.findUnique({ where: { id: user.id } });
      if (!latest || latest.passwordHash !== user.passwordHash)
        fail(401, 'INVALID_CREDENTIALS');
      return this.sessions.create(tx, user.id, previous?.id);
    });
    return this.respond(result, res);
  }
  async refresh(req: Request, res: Response) {
    return this.respond(await this.sessions.rotate(req), res);
  }
  async logout(req: Request, res: Response) {
    const session = await this.sessions.current(req);
    if (session)
      await this.db.session.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    this.tokens.clear(res);
  }
  async me(userId: string) {
    return publicUser(
      await this.db.user.findUniqueOrThrow({ where: { id: userId } }),
    );
  }
  private async respond(
    result: Awaited<ReturnType<SessionService['create']>>,
    res: Response,
  ) {
    const { session, refreshToken } = result;
    const accessExpiresAt = new Date(
      Math.min(Date.now() + 900000, session.expiresAt.getTime()),
    );
    this.tokens.setCookie(
      res,
      'access',
      await this.tokens.access(session.userId, session.id, accessExpiresAt),
      accessExpiresAt,
    );
    this.tokens.setCookie(res, 'refresh', refreshToken, session.expiresAt);
    const csrf = this.tokens.csrf(session.id);
    this.tokens.setCookie(res, 'csrf', csrf.token, csrf.expiresAt);
    return {
      user: publicUser(session.user),
      csrfToken: csrf.token,
      accessExpiresAt,
      sessionExpiresAt: session.expiresAt,
    };
  }
}
