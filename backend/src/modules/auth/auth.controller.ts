import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiHeader,
  ApiCookieAuth,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto, RegisterDto } from './auth.dto.js';
import { AccessGuard, CurrentUser } from './access.guard.js';

@ApiTags('Authentication')
@ApiHeader({
  name: 'X-CSRF-Token',
  required: false,
  description:
    'Bắt buộc cùng Origin cho POST/PATCH/DELETE; lấy từ GET /auth/csrf.',
})
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Get('csrf')
  @ApiOperation({ summary: 'Lấy CSRF token và cookie HttpOnly' })
  csrf(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.csrf(req, res);
  }
  @Post('register')
  @ApiOperation({ summary: 'Đăng ký và tạo phiên 7 ngày' })
  register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.register(dto, req, res);
  }
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Đăng nhập bằng email và mật khẩu' })
  login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.login(dto, req, res);
  }
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Xoay refresh token, giữ hạn phiên tuyệt đối' })
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.refresh(req, res);
  }
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Thu hồi phiên hiện tại và xóa cookie' })
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.logout(req, res);
  }
  @Get('me')
  @UseGuards(AccessGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Lấy tài khoản của phiên đăng nhập' })
  me(@CurrentUser() id: string) {
    return this.auth.me(id);
  }
}
