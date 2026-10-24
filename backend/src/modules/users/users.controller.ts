import {
  Body,
  Controller,
  Patch,
  HttpCode,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiCookieAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { AccessGuard, CurrentUser } from '../auth/access.guard.js';
import { TokenService } from '../auth/token.service.js';
import { UsersService } from './users.service.js';
import { UpdateUserDto, PasswordDto } from './users.dto.js';
@ApiTags('Users')
@ApiCookieAuth()
@UseGuards(AccessGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly tokens: TokenService,
  ) {}
  @Patch('me') update(@CurrentUser() id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }
  @Patch('me/password')
  @HttpCode(204)
  async password(
    @CurrentUser() id: string,
    @Body() dto: PasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.users.password(id, dto);
    this.tokens.clear(res);
  }
}
