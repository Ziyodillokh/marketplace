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

  /**
   * Telegram ID bo'yicha login (parolsiz) — onboarding qilingan sotuvchilar uchun.
   * Bir nechta do'kon bo'lsa — birinchisiga (eng eski) kiritamiz; panel ichida almashtiriladi.
   */
  async loginWithTelegram(
    telegramId: bigint,
    photoUrl?: string | null,
  ): Promise<{ admin: Admin; tokens: AuthTokens }> {
    // Profil rasmini yangilaymiz (shu telegramId ning barcha do'kon yozuvlarida)
    if (photoUrl) {
      await this.prisma.admin
        .updateMany({ where: { telegramId }, data: { photoUrl } })
        .catch(() => undefined);
    }
    const admin = await this.prisma.admin.findFirst({
      where: { telegramId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!admin) {
      throw new UnauthorizedException("Ro'yxatdan o'tilmagan");
    }
    const tokens = await this.issueTokens(admin);
    return { admin, tokens };
  }

  /**
   * Do'konni almashtirish — joriy egaga (telegramId) tegishli boshqa do'kon adminiga
   * yangi token beradi. Faqat o'z do'koniga o'tishi mumkin.
   */
  async switchStore(
    currentAdmin: Admin,
    tenantId: string,
  ): Promise<{ admin: Admin; tokens: AuthTokens }> {
    if (!currentAdmin.telegramId) {
      throw new UnauthorizedException("Do'kon almashtirish faqat Telegram sotuvchilar uchun");
    }
    const target = await this.prisma.admin.findFirst({
      where: { telegramId: currentAdmin.telegramId, tenantId, isActive: true },
    });
    if (!target) throw new UnauthorizedException("Do'kon topilmadi");
    const tokens = await this.issueTokens(target);
    return { admin: target, tokens };
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
