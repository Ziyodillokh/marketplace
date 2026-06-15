import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import type { BusinessType, Tenant } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import {
  InvalidInitDataError,
  verifyTelegramInitData,
} from '@/common/helpers/telegram-init-data';
import { BUSINESS_TYPE_OPTIONS } from './business-types';

export interface OnboardInput {
  shopName: string;
  ownerName: string;
  ownerPhone: string;
  businessType: BusinessType;
  logoUrl?: string;
}

export interface SellerTenantView {
  id: string;
  slug: string;
  shopName: string;
  ownerName: string;
  ownerPhone: string | null;
  businessType: BusinessType | null;
  logoUrl: string | null;
}

export interface SellerProfile {
  registered: boolean;
  tenant?: SellerTenantView;
}

@Injectable()
export class SellerOnboardingService {
  private readonly logger = new Logger(SellerOnboardingService.name);
  private readonly botToken: string;

  constructor(private readonly prisma: PrismaService, config: ConfigService) {
    this.botToken = config.get<string>('TELEGRAM_BOT_TOKEN') ?? '';
  }

  businessTypes() {
    return BUSINESS_TYPE_OPTIONS;
  }

  /** initData'ni tekshiradi va Telegram foydalanuvchini qaytaradi. */
  private verify(initData: string) {
    try {
      return verifyTelegramInitData(initData, this.botToken);
    } catch (err) {
      throw new UnauthorizedException(
        err instanceof InvalidInitDataError ? err.message : 'Telegram tekshiruvi xato',
      );
    }
  }

  private serialize(t: Tenant): SellerTenantView {
    return {
      id: t.id,
      slug: t.slug,
      shopName: t.shopName,
      ownerName: t.ownerName,
      ownerPhone: t.ownerPhone,
      businessType: t.businessType,
      logoUrl: t.logoUrl,
    };
  }

  /** Foydalanuvchi ro'yxatdan o'tganmi — bot formani yoki panelni ochishni hal qiladi. */
  async me(initData: string): Promise<SellerProfile> {
    const parsed = this.verify(initData);
    const tenant = await this.prisma.tenant.findUnique({
      where: { ownerTelegramId: BigInt(parsed.user.id) },
    });
    return tenant ? { registered: true, tenant: this.serialize(tenant) } : { registered: false };
  }

  /** Yangi do'kon yaratish (Telegram ID bo'yicha). Logo bo'lmasa null — storefront Sellio default'ni ko'rsatadi. */
  async onboard(initData: string, dto: OnboardInput): Promise<SellerProfile> {
    const parsed = this.verify(initData);
    const telegramId = BigInt(parsed.user.id);

    const existing = await this.prisma.tenant.findUnique({
      where: { ownerTelegramId: telegramId },
    });
    if (existing) {
      // Idempotent — allaqachon ro'yxatdan o'tgan
      return { registered: true, tenant: this.serialize(existing) };
    }

    const shopName = dto.shopName.trim();
    const ownerName = dto.ownerName.trim();
    const ownerPhone = dto.ownerPhone.trim();
    const slug = await this.generateUniqueSlug(shopName);
    // Admin.email majburiy va unique — Telegram sotuvchilar uchun sintetik email
    const syntheticEmail = `tg${parsed.user.id}@sellio.bot`;

    const tenant = await this.prisma.$transaction(async (tx) => {
      const t = await tx.tenant.create({
        data: {
          slug,
          shopName,
          ownerName,
          ownerPhone,
          ownerTelegramId: telegramId,
          businessType: dto.businessType,
          logoUrl: dto.logoUrl?.trim() || null,
          tariffPlan: 'FREE',
          status: 'ACTIVE',
        },
      });

      // Parolsiz admin — faqat Telegram orqali login qiladi
      await tx.admin.create({
        data: {
          email: syntheticEmail,
          fullName: ownerName,
          role: 'ADMIN',
          isActive: true,
          telegramId,
          tenantId: t.id,
        },
      });

      return t;
    });

    this.logger.log(
      `Seller onboard: ${shopName} (${slug}) · tg=${parsed.user.id} · ${dto.businessType}`,
    );
    return { registered: true, tenant: this.serialize(tenant) };
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 40)
      .replace(/^-|-$/g, '');

    const safeBase = base || 'shop';
    let slug = safeBase;
    let attempt = 1;

    while (await this.prisma.tenant.findUnique({ where: { slug } })) {
      attempt += 1;
      slug = `${safeBase}-${attempt}`;
      if (attempt > 50) {
        slug = `${safeBase}-${randomBytes(3).toString('hex')}`;
        break;
      }
    }
    return slug;
  }
}
