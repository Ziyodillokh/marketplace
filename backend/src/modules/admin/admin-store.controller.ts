import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
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
import { randomBytes } from 'crypto';
import { AdminRole, BusinessType, TariffPlan, type Admin } from '@prisma/client';
import { InlineKeyboard } from 'grammy';
import { PrismaService } from '@/prisma/prisma.service';
import { checkBotToken } from '@/common/helpers/telegram-bot-token';
import { limitsFor, hasFeature } from '@/common/tariff';
import { BOSS_ROLES } from '@/common/role-groups';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { CurrentAdmin, Roles, RolesGuard } from '../admin-auth/roles.guard';
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

class NewStoreDto {
  @IsString() @MaxLength(120) shopName!: string;
  @IsOptional() @IsEnum(BusinessType) businessType?: BusinessType;
  @IsOptional() @IsString() @MaxLength(500) logoUrl?: string;
  @IsOptional() @IsString() @MaxLength(100) botToken?: string;
}

class TeamMemberDto {
  @IsString() @MaxLength(20) telegramId!: string;
  @IsString() @MaxLength(80) fullName!: string;
  @IsEnum(AdminRole) role!: AdminRole;
}

class TeamRoleDto {
  @IsEnum(AdminRole) role!: AdminRole;
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
@UseGuards(AdminJwtGuard, RolesGuard)
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

  /**
   * Foydalanuvchi kira oladigan barcha do'konlar (egasi yoki xodimi bo'lgan) +
   * yangi do'kon ochish mumkinmi (faqat o'zi egasi bo'lgan do'konlar bo'yicha).
   */
  @Get('my-stores')
  async myStores(@CurrentAdmin() admin: Admin) {
    if (!admin.telegramId) {
      return { stores: [], current: admin.tenantId, canAdd: false, allowed: 1 };
    }
    // Foydalanuvchining barcha admin yozuvlari → kira oladigan do'konlari
    const rows = await this.prisma.admin.findMany({
      where: { telegramId: admin.telegramId, isActive: true, tenantId: { not: null } },
      orderBy: { createdAt: 'asc' },
      select: { role: true, tenant: { select: { id: true, shopName: true, slug: true, tariffPlan: true, logoUrl: true, ownerTelegramId: true } } },
    });
    const stores = rows
      .filter((r) => r.tenant)
      .map((r) => ({
        id: r.tenant!.id,
        shopName: r.tenant!.shopName,
        slug: r.tenant!.slug,
        tariffPlan: r.tenant!.tariffPlan,
        logoUrl: r.tenant!.logoUrl,
        role: r.role,
        isOwner: r.tenant!.ownerTelegramId === admin.telegramId,
        isCurrent: r.tenant!.id === admin.tenantId,
      }));
    // Yangi do'kon ochish — faqat o'zi EGASI bo'lgan do'konlar bo'yicha hisoblanadi
    const owned = stores.filter((s) => s.isOwner);
    const allowed = Math.max(1, ...owned.map((s) => limitsFor(s.tariffPlan).maxStores));
    return {
      stores,
      current: admin.tenantId,
      canAdd: owned.length < allowed,
      allowed,
    };
  }

  // ───── Jamoa (do'kon xodimlari: Boss / Creator / Moderator) ─────

