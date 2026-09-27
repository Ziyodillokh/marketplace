import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TenantBotService } from './tenant-bot.service';

/** Har sotuvchi botining webhook'i: /telegram/t/:tenantId/webhook */
@Controller('telegram/t')
export class TenantWebhookController {
  private readonly logger = new Logger(TenantWebhookController.name);
  private readonly secret: string;

  constructor(
    private readonly tenantBot: TenantBotService,
    config: ConfigService,
  ) {
    this.secret = config.getOrThrow<string>('TELEGRAM_WEBHOOK_SECRET');
  }

  @Post(':tenantId/webhook')
  @HttpCode(200)
  async webhook(
    @Param('tenantId') tenantId: string,
    @Headers('x-telegram-bot-api-secret-token') token: string,
    @Body() update: unknown,
  ): Promise<{ ok: true }> {
    if (token !== this.secret) throw new UnauthorizedException('Invalid secret');
    // Telegram'ga har doim 200 — aks holda update'ni qayta-qayta yuboradi;
    // lekin xatoni yutib yubormaymiz, jurnalga yozamiz.
    await this.tenantBot
      .handleUpdate(tenantId, update)
      .catch((err: unknown) =>
        this.logger.warn(`Tenant ${tenantId} update failed: ${(err as Error).message}`),
      );
    return { ok: true };
  }
}
