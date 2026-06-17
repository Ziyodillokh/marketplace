import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  ParseFilePipeBuilder,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TariffPlan, type Admin } from '@prisma/client';
import { InlineKeyboard } from 'grammy';
import { PrismaService } from '@/prisma/prisma.service';
import { checkBotToken } from '@/common/helpers/telegram-bot-token';
import { limitsFor, hasFeature } from '@/common/tariff';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { CurrentAdmin } from '../admin-auth/roles.guard';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';
import { TenantBotService } from '../telegram-bot/tenant-bot.service';
import { TenantScopeService } from '@/common/tenant-scope/tenant-scope.service';
import { PAYMENT_INFO } from '../public/payment-info';
import { buildPaymentCaption } from '../public/payment-caption';

class BotTokenDto {
  @IsString()
  @MaxLength(100)
  botToken!: string;
}

class UpgradeDto {
  @IsEnum(TariffPlan)
  tariffPlan!: TariffPlan;
}

class StoreInfoDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(40)  phone?: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MaxLength(120) workingHours?: string;
  @IsOptional() @IsString() @MaxLength(2000) about?: string;
}

class BrandingDto {
  @IsOptional() @IsString() @MaxLength(20) primaryColor?: string;
  @IsOptional() @IsString() @MaxLength(500) logoUrl?: string;
}

class SupportDto {
  @IsString() @MaxLength(2000) message!: string;
}

class CardPaymentDto {
  @IsOptional() @IsString() @MaxLength(40)  cardNumber?: string;
  @IsOptional() @IsString() @MaxLength(120) cardHolder?: string;
  @IsOptional() @IsString() @MaxLength(60)  channelId?: string;
}

class PaymentsDto {
  @IsOptional() @IsString() @MaxLength(100) paymeMerchantId?: string;
  @IsOptional() @IsString() @MaxLength(200) paymeKey?: string;
  @IsOptional() @IsString() @MaxLength(100) clickServiceId?: string;
  @IsOptional() @IsString() @MaxLength(100) clickMerchantId?: string;
  @IsOptional() @IsString() @MaxLength(100) clickMerchantUserId?: string;
  @IsOptional() @IsString() @MaxLength(200) clickSecretKey?: string;
}

