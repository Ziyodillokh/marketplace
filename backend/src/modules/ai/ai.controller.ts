import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { AIOperation, type Admin } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { limitsFor, type TariffLimits } from '@/common/tariff';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { CurrentAdmin } from '../admin-auth/roles.guard';
import { UploadsService } from '../uploads/uploads.service';
import { OpenAiService } from './openai.service';

class AutofillDto {
  @IsOptional() @IsString() @MaxLength(200) hint?: string;
  @IsOptional() @IsString() @MaxLength(500) imageUrl?: string;
}

class EnhanceDto {
  @IsOptional() @IsString() @MaxLength(500) imageUrl?: string;
}

/** enhance-image uchun ruxsat etilgan manbalar: o'z uploads'imiz + Telegram fayl CDN. */
function isAllowedImageUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
  if (u.hostname === 'api.telegram.org' && u.pathname.startsWith('/file/')) return true;
  const own = [process.env.PUBLIC_UPLOADS_URL, process.env.APP_URL, process.env.WEBAPP_URL]
    .filter((v): v is string => Boolean(v))
    .map((v) => {
      try {
        return new URL(v).host;
      } catch {
        return '';
      }
    })
    .filter(Boolean);
  return own.includes(u.host) && u.pathname.startsWith('/uploads/');
}

@Controller('admin/ai')
@UseGuards(AdminJwtGuard)
export class AiController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openai: OpenAiService,
    private readonly uploads: UploadsService,
  ) {}

  /** Bu oyda shu operatsiya bo'yicha tarif limiti tugamaganini tekshiradi. */
  private async assertQuota(
    tenantId: string | null,
    operation: AIOperation,
    limitKey: keyof Pick<TariffLimits, 'aiAutofill' | 'aiImageEnhance'>,
  ): Promise<void> {
    if (!tenantId) return; // owner — cheklovsiz
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { tariffPlan: true },
    });
    const max = limitsFor(tenant?.tariffPlan ?? 'FREE')[limitKey];
    if (max < 0) return;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const used = await this.prisma.aICreditUsage.count({
      where: { tenantId, operation, createdAt: { gte: monthStart } },
    });
    if (used >= max) {
      throw new ForbiddenException({
        message: `Bu oygi AI limiti (${max}) tugadi. Tarifni yangilang.`,
        upgradeRequired: true,
      });
    }
  }

  private async record(
    tenantId: string | null,
    operation: AIOperation,
    model: string,
    extra: { inputTokens?: number; outputTokens?: number; imagesCount?: number },
  ): Promise<void> {
    if (!tenantId) return;
    await this.prisma.aICreditUsage
      .create({
        data: {
          tenantId,
          operation,
          model,
          inputTokens: extra.inputTokens ?? null,
          outputTokens: extra.outputTokens ?? null,
          imagesCount: extra.imagesCount ?? null,
          costUsd: 0,
          costUzs: 0,
        },
      })
      .catch(() => undefined);
  }

  /** Mahsulot rasmi/nomidan UZ/RU nom va tavsif yaratadi. */
  @Post('autofill')
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } }),
  )
  async autofill(
    @CurrentAdmin() admin: Admin,
    @Body() dto: AutofillDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /image\/(png|jpe?g|webp)/ })
        .build({ fileIsRequired: false }),
    )
    file?: Express.Multer.File,
  ) {
    if (!file && !dto.imageUrl?.trim() && !dto.hint?.trim()) {
      throw new BadRequestException('Rasm yoki nom kiriting');
    }
    await this.assertQuota(admin.tenantId, AIOperation.AUTO_FILL_TEXT, 'aiAutofill');
    // Yuklangan fayl bo'lsa data-url; bo'lmasa mavjud rasm URL'i (OpenAI o'zi o'qiydi)
    const image = file
      ? `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
      : dto.imageUrl?.trim() || null;
    const r = await this.openai.autofill(image, dto.hint?.trim() ?? '');
    await this.record(admin.tenantId, AIOperation.AUTO_FILL_TEXT, r.model, {
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
    });
    return {
      titleUz: r.titleUz,
      titleRu: r.titleRu,
      descriptionUz: r.descriptionUz,
      descriptionRu: r.descriptionRu,
    };
  }

  /** Mahsulot rasmini AI bilan yaxshilaydi — yangi rasm URL qaytaradi. */
  @Post('enhance-image')
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } }),
  )
  async enhance(
    @CurrentAdmin() admin: Admin,
    @Body() dto: EnhanceDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /image\/(png|jpe?g|webp)/ })
        .addMaxSizeValidator({ maxSize: 8 * 1024 * 1024 })
        .build({ fileIsRequired: false }),
    )
    file?: Express.Multer.File,
  ) {
    // Kvota — tashqi URL'ni yuklashdan OLDIN (aks holda limitsiz fetch).
    await this.assertQuota(admin.tenantId, AIOperation.IMAGE_ENHANCE, 'aiImageEnhance');
    let source: Buffer;
    if (file) {
      source = file.buffer;
    } else if (dto.imageUrl?.trim()) {
      const url = dto.imageUrl.trim();
      // SSRF: faqat o'zimizning /uploads va Telegram CDN — ichki tarmoq/metadata yo'q.
      if (!isAllowedImageUrl(url)) {
        throw new BadRequestException('Faqat yuklangan rasm yoki Telegram rasmi URL\'iga ruxsat');
      }
      const r = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15_000) });
      if (!r.ok) throw new BadRequestException('Rasmni yuklab bo\'lmadi');
      source = Buffer.from(await r.arrayBuffer());
    } else {
      throw new BadRequestException('Rasm kerak');
    }
    const { buffer, model } = await this.openai.enhanceImage(source);
    const saved = await this.uploads.saveImage(buffer);
    await this.record(admin.tenantId, AIOperation.IMAGE_ENHANCE, model, { imagesCount: 1 });
    return { url: saved.url, thumbUrl: saved.thumbUrl };
  }
}
