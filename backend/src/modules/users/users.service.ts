import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { fail } from '../../common/api-error.js';
import { publicUser } from '../auth/auth.service.js';
import { PasswordService } from '../auth/password.service.js';
import { SessionService } from '../auth/session.service.js';
import type { UpdateUserDto, PasswordDto } from './users.dto.js';
@Injectable()
export class UsersService {
  constructor(
    private readonly db: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
  ) {}
  async update(id: string, dto: UpdateUserDto) {
    if (
      dto.displayName === undefined &&
      dto.preferredTemperatureUnit === undefined
    )
      fail(400, 'VALIDATION_ERROR');
    return publicUser(await this.db.user.update({ where: { id }, data: dto }));
  }
  async password(id: string, dto: PasswordDto) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id } });
    if (!(await this.passwords.verify(user.passwordHash, dto.currentPassword)))
      fail(400, 'CURRENT_PASSWORD_INVALID');
    if (dto.currentPassword === dto.newPassword)
      fail(400, 'PASSWORD_UNCHANGED');
    const passwordHash = await this.passwords.hash(dto.newPassword);
    await this.db.$transaction(async (tx) => {
      await this.sessions.lock(tx, id);
      const updated = await tx.user.updateMany({
        where: { id, passwordHash: user.passwordHash },
        data: { passwordHash },
      });
      if (updated.count !== 1) fail(400, 'CURRENT_PASSWORD_INVALID');
      await tx.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
  }
}
