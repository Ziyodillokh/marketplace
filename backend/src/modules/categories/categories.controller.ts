import { Controller, Get, Param, Query } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CurrentLanguage } from '@/common/decorators/current-user.decorator';
import type { Locale } from '@/common/helpers/localize';
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
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list(@Query() q: ListCategoriesDto, @CurrentLanguage() lang: Locale) {
    return this.categories.list(
      { onlyRoot: q.onlyRoot, parentId: q.parentId },
      lang,
    );
  }

  @Get('by-slug/:slug')
  getBySlug(@Param('slug') slug: string, @CurrentLanguage() lang: Locale) {
    return this.categories.getBySlug(slug, lang);
  }
}
