import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Put,
  UseGuards,
} from '@nestjs/common';
import { IsString, MaxLength } from 'class-validator';
import type { Admin } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { checkBotToken } from '@/common/helpers/telegram-bot-token';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { CurrentAdmin } from '../admin-auth/roles.guard';

class BotTokenDto {
  @IsString()
  @MaxLength(100)
  botToken!: string;
}

/** Joriy admin o'z do'koni (tenant) sozlamalarini boshqaradi — bot token va h.k. */
@Controller('admin/store')
@UseGuards(AdminJwtGuard)
export class AdminStoreController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async myStore(@CurrentAdmin() admin: Admin) {
    if (!admin.tenantId) return { tenant: null };
    const t = await this.prisma.tenant.findUnique({ where: { id: admin.tenantId } });
    if (!t) return { tenant: null };
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
      },
    };
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
    await this.prisma.tenant.update({
      where: { id: admin.tenantId },
      data: { botToken: token, botUsername: check.username ?? null },
    });
    return { ok: true, username: check.username };
  }

  @Delete('bot')
  @HttpCode(200)
  async removeBot(@CurrentAdmin() admin: Admin) {
    if (!admin.tenantId) throw new BadRequestException("Do'kon topilmadi");
    await this.prisma.tenant.update({
      where: { id: admin.tenantId },
      data: { botToken: null, botUsername: null },
    });
    return { ok: true };
  }
}
