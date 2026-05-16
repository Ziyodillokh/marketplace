import { Controller, Get, Query } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { CurrentLanguage } from '@/common/decorators/current-user.decorator';
import type { Locale } from '@/common/helpers/localize';
import { BannersService } from './banners.service';

class ListBannersDto {
  @IsOptional() @IsString() placement?: string;
}

@Controller('banners')
export class BannersController {
  constructor(private readonly banners: BannersService) {}

  @Get()
  list(@Query() q: ListBannersDto, @CurrentLanguage() lang: Locale) {
    return this.banners.list(q.placement ?? 'home', lang);
  }
}
