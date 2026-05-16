import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type { User } from '@prisma/client';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';
import { CurrentLanguage, CurrentUser } from '@/common/decorators/current-user.decorator';
import type { Locale } from '@/common/helpers/localize';
import { ProductsService, type ProductSort } from './products.service';
import { RelatedProductsService } from '../related-products/related-products.service';

class ListProductsQuery {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() categorySlug?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxPrice?: number;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsIn(['newest', 'price_asc', 'price_desc', 'bestsellers', 'discount']) sort?: ProductSort;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @Type(() => Boolean) featuredOnly?: boolean;
}

@Controller('products')
@UseGuards(TelegramAuthGuard)
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly related: RelatedProductsService,
  ) {}

  @Get()
  list(@Query() q: ListProductsQuery, @CurrentLanguage() lang: Locale, @CurrentUser() user: User) {
    return this.products.list(q, lang, user.id);
  }

  @Get(':id')
  getById(
    @Param('id') id: string,
    @CurrentLanguage() lang: Locale,
    @CurrentUser() user: User,
  ) {
    return this.products.getById(id, lang, user.id);
  }

  @Get(':id/related')
  getRelated(
    @Param('id') id: string,
    @CurrentLanguage() lang: Locale,
    @CurrentUser() user: User,
  ) {
    return this.related.getRelatedFor(id, lang, user.id);
  }
}
