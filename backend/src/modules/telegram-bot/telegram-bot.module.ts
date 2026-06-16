import { Module } from '@nestjs/common';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { TelegramOrdersListener } from './telegram-orders.listener';
import { TelegramSupportListener } from './telegram-support.listener';
import { TelegramPaymentsListener } from './telegram-payments.listener';
import { TenantBotService } from './tenant-bot.service';
import { TenantWebhookController } from './tenant-webhook.controller';

@Module({
  controllers: [TelegramWebhookController, TenantWebhookController],
  providers: [
    TelegramBotService,
    TelegramOrdersListener,
    TelegramSupportListener,
    TelegramPaymentsListener,
    TenantBotService,
  ],
  exports: [TelegramBotService, TenantBotService],
})
export class TelegramBotModule {}
