import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { BusinessType } from '@prisma/client';
import { SellerOnboardingService } from './seller.service';
import { UploadsService } from '../uploads/uploads.service';

class InitDataDto {
  @IsString()
  @MaxLength(4096)
  initData!: string;
}

class OnboardDto {
  @IsString()
  @MaxLength(4096)
  initData!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  shopName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  ownerName!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(30)
  ownerPhone!: string;

  @IsEnum(BusinessType)
  businessType!: BusinessType;

  @IsString()
  @MaxLength(500)
  logoUrl?: string;
}

@Controller('public/seller')
export class SellerController {
  constructor(
    private readonly service: SellerOnboardingService,
    private readonly uploads: UploadsService,
  ) {}

  /** Biznes turlari ro'yxati (select uchun). */
  @Get('business-types')
  businessTypes() {
    return this.service.businessTypes();
  }

  /** Ro'yxatdan o'tganmi tekshirish. */
  @Post('me')
  @HttpCode(200)
  me(@Body() dto: InitDataDto) {
    return this.service.me(dto.initData);
  }

  /** Yangi do'kon yaratish. */
  @Post('onboard')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60 * 60 * 1000 } }) // 10/soat/IP
  onboard(@Body() dto: OnboardDto) {
    return this.service.onboard(dto.initData, {
      shopName: dto.shopName,
      ownerName: dto.ownerName,
      ownerPhone: dto.ownerPhone,
      businessType: dto.businessType,
      logoUrl: dto.logoUrl,
    });
  }

  /** Logo yuklash (ixtiyoriy) — onboarding'dan oldin. URL qaytaradi. */
  @Post('logo')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60 * 60 * 1000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async logo(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /image\/(png|jpe?g|webp)/ })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Rasm fayli kerak');
    const saved = await this.uploads.saveImage(file.buffer);
    return { url: saved.url, thumbUrl: saved.thumbUrl };
  }
}
