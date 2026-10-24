import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { RateLimitService } from '../../common/rate-limit.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';
import { SessionService } from './session.service.js';
import { AccessGuard } from './access.guard.js';
import { SecurityGuard } from './security.guard.js';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    SessionService,
    AccessGuard,
    RateLimitService,
    { provide: APP_GUARD, useClass: SecurityGuard },
  ],
  exports: [PasswordService, TokenService, SessionService, AccessGuard],
})
export class AuthModule {}
