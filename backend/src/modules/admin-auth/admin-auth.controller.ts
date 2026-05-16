import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsEmail, IsString, MinLength } from 'class-validator';
import type { Request, Response } from 'express';
import type { Admin } from '@prisma/client';
import { AdminAuthService } from './admin-auth.service';
import { AdminJwtGuard } from './admin-jwt.guard';
import { CurrentAdmin } from './roles.guard';

class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(6) password!: string;
}

interface CookieRequest extends Request {
  cookies: Record<string, string | undefined>;
}

function serialize(a: Admin) {
  return {
    id: a.id,
    email: a.email,
    fullName: a.fullName,
    role: a.role,
    isActive: a.isActive,
    createdAt: a.createdAt,
  };
}

@Controller('admin/auth')
export class AdminAuthController {
  private readonly isProd: boolean;
  constructor(private readonly auth: AdminAuthService, config: ConfigService) {
    this.isProd = config.get('NODE_ENV') === 'production';
  }

  private setCookies(res: Response, accessToken: string, refreshToken: string, expiresAt: Date) {
    const common = {
      httpOnly: true,
      secure: this.isProd,
      sameSite: this.isProd ? ('none' as const) : ('lax' as const),
      path: '/',
    };
    res.cookie('access_token', accessToken, { ...common, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, {
      ...common,
      expires: expiresAt,
      path: '/api/admin/auth',
    });
  }

  private clearCookies(res: Response) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/api/admin/auth' });
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { admin, tokens } = await this.auth.login(dto.email, dto.password);
    this.setCookies(res, tokens.accessToken, tokens.refreshToken, tokens.expiresAt);
    return { admin: serialize(admin), accessToken: tokens.accessToken };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: CookieRequest, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken) {
      this.clearCookies(res);
      return { error: 'no refresh token' };
    }
    const tokens = await this.auth.refresh(refreshToken);
    this.setCookies(res, tokens.accessToken, tokens.refreshToken, tokens.expiresAt);
    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: CookieRequest, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies['refresh_token'];
    await this.auth.logout(refreshToken);
    this.clearCookies(res);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AdminJwtGuard)
  me(@CurrentAdmin() admin: Admin) {
    return serialize(admin);
  }
}
