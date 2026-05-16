import { All, Controller, Headers, HttpCode, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { TelegramBotService } from './telegram-bot.service';

@Controller('telegram')
export class TelegramWebhookController {
  private readonly secret: string;
  constructor(private readonly bot: TelegramBotService, config: ConfigService) {
    this.secret = config.getOrThrow<string>('TELEGRAM_WEBHOOK_SECRET');
  }

  @All('webhook')
  @HttpCode(200)
  async webhook(
    @Headers('x-telegram-bot-api-secret-token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (token !== this.secret) throw new UnauthorizedException('Invalid secret');
    const handler = this.bot.webhookHandler();
    await handler(req, res);
  }
}
