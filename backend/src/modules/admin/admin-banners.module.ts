import { Body, Controller, Delete, Get, Module, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { AdminRole } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { Roles, RolesGuard } from '../admin-auth/roles.guard';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

class UpsertBannerDto {
  @IsOptional() @IsString() placement?: string;
  @IsString() imageUrlUz!: string;
  @IsOptional() @IsString() imageUrlRu?: string;
  @IsOptional() @IsString() targetType?: string;
  @IsOptional() @IsString() targetValue?: string;
  @IsOptional() @IsInt() position?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() startsAt?: string;
  @IsOptional() @IsString() endsAt?: string;
}

@Controller('admin/banners')
@UseGuards(AdminJwtGuard, RolesGuard)
@Roles(AdminRole.SUPERADMIN, AdminRole.ADMIN)
class AdminBannersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query('placement') placement?: string) {
    return this.prisma.banner.findMany({
      where: placement ? { placement } : undefined,
      orderBy: [{ placement: 'asc' }, { position: 'asc' }],
    });
  }

  @Post()
  create(@Body() dto: UpsertBannerDto) {
    return this.prisma.banner.create({
      data: {
        placement: dto.placement ?? 'home',
        imageUrlUz: dto.imageUrlUz,
        imageUrlRu: dto.imageUrlRu ?? null,
        targetType: dto.targetType ?? 'none',
        targetValue: dto.targetValue ?? null,
        position: dto.position ?? 0,
        isActive: dto.isActive ?? true,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      },
    });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<UpsertBannerDto>) {
    return this.prisma.banner.update({
      where: { id },
      data: {
        placement: dto.placement,
        imageUrlUz: dto.imageUrlUz,
        imageUrlRu: dto.imageUrlRu,
        targetType: dto.targetType,
        targetValue: dto.targetValue,
        position: dto.position,
        isActive: dto.isActive,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.prisma.banner.delete({ where: { id } });
    return { ok: true };
  }
}

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminBannersController],
})
export class AdminBannersModule {}
