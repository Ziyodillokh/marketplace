import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { TariffPlan } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { ReferralService } from '../referral/referral.service';
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
    private readonly referral: ReferralService,
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
        // Tarif faollashadi; davr (oylik/yillik) bo'yicha muddat o'rnatiladi.
        const period = tenant.pendingBillingPeriod === 'yearly' ? 'yearly' : 'monthly';
        const now = new Date();
        const expires = new Date(
          now.getTime() + (period === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000,
        );
        // o'z balansidan ushlangan summa (agar bo'lsa) iste'mol qilinadi
        await this.prisma.tenant.update({
          where: { id: tenantId },
          data: {
            tariffPlan: plan,
            pendingTariff: null,
            pendingBillingPeriod: null,
            billingPeriod: period,
            tariffStartedAt: now,
            tariffExpiresAt: expires,
            pendingBalanceApplied: 0,
          },
        });
        // Referal komissiya (har to'lovда) — taklif qilingan do'kon to'ladi → referrerга.
        // Komissiya bazasi — aynan to'langan davr narxi (oylik/yillik).
        try {
          const price = await this.referral.planPrice(plan, period);
          const credited = await this.referral.creditCommission(tenantId, plan, price);
          if (credited) {
            const ref = await this.prisma.tenant.findUnique({
              where: { id: credited.referrerId },
              select: { ownerTelegramId: true },
            });
            if (ref?.ownerTelegramId) {
              const amt = credited.amount.toLocaleString('ru-RU').replace(/,/g, ' ');
              await this.bot.sendDirectMessage(
                ref.ownerTelegramId,
                `🎉 <b>Referal bonus: ${amt} so'm!</b>\n\nSiz taklif qilgan do'kon tarif to'lovini amalga oshirdi. Bonus referal balansingizga qo'shildi.`,
              );
            }
          }
        } catch (err) {
          this.logger.warn(`Referral commission failed: ${(err as Error).message}`);
        }
      }
      if (tenant.ownerTelegramId) {
        await this.bot.sendDirectMessage(
          tenant.ownerTelegramId,
          `✅ <b>To'lovingiz tasdiqlandi!</b>\n\n<b>${plan ? TARIFF_LABEL[plan] : ''}</b> tarifi faollashtirildi. Sellio bilan birga bo'lganingiz uchun rahmat!`,
        );
      }
    } else {
      // Rad — pending va ushlangan o'z balansni qaytaramiz
      const applied = Number(tenant.pendingBalanceApplied);
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          pendingTariff: null,
          ...(applied > 0
            ? { referralBalance: { increment: tenant.pendingBalanceApplied }, pendingBalanceApplied: 0 }
            : {}),
        },
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
