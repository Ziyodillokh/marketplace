import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import type { User } from '@prisma/client';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';
import { CurrentLanguage, CurrentUser } from '@/common/decorators/current-user.decorator';
import type { Locale } from '@/common/helpers/localize';
import { CartService } from './cart.service';

class AddItemDto {
  @IsString() productId!: string;
  @IsOptional() @IsString() variantId?: string;
  @IsOptional() @IsInt() @Min(1) quantity?: number;
}

class UpdateQtyDto {
  @IsInt() @Min(1) quantity!: number;
}

@Controller('cart')
@UseGuards(TelegramAuthGuard)
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  get(@CurrentUser() user: User, @CurrentLanguage() lang: Locale) {
    return this.cart.getCart(user.id, lang);
  }

  @Get('summary')
  summary(@CurrentUser() user: User) {
    return this.cart.summary(user.id);
  }

  @Post('items')
  addItem(@CurrentUser() user: User, @Body() dto: AddItemDto) {
    return this.cart.addItem(user.id, dto);
  }

  @Patch('items/:id')
  async updateQty(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateQtyDto) {
    await this.cart.updateQuantity(user.id, id, dto.quantity);
    return { ok: true };
  }

  @Delete('items/:id')
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    await this.cart.removeItem(user.id, id);
    return { ok: true };
  }

  @Delete()
  async clear(@CurrentUser() user: User) {
    await this.cart.clear(user.id);
    return { ok: true };
  }
}
