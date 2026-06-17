import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Post, Put, UseGuards } from '@nestjs/common';
import { IsBoolean, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { type Admin } from '@prisma/client';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { CurrentAdmin } from '../admin-auth/roles.guard';
import { ChannelPostsService } from './channel-posts.service';

class ChannelDto {
  @IsOptional() @IsString() @MaxLength(60) channelId?: string;
}

class CreatePostDto {
  @IsString() @MinLength(1) @MaxLength(3500) text!: string;
  @IsOptional() @IsString() @MaxLength(500) imageUrl?: string;
  @IsOptional() @IsBoolean() buyButton?: boolean;
  @IsOptional() @IsString() @MaxLength(60) buttonText?: string;
  @IsISO8601() scheduledAt!: string;
}

/** Sotuvchi o'z Telegram kanaliga e'lonlar joylaydi (rejalashtirilgan). */
@Controller('admin/channel-posts')
@UseGuards(AdminJwtGuard)
export class ChannelPostsController {
  constructor(private readonly service: ChannelPostsService) {}

  @Get('config')
  config(@CurrentAdmin() admin: Admin) {
    if (!admin.tenantId) throw new BadRequestException("Do'kon topilmadi");
    return this.service.config(admin.tenantId);
  }

  @Put('config')
  @HttpCode(200)
  setChannel(@CurrentAdmin() admin: Admin, @Body() dto: ChannelDto) {
    if (!admin.tenantId) throw new BadRequestException("Do'kon topilmadi");
    return this.service.setChannel(admin.tenantId, dto.channelId ?? '');
  }

  @Get()
  list(@CurrentAdmin() admin: Admin) {
    if (!admin.tenantId) throw new BadRequestException("Do'kon topilmadi");
    return this.service.list(admin.tenantId);
  }

  @Post()
  @HttpCode(200)
  create(@CurrentAdmin() admin: Admin, @Body() dto: CreatePostDto) {
    if (!admin.tenantId) throw new BadRequestException("Do'kon topilmadi");
    return this.service.create(admin.tenantId, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  remove(@CurrentAdmin() admin: Admin, @Param('id') id: string) {
    if (!admin.tenantId) throw new BadRequestException("Do'kon topilmadi");
    return this.service.remove(admin.tenantId, id);
  }
}
