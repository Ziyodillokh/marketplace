import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
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
import { PrismaService } from '@/prisma/prisma.service';
import { checkBotToken } from '@/common/helpers/telegram-bot-token';
import { limitsFor } from '@/common/tariff';
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
        tariffPlan: t.tariffPlan,
        pendingTariff: t.pendingTariff,
        botUsername: t.botUsername,
        hasBotToken: !!t.botToken,
        phone: t.ownerPhone,
        address: t.address,
        workingHours: t.workingHours,
        about: t.about,
        customersCount: customers,
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
    const updated = await this.prisma.tenant.update({
      where: { id: admin.tenantId },
      data: { botToken: token, botUsername: check.username ?? null },
      select: { slug: true },
    });
    this.tenantScope.invalidate(updated.slug);
    await this.tenantBot.configure(admin.tenantId).catch(() => undefined);
    return { ok: true, username: check.username };
  }

  @Delete('bot')
  @HttpCode(200)
  async removeBot(@CurrentAdmin() admin: Admin) {
    if (!admin.tenantId) throw new BadRequestException("Do'kon topilmadi");
    const updated = await this.prisma.tenant.update({
      where: { id: admin.tenantId },
      data: { botToken: null, botUsername: null },
      select: { slug: true },
    });
    this.tenantScope.invalidate(updated.slug);
    this.tenantBot.forget(admin.tenantId);
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
