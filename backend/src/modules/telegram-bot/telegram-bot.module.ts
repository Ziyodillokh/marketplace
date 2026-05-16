import { Module } from '@nestjs/common';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { TelegramOrdersListener } from './telegram-orders.listener';
import { TelegramSupportListener } from './telegram-support.listener';

@Module({
  controllers: [TelegramWebhookController],
  providers: [TelegramBotService, TelegramOrdersListener, TelegramSupportListener],
  exports: [TelegramBotService],
})
export class TelegramBotModule {}
