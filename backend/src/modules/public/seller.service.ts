import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import type { BusinessType, TariffPlan, Tenant } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import {
  InvalidInitDataError,
  verifyTelegramInitData,
} from '@/common/helpers/telegram-init-data';
import { BUSINESS_TYPE_OPTIONS } from './business-types';
import { TARIFFS } from './tariffs';
import { PAYMENT_INFO } from './payment-info';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';

export interface OnboardInput {
  shopName: string;
  ownerName: string;
  ownerPhone: string;
  businessType: BusinessType;
  tariffPlan: TariffPlan;
  logoUrl?: string;
  botToken?: string;
}

export interface BotCheckResult {
  ok: boolean;
  username?: string;
  firstName?: string;
  error?: string;
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly tgbot: TelegramBotService,
    config: ConfigService,
  ) {
    this.botToken = config.get<string>('TELEGRAM_BOT_TOKEN') ?? '';
  }

  /** To'lov chekini yuklab, admin chatiga tasdiqlash xabarini yuboradi. */
  async submitPaymentReceipt(initData: string, receipt: Buffer): Promise<{ ok: true }> {
    const parsed = this.verify(initData);
    const tenant = await this.prisma.tenant.findUnique({
      where: { ownerTelegramId: BigInt(parsed.user.id) },
    });
    if (!tenant) throw new BadRequestException("Do'kon topilmadi");
    if (!tenant.pendingTariff) {
      throw new BadRequestException("To'lov kutilayotgan tarif yo'q");
    }

    const tariff = TARIFFS.find((t) => t.value === tenant.pendingTariff);
    const username = parsed.user.username ? `@${parsed.user.username}` : '-';
    const caption =
      `💳 <b>Yangi to'lov — tasdiqlash kerak</b>\n\n` +
      `👤 Ism: ${tenant.ownerName}\n` +
      `📞 Telefon: ${tenant.ownerPhone ?? '-'}\n` +
      `🆔 TG ID: <code>${parsed.user.id}</code>\n` +
      `👤 Username: ${username}\n` +
      `🏪 Do'kon: ${tenant.shopName}\n` +
      `🤖 Bot: ${tenant.botUsername ? '@' + tenant.botUsername : '-'}\n` +
      `💎 Tarif: <b>${tariff?.label ?? tenant.pendingTariff}</b>` +
      (tariff ? ` — ${tariff.priceMonthly.toLocaleString('ru-RU')} so'm/oy` : '');

    try {
      await this.tgbot.sendPaymentReceipt(receipt, caption, tenant.id);
    } catch (err) {
      this.logger.error(`Payment receipt send failed: ${(err as Error).message}`);
      throw new BadRequestException(
        "To'lovni yuborishda xatolik. Iltimos keyinroq urinib ko'ring yoki administrator bilan bog'laning.",
      );
    }
    return { ok: true };
  }

  businessTypes() {
    return BUSINESS_TYPE_OPTIONS;
  }

  tariffs() {
    return TARIFFS;
  }

  paymentInfo() {
    return PAYMENT_INFO;
  }

  /** Sotuvchi bot tokenini Telegram getMe orqali tekshiradi. */
  async validateBotToken(rawToken: string): Promise<BotCheckResult> {
    const token = rawToken.trim();
    if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(token)) {
      return { ok: false, error: "Token formati noto'g'ri" };
    }
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = (await res.json()) as {
        ok: boolean;
        result?: { username?: string; first_name?: string };
      };
      if (!data.ok || !data.result) {
        return { ok: false, error: 'Token yaroqsiz — @BotFather dan tekshiring' };
      }
      return { ok: true, username: data.result.username, firstName: data.result.first_name };
    } catch {
      return { ok: false, error: "Telegram bilan bog'lanib bo'lmadi" };
    }
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

    // Bot token (ixtiyoriy) — berilgan bo'lsa tekshiramiz va band emasligini ko'ramiz
    let botToken: string | null = null;
    let botUsername: string | null = null;
    if (dto.botToken?.trim()) {
      const check = await this.validateBotToken(dto.botToken);
      if (!check.ok) {
        throw new BadRequestException(check.error ?? "Bot token yaroqsiz");
      }
      botToken = dto.botToken.trim();
      botUsername = check.username ?? null;
      const taken = await this.prisma.tenant.findUnique({ where: { botToken } });
      if (taken) {
        throw new ConflictException('Bu bot token boshqa do\'konda ishlatilgan');
      }
    }

    // Pulli tarif tanlansa — faol tarif FREE bo'lib turadi, so'ralgan tarif
    // to'lov tasdiqlanguncha pendingTariff sifatida saqlanadi.
    const isPaid = dto.tariffPlan !== 'FREE';

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
          pendingTariff: isPaid ? dto.tariffPlan : null,
          botToken,
          botUsername,
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
      `Seller onboard: ${shopName} (${slug}) · tg=${parsed.user.id} · ${dto.businessType} · ${dto.tariffPlan}${botUsername ? ` · @${botUsername}` : ''}`,
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
