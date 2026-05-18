import { Module } from '@nestjs/common';
import { AdminBroadcastController } from './admin-broadcast.controller';
import { AdminBroadcastService } from './admin-broadcast.service';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';

@Module({
  imports: [AdminAuthModule, TelegramBotModule],
  controllers: [AdminBroadcastController],
  providers: [AdminBroadcastService],
})
export class AdminBroadcastModule {}
