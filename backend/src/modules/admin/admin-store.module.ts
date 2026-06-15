import { Module } from '@nestjs/common';
import { AdminStoreController } from './admin-store.controller';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';

@Module({
  imports: [AdminAuthModule, TelegramBotModule],
  controllers: [AdminStoreController],
})
export class AdminStoreModule {}
