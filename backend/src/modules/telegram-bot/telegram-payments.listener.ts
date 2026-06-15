import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { TariffPlan } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { TelegramBotService } from './telegram-bot.service';

const TARIFF_LABEL: Record<TariffPlan, string> = {
  FREE: 'Free',
  STANDARD: 'Standart',
  PRO: 'Pro',
  PREMIUM: 'Premium',
};

interface PaymentCallback {
  action: 'approve' | 'reject';
  tenantId: string;
  // grammy Context — faqat xabarni tahrirlash uchun ishlatamiz
  ctx?: {
    from?: { username?: string; first_name?: string };
    callbackQuery?: { message?: { caption?: string } };
    editMessageCaption?: (opts: { caption: string; parse_mode?: string }) => Promise<unknown>;
    editMessageReplyMarkup?: () => Promise<unknown>;
  };
}

@Injectable()
export class TelegramPaymentsListener implements OnModuleInit {
  private readonly logger = new Logger(TelegramPaymentsListener.name);

  constructor(
    private readonly bot: TelegramBotService,
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  onModuleInit(): void {
    this.bot.setCallbackEmitter(this.events);
    this.events.on('payment-callback', async (p: PaymentCallback) => {
      try {
        await this.handle(p);
      } catch (err) {
        this.logger.error(`Payment callback failed: ${(err as Error).message}`);
      }
    });
  }

  private async handle({ action, tenantId, ctx }: PaymentCallback): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return;

    const plan = tenant.pendingTariff;

    if (action === 'approve') {
      if (plan) {
        await this.prisma.tenant.update({
          where: { id: tenantId },
          data: { tariffPlan: plan, pendingTariff: null, tariffStartedAt: new Date() },
        });
      }
      if (tenant.ownerTelegramId) {
        await this.bot.sendDirectMessage(
          tenant.ownerTelegramId,
          `✅ <b>To'lovingiz tasdiqlandi!</b>\n\n<b>${plan ? TARIFF_LABEL[plan] : ''}</b> tarifi faollashtirildi. Sellio bilan birga bo'lganingiz uchun rahmat!`,
        );
      }
    } else {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { pendingTariff: null },
      });
      if (tenant.ownerTelegramId) {
        await this.bot.sendDirectMessage(
          tenant.ownerTelegramId,
          `❌ <b>To'lov tasdiqlanmadi.</b>\n\nIltimos, to'lovni qayta tekshiring yoki support bilan bog'laning. Hozircha tekin (Free) versiyadan foydalanishingiz mumkin.`,
        );
      }
    }

    // Admin chatidagi xabarni belgilash
    try {
      const label = action === 'approve' ? '✅ TASDIQLANDI' : '❌ BEKOR QILINDI';
      const by = ctx?.from?.username
        ? `@${ctx.from.username}`
        : ctx?.from?.first_name ?? '';
      const cap = ctx?.callbackQuery?.message?.caption ?? '';
      await ctx?.editMessageCaption?.({
        caption: `${cap}\n\n<b>${label}</b>${by ? ` — ${by}` : ''}`,
        parse_mode: 'HTML',
      });
    } catch {
      // tahrirlash muvaffaqiyatsiz — muhim emas
    }
  }
}
