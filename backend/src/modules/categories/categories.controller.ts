import { Controller, Get, Headers, Param, Query } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CurrentLanguage } from '@/common/decorators/current-user.decorator';
import type { Locale } from '@/common/helpers/localize';
import { TenantScopeService } from '@/common/tenant-scope/tenant-scope.service';
import { CategoriesService } from './categories.service';

class ListCategoriesDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  onlyRoot?: boolean;

  @IsOptional() @IsString() parentId?: string;
}

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categories: CategoriesService,
    private readonly tenantScope: TenantScopeService,
  ) {}

  @Get()
  async list(
    @Query() q: ListCategoriesDto,
    @CurrentLanguage() lang: Locale,
    @Headers('x-tenant-slug') shop?: string,
  ) {
    const tenantId = await this.tenantScope.tenantId(shop);
    return this.categories.list({ onlyRoot: q.onlyRoot, parentId: q.parentId }, lang, tenantId);
  }

  @Get('by-slug/:slug')
  async getBySlug(
    @Param('slug') slug: string,
    @CurrentLanguage() lang: Locale,
    @Headers('x-tenant-slug') shop?: string,
  ) {
    const tenantId = await this.tenantScope.tenantId(shop);
    return this.categories.getBySlug(slug, lang, tenantId);
  }
}
