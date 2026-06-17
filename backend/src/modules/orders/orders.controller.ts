import {
  Body,
  Controller,
  Get,
  Param,
  ParseFilePipeBuilder,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { OrderStatus, PaymentMethod, type User } from '@prisma/client';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';
import { CurrentLanguage, CurrentUser } from '@/common/decorators/current-user.decorator';
import { CurrentTenantId } from '@/common/decorators/tenant.decorator';
import type { Locale } from '@/common/helpers/localize';
import { OrdersService } from './orders.service';

class CreateOrderDto {
  @IsString() @MinLength(2) @MaxLength(80) receiverName!: string;
  @IsString() @Matches(/^\+?\d{9,15}$/) receiverPhone!: string;
  @IsString() @MinLength(3) @MaxLength(400) address!: string;
  @IsOptional() @Type(() => Number) @IsLatitude() latitude?: number;
  @IsOptional() @Type(() => Number) @IsLongitude() longitude?: number;
  @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsOptional() @IsString() promoCode?: string;
}

class ListOrdersDto {
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

@Controller('orders')
@UseGuards(TelegramAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(
    @CurrentUser() user: User,
    @Body() dto: CreateOrderDto,
    @CurrentTenantId() tenantId: string | null,
  ) {
    return this.orders.create(user.id, dto, tenantId);
  }

  @Get()
  list(@CurrentUser() user: User, @Query() q: ListOrdersDto, @CurrentLanguage() lang: Locale) {
    return this.orders.list(user.id, q, lang);
  }

  @Get('summary')
  summary(@CurrentUser() user: User) {
    return this.orders.summary(user.id);
  }

  @Get(':id')
  getById(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @CurrentLanguage() lang: Locale,
  ) {
    return this.orders.getById(id, user.id, lang);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.orders.cancel(id, user.id);
  }

  /** Karta o'tkazma to'lovi cheki — mijoz chek rasmini yuklaydi. */
  @Post(':id/receipt')
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } }),
  )
  uploadReceipt(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /image\/(png|jpe?g|webp)/ })
        .addMaxSizeValidator({ maxSize: 8 * 1024 * 1024 })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ) {
    return this.orders.uploadReceipt(id, user.id, file.buffer);
  }
}
