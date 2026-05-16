import { Body, Controller, Delete, Get, Module, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { AdminRole } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { Roles, RolesGuard } from '../admin-auth/roles.guard';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

class UpsertRuleDto {
  @IsOptional() @IsString() sourceProductId?: string | null;
  @IsOptional() @IsString() sourceCategoryId?: string | null;
  @IsOptional() @IsString() targetProductId?: string | null;
  @IsOptional() @IsString() targetCategoryId?: string | null;
  @IsOptional() @IsInt() position?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@Controller('admin/related-rules')
@UseGuards(AdminJwtGuard, RolesGuard)
@Roles(AdminRole.SUPERADMIN, AdminRole.ADMIN)
class AdminRelatedController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query('sourceProductId') sourceProductId?: string, @Query('sourceCategoryId') sourceCategoryId?: string) {
    return this.prisma.relatedRule.findMany({
      where: {
        ...(sourceProductId ? { sourceProductId } : {}),
        ...(sourceCategoryId ? { sourceCategoryId } : {}),
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      include: {
        sourceProduct: { select: { id: true, titleUz: true } },
        sourceCategory: { select: { id: true, titleUz: true } },
        targetProduct: { select: { id: true, titleUz: true } },
        targetCategory: { select: { id: true, titleUz: true } },
      },
    });
  }

  @Post()
  create(@Body() dto: UpsertRuleDto) {
    return this.prisma.relatedRule.create({
      data: {
        sourceProductId: dto.sourceProductId ?? null,
        sourceCategoryId: dto.sourceCategoryId ?? null,
        targetProductId: dto.targetProductId ?? null,
        targetCategoryId: dto.targetCategoryId ?? null,
        position: dto.position ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<UpsertRuleDto>) {
    return this.prisma.relatedRule.update({
      where: { id },
      data: {
        position: dto.position,
        isActive: dto.isActive,
      },
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.prisma.relatedRule.delete({ where: { id } });
    return { ok: true };
  }
}

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminRelatedController],
})
export class AdminRelatedModule {}