  /** Joriy do'kon xodimlari ro'yxati. */
  @Get('team')
  @Roles(...BOSS_ROLES)
  async team(@CurrentAdmin() admin: Admin) {
    if (!admin.tenantId) throw new BadRequestException("Do'kon topilmadi");
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: admin.tenantId },
      select: { ownerTelegramId: true },
    });
    const members = await this.prisma.admin.findMany({
      where: { tenantId: admin.tenantId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, fullName: true, role: true, telegramId: true, isActive: true },
    });
    return members.map((m) => ({
      id: m.id,
      fullName: m.fullName,
      role: m.role,
      telegramId: m.telegramId ? m.telegramId.toString() : null,
      isActive: m.isActive,
      isOwner: !!tenant?.ownerTelegramId && m.telegramId === tenant.ownerTelegramId,
      isSelf: m.id === admin.id,
    }));
  }

  /** Xodim qo'shish — Telegram ID + ism + rol (CREATOR yoki MODERATOR). */
  @Post('team')
  @Roles(...BOSS_ROLES)
  @HttpCode(200)
  async addMember(@CurrentAdmin() admin: Admin, @Body() dto: TeamMemberDto) {
    if (!admin.tenantId) throw new BadRequestException("Do'kon topilmadi");
    const role = dto.role;
    if (role !== AdminRole.CREATOR && role !== AdminRole.MODERATOR) {
      throw new BadRequestException('Rol faqat CREATOR yoki MODERATOR bo\'lishi mumkin');
    }
    const tgId = (dto.telegramId ?? '').trim();
    if (!/^\d{5,15}$/.test(tgId)) throw new BadRequestException("Telegram ID noto'g'ri (faqat raqam)");
    const telegramId = BigInt(tgId);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: admin.tenantId },
      select: { slug: true },
    });
    if (!tenant) throw new BadRequestException("Do'kon topilmadi");

    const exists = await this.prisma.admin.findFirst({
      where: { tenantId: admin.tenantId, telegramId },
    });
    if (exists) throw new ConflictException('Bu foydalanuvchi allaqachon jamoada');

    await this.prisma.admin.create({
      data: {
        email: `tg${tgId}.${tenant.slug}@sellio.bot`,
        fullName: dto.fullName.trim() || `Xodim ${tgId.slice(-4)}`,
        role,
        isActive: true,
        telegramId,
        tenantId: admin.tenantId,
      },
    });
    return { ok: true };
  }

  /** Xodim rolini o'zgartirish. */
  @Put('team/:id')
  @Roles(...BOSS_ROLES)
  @HttpCode(200)
  async updateMember(@CurrentAdmin() admin: Admin, @Param('id') id: string, @Body() dto: TeamRoleDto) {
    if (!admin.tenantId) throw new BadRequestException("Do'kon topilmadi");
    if (dto.role !== AdminRole.CREATOR && dto.role !== AdminRole.MODERATOR) {
      throw new BadRequestException('Rol faqat CREATOR yoki MODERATOR bo\'lishi mumkin');
    }
    const member = await this.prisma.admin.findFirst({ where: { id, tenantId: admin.tenantId } });
    if (!member) throw new BadRequestException('Xodim topilmadi');
    if (member.id === admin.id) throw new BadRequestException("O'z rolingizni o'zgartira olmaysiz");
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: admin.tenantId },
      select: { ownerTelegramId: true },
    });
    if (tenant?.ownerTelegramId && member.telegramId === tenant.ownerTelegramId) {
      throw new BadRequestException("Do'kon egasining rolini o'zgartirib bo'lmaydi");
    }
    await this.prisma.admin.update({ where: { id }, data: { role: dto.role } });
    return { ok: true };
  }

  /** Xodimni jamoadan chiqarish. */
  @Delete('team/:id')
  @Roles(...BOSS_ROLES)
  @HttpCode(200)
  async removeMember(@CurrentAdmin() admin: Admin, @Param('id') id: string) {
    if (!admin.tenantId) throw new BadRequestException("Do'kon topilmadi");
    const member = await this.prisma.admin.findFirst({ where: { id, tenantId: admin.tenantId } });
    if (!member) throw new BadRequestException('Xodim topilmadi');
    if (member.id === admin.id) throw new BadRequestException("O'zingizni chiqara olmaysiz");
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: admin.tenantId },
      select: { ownerTelegramId: true },
    });
    if (tenant?.ownerTelegramId && member.telegramId === tenant.ownerTelegramId) {
      throw new BadRequestException("Do'kon egasini chiqarib bo'lmaydi");
    }
    await this.prisma.admin.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Yangi (qo'shimcha) do'kon ochish — bir egada bir nechta do'kon.
   * Eng yuqori tarif maxStores soniga qadar ruxsat (Premium = 2).
   * Yangi do'kon FREE tarifda ochiladi (keyin alohida yangilash mumkin).
   */
  @Post('new')
  @Roles(...BOSS_ROLES)
  @HttpCode(200)
  async createStore(@CurrentAdmin() admin: Admin, @Body() dto: NewStoreDto) {
    if (!admin.tenantId || !admin.telegramId) {
      throw new BadRequestException("Faqat Telegram orqali ro'yxatdan o'tgan sotuvchilar uchun");
    }
    const mine = await this.prisma.tenant.findMany({
      where: { ownerTelegramId: admin.telegramId },
    });
    const allowed = Math.max(1, ...mine.map((t) => limitsFor(t.tariffPlan).maxStores));
    if (mine.length >= allowed) {
      throw new ForbiddenException({
        message: `Joriy tarifda ${allowed} ta do'kon mumkin. Ko'proq do'kon uchun Premium tarifga o'ting.`,
        upgradeRequired: true,
      });
    }

    const shopName = dto.shopName.trim();
    if (shopName.length < 2) throw new BadRequestException("Do'kon nomi juda qisqa");
    const owner = mine.find((t) => t.id === admin.tenantId) ?? mine[0];

    let botToken: string | null = null;
    let botUsername: string | null = null;
    if (dto.botToken?.trim()) {
      const check = await checkBotToken(dto.botToken);
      if (!check.ok) throw new BadRequestException(check.error ?? 'Bot token yaroqsiz');
      botToken = dto.botToken.trim();
      botUsername = check.username ?? null;
      const taken = await this.prisma.tenant.findFirst({ where: { botToken } });
      if (taken) throw new ConflictException("Bu bot token boshqa do'konda ishlatilgan");
    }

    const slug = await this.uniqueSlug(shopName);
    const created = await this.prisma.$transaction(async (tx) => {
      const t = await tx.tenant.create({
        data: {
          slug,
          shopName,
          ownerName: owner.ownerName,
          ownerPhone: owner.ownerPhone,
          ownerTelegramId: admin.telegramId,
          ownerUsername: owner.ownerUsername,
          businessType: dto.businessType ?? owner.businessType,
          logoUrl: dto.logoUrl?.trim() || null,
          tariffPlan: 'FREE',
          botToken,
          botUsername,
          status: 'ACTIVE',
        },
      });
      await tx.admin.create({
        data: {
          email: `tg${admin.telegramId}.${slug}@sellio.bot`,
          fullName: owner.ownerName,
          role: 'ADMIN',
          isActive: true,
          telegramId: admin.telegramId,
          tenantId: t.id,
        },
      });
      return t;
    });

    if (botToken) await this.tenantBot.configure(created.id).catch(() => undefined);
    return { ok: true, tenantId: created.id };
  }

  /** Noyob slug yaratadi (do'kon nomidan). */
  private async uniqueSlug(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/gi, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 40)
        .replace(/^-|-$/g, '') || 'shop';
    let slug = base;
    let attempt = 1;
    while (await this.prisma.tenant.findUnique({ where: { slug } })) {
      attempt += 1;
      slug = `${base}-${attempt}`;
      if (attempt > 50) {
        slug = `${base}-${randomBytes(3).toString('hex')}`;
        break;
      }
    }
    return slug;
  }

  /** Do'kon ma'lumotlari (nomi, telefon, manzil, ish vaqti, biz haqimizda). */
  @Put('info')
  @Roles(...BOSS_ROLES)
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
  @Roles(...BOSS_ROLES)
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
  @Roles(...BOSS_ROLES)
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
  @Roles(...BOSS_ROLES)
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
  @Roles(...BOSS_ROLES)
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
  @Roles(...BOSS_ROLES)
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
  @Roles(...BOSS_ROLES)
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
  @Roles(...BOSS_ROLES)
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