/** Joriy admin o'z do'koni (tenant): bot token, tarif, limit, yangilash. */
@Controller('admin/store')
@UseGuards(AdminJwtGuard)
export class AdminStoreController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tgbot: TelegramBotService,
    private readonly tenantBot: TenantBotService,
    private readonly tenantScope: TenantScopeService,
  ) {}

  @Get()
  async myStore(@CurrentAdmin() admin: Admin) {
    if (!admin.tenantId) return { tenant: null };
    const t = await this.prisma.tenant.findUnique({ where: { id: admin.tenantId } });
    if (!t) return { tenant: null };

    const limits = limitsFor(t.tariffPlan);
    // Faqat shu sotuvchiga tegishli (o'z do'koni) sonlar
    const [products, categories, banners, customers] = await Promise.all([
      this.prisma.product.count({ where: { tenantId: t.id } }),
      this.prisma.category.count({ where: { tenantId: t.id } }),
      this.prisma.banner.count({ where: { tenantId: t.id } }),
      this.prisma.order
        .findMany({ where: { tenantId: t.id }, distinct: ['userId'], select: { userId: true } })
        .then((r) => r.length),
    ]);

    return {
      tenant: {
        id: t.id,
        shopName: t.shopName,
        slug: t.slug,
        businessType: t.businessType,
        logoUrl: t.logoUrl,
        primaryColor: t.primaryColor,
        tariffPlan: t.tariffPlan,
        pendingTariff: t.pendingTariff,
        botUsername: t.botUsername,
        hasBotToken: !!t.botToken,
        phone: t.ownerPhone,
        address: t.address,
        workingHours: t.workingHours,
        about: t.about,
        customersCount: customers,
        payme: {
          merchantId: t.paymeMerchantId ?? '',
          hasKey: !!t.paymeKey,
        },
        click: {
          serviceId: t.clickServiceId ?? '',
          merchantId: t.clickMerchantId ?? '',
          merchantUserId: t.clickMerchantUserId ?? '',
          hasSecret: !!t.clickSecretKey,
        },
        cardPayment: {
          cardNumber: t.manualCardNumber ?? '',
          cardHolder: t.manualCardHolder ?? '',
          channelId: t.manualPaymentChannelId ?? '',
        },
      },
      limits,
      usage: { products, categories, banners },
    };
  }

  /** Do'kon ma'lumotlari (nomi, telefon, manzil, ish vaqti, biz haqimizda). */
  @Put('info')
  @HttpCode(200)
  async updateInfo(@CurrentAdmin() admin: Admin, @Body() dto: StoreInfoDto) {
    if (!admin.tenantId) throw new BadRequestException("Do'kon topilmadi");
    const data: Record<string, string | null> = {};
    if (dto.name !== undefined) data.shopName = dto.name.trim();
    if (dto.phone !== undefined) data.ownerPhone = dto.phone.trim() || null;
    if (dto.address !== undefined) data.address = dto.address.trim() || null;
    if (dto.workingHours !== undefined) data.workingHours = dto.workingHours.trim() || null;
    if (dto.about !== undefined) data.about = dto.about.trim() || null;
    if (data.shopName === '') throw new BadRequestException("Do'kon nomi bo'sh bo'lmasin");
    const updated = await this.prisma.tenant.update({
      where: { id: admin.tenantId },
      data,
      select: { slug: true },
    });
    this.tenantScope.invalidate(updated.slug);
    return { ok: true };
  }

  /** Brending — maxsus rang va logo (Standart+ tariflarda). */
  @Put('branding')
  @HttpCode(200)
  async updateBranding(@CurrentAdmin() admin: Admin, @Body() dto: BrandingDto) {
    if (!admin.tenantId) throw new BadRequestException("Do'kon topilmadi");
    const t = await this.prisma.tenant.findUnique({
      where: { id: admin.tenantId },
      select: { tariffPlan: true },
    });
    if (!hasFeature(t?.tariffPlan ?? 'FREE', 'branding')) {
      throw new ForbiddenException({
        message: 'Maxsus brending Standart+ tariflarda mavjud. Tarifni yangilang.',
        upgradeRequired: true,
      });
    }
    const data: Record<string, string | null> = {};
    if (dto.primaryColor !== undefined) {
      const c = dto.primaryColor.trim();
      if (c && !/^#[0-9a-fA-F]{6}$/.test(c)) throw new BadRequestException("Rang #RRGGBB formatida bo'lsin");
      data.primaryColor = c || null;
    }
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl.trim() || null;
    await this.prisma.tenant.update({ where: { id: admin.tenantId }, data });
    return { ok: true };
  }

  /**
   * Qo'llab-quvvatlash — sotuvchi platformaga yordam so'rovi yuboradi.
   * Standart+ tariflarda so'rov "ustuvor" (priority) belgisi bilan boradi,
   * shunda qo'llab-quvvatlash jamoasi birinchi navbatda javob beradi.
   */
  @Post('support')
  @HttpCode(200)
  async sendSupport(@CurrentAdmin() admin: Admin, @Body() dto: SupportDto) {
    if (!admin.tenantId) throw new BadRequestException("Do'kon topilmadi");
    const msg = (dto.message ?? '').trim();
    if (msg.length < 5) throw new BadRequestException("Xabar juda qisqa (kamida 5 ta belgi)");

    const t = await this.prisma.tenant.findUnique({ where: { id: admin.tenantId } });
    if (!t) throw new BadRequestException("Do'kon topilmadi");

    const priority = hasFeature(t.tariffPlan, 'prioritySupport');
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const ownerName = t.ownerName || '—';
    const header = priority ? '🔴 <b>USTUVOR QO\'LLAB-QUVVATLASH</b>' : '🆘 <b>Qo\'llab-quvvatlash so\'rovi</b>';

    const caption =
      `${header}\n\n` +
      `🏪 Do'kon: <b>${esc(t.shopName)}</b> (${esc(t.slug)})\n` +
      `📦 Tarif: <b>${t.tariffPlan}</b>${priority ? ' ⭐' : ''}\n` +
      `👤 Egasi: ${esc(ownerName)}\n` +
      `📞 Telefon: ${esc(t.ownerPhone ?? '—')}\n` +
      `🆔 TG ID: <code>${t.ownerTelegramId ?? '—'}</code>\n` +
      (t.ownerUsername ? `🔗 @${esc(t.ownerUsername)}\n` : '') +
      (t.botUsername ? `🤖 Bot: @${esc(t.botUsername)}\n` : '') +
      `\n💬 <b>Xabar:</b>\n${esc(msg)}`;

    // Egasiga to'g'ridan-to'g'ri yozish uchun tugma (TG ID bo'lsa)
    const kb = t.ownerTelegramId
      ? new InlineKeyboard().url('✍️ Javob berish', `tg://user?id=${t.ownerTelegramId}`)
      : undefined;
    await this.tgbot.sendToSupportChat(caption, kb);
    return { ok: true, priority };
  }

  /** Onlayn to'lov (Payme/Click) merchant ma'lumotlari — Standart+ tariflarda. */
  @Put('payments')
  @HttpCode(200)
  async updatePayments(@CurrentAdmin() admin: Admin, @Body() dto: PaymentsDto) {
    if (!admin.tenantId) throw new BadRequestException("Do'kon topilmadi");
    const t = await this.prisma.tenant.findUnique({
      where: { id: admin.tenantId },
      select: { tariffPlan: true },
    });
    if (!hasFeature(t?.tariffPlan ?? 'FREE', 'onlinePayment')) {
      throw new ForbiddenException({
        message: "Onlayn to'lov Standart+ tariflarda mavjud. Tarifni yangilang.",
        upgradeRequired: true,
      });
    }
    const data: Record<string, string | null> = {};
    if (dto.paymeMerchantId !== undefined) data.paymeMerchantId = dto.paymeMerchantId.trim() || null;
    if (dto.paymeKey) data.paymeKey = dto.paymeKey.trim(); // faqat berilsa yangilanadi
    if (dto.clickServiceId !== undefined) data.clickServiceId = dto.clickServiceId.trim() || null;
    if (dto.clickMerchantId !== undefined) data.clickMerchantId = dto.clickMerchantId.trim() || null;
    if (dto.clickMerchantUserId !== undefined)
      data.clickMerchantUserId = dto.clickMerchantUserId.trim() || null;
    if (dto.clickSecretKey) data.clickSecretKey = dto.clickSecretKey.trim();
    await this.prisma.tenant.update({ where: { id: admin.tenantId }, data });
    return { ok: true };
  }

  /**
   * Karta o'tkazma to'lovi — karta raqami, egasi (ism familiya) va tasdiqlash kanali.
   * Mijoz chek yuklaganda chek shu kanalga boradi, sotuvchi tugma bilan tasdiqlaydi.
   * Barcha tariflarda mavjud (qo'lda o'tkazma).
   */
  @Put('card-payment')
  @HttpCode(200)
  async updateCardPayment(@CurrentAdmin() admin: Admin, @Body() dto: CardPaymentDto) {
    if (!admin.tenantId) throw new BadRequestException("Do'kon topilmadi");
    const data: Record<string, string | null> = {};
    if (dto.cardNumber !== undefined) {
      const digits = dto.cardNumber.replace(/\s/g, '');
      if (digits && !/^\d{12,19}$/.test(digits)) {
        throw new BadRequestException('Karta raqami noto\'g\'ri (12–19 raqam)');
      }
      // Chiroyli ko'rinish uchun 4 xonalik guruhlarga ajratamiz
      data.manualCardNumber = digits ? digits.replace(/(.{4})/g, '$1 ').trim() : null;
    }
    if (dto.cardHolder !== undefined) data.manualCardHolder = dto.cardHolder.trim() || null;
    if (dto.channelId !== undefined) {
      const ch = dto.channelId.trim();
      // -100… (kanal id) yoki @username formatlari qabul qilinadi
      if (ch && !/^(-100\d{6,}|@[A-Za-z]\w{3,})$/.test(ch)) {
        throw new BadRequestException("Kanal ID '-100...' yoki '@kanal' ko'rinishida bo'lsin");
      }
      data.manualPaymentChannelId = ch || null;
    }
    await this.prisma.tenant.update({ where: { id: admin.tenantId }, data });
    return { ok: true };
  }

  @Put('bot')
  @HttpCode(200)
  async setBot(@CurrentAdmin() admin: Admin, @Body() dto: BotTokenDto) {
    if (!admin.tenantId) throw new BadRequestException("Do'kon topilmadi");
    const check = await checkBotToken(dto.botToken);
    if (!check.ok) throw new BadRequestException(check.error ?? 'Token yaroqsiz');
    const token = dto.botToken.trim();
    const taken = await this.prisma.tenant.findFirst({
      where: { botToken: token, NOT: { id: admin.tenantId } },
    });
    if (taken) throw new ConflictException("Bu token boshqa do'konda ishlatilgan");

    // Eski tokenni saqlab qo'yamiz — yangisi muvaffaqiyatli ulanguncha
    // eski botning webhook'ini buzmaymiz. Yangi token o'rnatilgach,
    // eski bot webhook'ini o'chiramiz: aks holda eski bot yana
    // bizga update yuborishi mumkin (orphan webhook).
    const prev = await this.prisma.tenant.findUnique({
      where: { id: admin.tenantId },
      select: { botToken: true },
    });
    const oldToken = prev?.botToken;

    const updated = await this.prisma.tenant.update({
      where: { id: admin.tenantId },
      data: { botToken: token, botUsername: check.username ?? null },
      select: { slug: true },
    });
    this.tenantScope.invalidate(updated.slug);
    await this.tenantBot.configure(admin.tenantId).catch(() => undefined);

    if (oldToken && oldToken !== token) {
      await this.tenantBot.deleteWebhookForToken(oldToken).catch(() => undefined);
    }
    return { ok: true, username: check.username };
  }

  @Delete('bot')
  @HttpCode(200)
  async removeBot(@CurrentAdmin() admin: Admin) {
    if (!admin.tenantId) throw new BadRequestException("Do'kon topilmadi");
    const prev = await this.prisma.tenant.findUnique({
      where: { id: admin.tenantId },
      select: { botToken: true },
    });
    const updated = await this.prisma.tenant.update({
      where: { id: admin.tenantId },
      data: { botToken: null, botUsername: null },
      select: { slug: true },
    });
    this.tenantScope.invalidate(updated.slug);
    this.tenantBot.forget(admin.tenantId);
    if (prev?.botToken) {
      await this.tenantBot.deleteWebhookForToken(prev.botToken).catch(() => undefined);
    }
    return { ok: true };
  }

  /** Tarifni yangilash so'rovi — pendingTariff o'rnatadi, to'lov ma'lumotini qaytaradi. */
  @Post('upgrade')
  @HttpCode(200)
  async upgrade(@CurrentAdmin() admin: Admin, @Body() dto: UpgradeDto) {
    if (!admin.tenantId) throw new BadRequestException("Do'kon topilmadi");
    if (dto.tariffPlan === 'FREE') throw new BadRequestException("Free tarif uchun to'lov shart emas");
    await this.prisma.tenant.update({
      where: { id: admin.tenantId },
      data: { pendingTariff: dto.tariffPlan },
    });
    return { ok: true, payment: PAYMENT_INFO };
  }

  /** To'lov chekini yuklab, admin chatiga tasdiqlash xabarini yuboradi. */
  @Post('upgrade/receipt')
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } }),
  )
  async upgradeReceipt(
    @CurrentAdmin() admin: Admin,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /image\/(png|jpe?g|webp)/ })
        .addMaxSizeValidator({ maxSize: 8 * 1024 * 1024 })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ) {
    if (!admin.tenantId) throw new BadRequestException("Do'kon topilmadi");
    const t = await this.prisma.tenant.findUnique({ where: { id: admin.tenantId } });
    if (!t || !t.pendingTariff) throw new BadRequestException("To'lov kutilayotgan tarif yo'q");

    const caption = buildPaymentCaption(t, 'Tarif yangilash — tasdiqlash kerak');

    try {
      await this.tgbot.sendPaymentReceipt(file.buffer, caption, t.id);
    } catch {
      throw new BadRequestException("To'lovni yuborishda xatolik. Keyinroq urinib ko'ring.");
    }
    return { ok: true };
  }
}
