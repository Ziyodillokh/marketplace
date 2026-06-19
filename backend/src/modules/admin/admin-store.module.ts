import { Module } from '@nestjs/common';
import { AdminStoreController } from './admin-store.controller';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [AdminAuthModule, TelegramBotModule, UploadsModule],
  controllers: [AdminStoreController],
})
export class AdminStoreModule {}
