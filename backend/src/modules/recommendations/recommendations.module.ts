import { Module } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';
import { RelatedProductsModule } from '../related-products/related-products.module';

@Module({
  imports: [TelegramBotModule, RelatedProductsModule],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}
