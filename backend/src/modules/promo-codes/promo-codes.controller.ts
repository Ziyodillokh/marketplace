import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import type { User } from '@prisma/client';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PromoCodesService } from './promo-codes.service';
import { CartService } from '../cart/cart.service';

class ApplyPromoDto {
  @IsString() code!: string;
}

@Controller('promo-codes')
@UseGuards(TelegramAuthGuard)
export class PromoCodesController {
  constructor(
    private readonly promos: PromoCodesService,
    private readonly cart: CartService,
  ) {}

  @Get('public')
  publicList() {
    return this.promos.listPublic();
  }

  @Post('apply')
  async apply(@CurrentUser() user: User, @Body() dto: ApplyPromoDto) {
    const summary = await this.cart.summary(user.id);
    if (summary.subtotal <= 0) throw new BadRequestException('Cart is empty');
    const result = await this.promos.evaluate(user.id, dto.code, summary.subtotal);
    return {
      code: result.promo.code,
      type: result.promo.type,
      value: Number(result.promo.value),
      discountAmount: result.discountAmount,
      subtotal: summary.subtotal,
    };
  }
}
