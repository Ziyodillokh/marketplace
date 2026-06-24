import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { AdminRole, Prisma, type Admin } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { CurrentAdmin, Roles, RolesGuard } from '../admin-auth/roles.guard';
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

  /** Referenced product/category joriy do'konga (yoki global kategoriyaga) tegishliligini tekshiradi. */
  private async assertOwned(
    tenantId: string | null,
    ids: { sourceProductId?: string | null; sourceCategoryId?: string | null; targetProductId?: string | null; targetCategoryId?: string | null },
  ): Promise<void> {
    if (!tenantId) return; // platforma egasi — cheklovsiz
    const productIds = [ids.sourceProductId, ids.targetProductId].filter((x): x is string => !!x);
    const categoryIds = [ids.sourceCategoryId, ids.targetCategoryId].filter((x): x is string => !!x);
    if (productIds.length) {
      const ok = await this.prisma.product.count({ where: { id: { in: productIds }, tenantId } });
      if (ok !== productIds.length) {
        throw new ForbiddenException('Mahsulot sizning do\'koningizga tegishli emas');
      }
    }
    if (categoryIds.length) {
      // Kategoriya do'kon'niki yoki global (tenantId null — umumiy taglik) bo'lishi mumkin
      const ok = await this.prisma.category.count({
        where: { id: { in: categoryIds }, OR: [{ tenantId }, { tenantId: null }] },
      });
      if (ok !== categoryIds.length) {
        throw new ForbiddenException('Kategoriya sizning do\'koningizga tegishli emas');
      }
    }
  }

  @Get()
  async list(
    @CurrentAdmin() admin: Admin,
    @Query('sourceProductId') sourceProductId?: string,
    @Query('sourceCategoryId') sourceCategoryId?: string,
  ) {
    const tenantId = admin.tenantId ?? null;
    // Faqat do'konning o'z mahsulot/kategoriyasiga tegishli qoidalar
    const tenantScope: Prisma.RelatedRuleWhereInput = tenantId
      ? { OR: [{ sourceProduct: { tenantId } }, { sourceCategory: { tenantId } }] }
      : {};
    return this.prisma.relatedRule.findMany({
      where: {
        ...tenantScope,
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
  async create(@Body() dto: UpsertRuleDto, @CurrentAdmin() admin: Admin) {
    await this.assertOwned(admin.tenantId, dto);
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

  /** Qoida joriy do'konga tegishliligini tekshiradi (source product/category orqali). */
  private async assertRuleOwned(id: string, tenantId: string | null) {
    const rule = await this.prisma.relatedRule.findUnique({
      where: { id },
      include: { sourceProduct: { select: { tenantId: true } }, sourceCategory: { select: { tenantId: true } } },
    });
    if (!rule) throw new NotFoundException('Qoida topilmadi');
    if (tenantId) {
      const owner = rule.sourceProduct?.tenantId ?? rule.sourceCategory?.tenantId ?? null;
      if (owner !== tenantId) throw new ForbiddenException('Bu qoida sizning do\'koningizga tegishli emas');
    }
    return rule;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<UpsertRuleDto>, @CurrentAdmin() admin: Admin) {
    await this.assertRuleOwned(id, admin.tenantId);
    return this.prisma.relatedRule.update({
      where: { id },
      data: {
        position: dto.position,
        isActive: dto.isActive,
      },
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentAdmin() admin: Admin) {
    await this.assertRuleOwned(id, admin.tenantId);
    await this.prisma.relatedRule.delete({ where: { id } });
    return { ok: true };
  }
}

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminRelatedController],
})
export class AdminRelatedModule {}
