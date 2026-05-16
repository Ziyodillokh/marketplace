import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import type { User } from '@prisma/client';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';
import { CurrentLanguage, CurrentUser } from '@/common/decorators/current-user.decorator';
import type { Locale } from '@/common/helpers/localize';
import { FavoritesService } from './favorites.service';

class AddFavoriteDto {
  @IsString() productId!: string;
}

@Controller('favorites')
@UseGuards(TelegramAuthGuard)
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  list(@CurrentUser() user: User, @CurrentLanguage() lang: Locale) {
    return this.favorites.list(user.id, lang);
  }

  @Get('summary')
  count(@CurrentUser() user: User) {
    return this.favorites.count(user.id);
  }

  @Post()
  add(@CurrentUser() user: User, @Body() dto: AddFavoriteDto) {
    return this.favorites.add(user.id, dto.productId);
  }

  @Post('toggle')
  toggle(@CurrentUser() user: User, @Body() dto: AddFavoriteDto) {
    return this.favorites.toggle(user.id, dto.productId);
  }

  @Delete(':productId')
  async remove(@CurrentUser() user: User, @Param('productId') productId: string) {
    await this.favorites.remove(user.id, productId);
    return { ok: true };
  }
}
