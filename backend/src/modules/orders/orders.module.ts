import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { AuthModule } from '../auth/auth.module';
import { CartModule } from '../cart/cart.module';
import { PromoCodesModule } from '../promo-codes/promo-codes.module';

@Module({
  imports: [AuthModule, CartModule, PromoCodesModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
