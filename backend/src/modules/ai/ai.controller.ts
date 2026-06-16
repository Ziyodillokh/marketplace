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
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /image\/(png|jpe?g|webp)/ })
        .addMaxSizeValidator({ maxSize: 8 * 1024 * 1024 })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ) {
    await this.assertQuota(admin.tenantId, AIOperation.IMAGE_ENHANCE, 'aiImageEnhance');
    const { buffer, model } = await this.openai.enhanceImage(file.buffer);
    const saved = await this.uploads.saveImage(buffer);
    await this.record(admin.tenantId, AIOperation.IMAGE_ENHANCE, model, { imagesCount: 1 });
    return { url: saved.url, thumbUrl: saved.thumbUrl };
  }
}
