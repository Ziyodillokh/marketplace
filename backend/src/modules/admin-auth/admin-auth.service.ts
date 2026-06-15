import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtService } from './jwt.service';
import type { Admin } from '@prisma/client';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

@Injectable()
export class AdminAuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async login(email: string, password: string): Promise<{ admin: Admin; tokens: AuthTokens }> {
    const admin = await this.prisma.admin.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!admin || !admin.isActive) throw new UnauthorizedException('Invalid credentials');
    // Parolsiz (Telegram-only) adminlar email/parol bilan kira olmaydi
    if (!admin.passwordHash) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    const tokens = await this.issueTokens(admin);
    return { admin, tokens };
  }

  /** Telegram ID bo'yicha login (parolsiz) — onboarding qilingan sotuvchilar uchun. */
  async loginWithTelegram(telegramId: bigint): Promise<{ admin: Admin; tokens: AuthTokens }> {
    const admin = await this.prisma.admin.findUnique({ where: { telegramId } });
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException("Ro'yxatdan o'tilmagan");
    }
    const tokens = await this.issueTokens(admin);
    return { admin, tokens };
  }

  async issueTokens(admin: Admin): Promise<AuthTokens> {
    const jti = randomUUID();
    const accessToken = this.jwt.signAccess({ sub: admin.id, email: admin.email, role: admin.role });
    const refreshToken = this.jwt.signRefresh({ sub: admin.id, jti });
    const ttl = this.jwt.refreshTtlMs();
    const expiresAt = new Date(Date.now() + ttl);
    await this.prisma.refreshToken.create({
      data: {
        adminId: admin.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });
    return { accessToken, refreshToken, expiresAt };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload;
    try {
      payload = this.jwt.verifyRefresh(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }
    // Rotation: revoke current, issue new
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const admin = await this.prisma.admin.findUnique({ where: { id: payload.sub } });
    if (!admin || !admin.isActive) throw new UnauthorizedException('Admin not found');
    return this.issueTokens(admin);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getById(id: string): Promise<Admin | null> {
    return this.prisma.admin.findUnique({ where: { id } });
  }
}
