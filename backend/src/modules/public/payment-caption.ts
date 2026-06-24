import type { Tenant } from '@prisma/client';
import { TARIFFS } from './tariffs';
import { BUSINESS_TYPE_LABELS } from './business-types';

const PLAN_LABEL: Record<string, string> = {
  FREE: 'Free',
  STANDARD: 'Standart',
  PRO: 'Pro',
  PREMIUM: 'Premium',
};

/** To'lov tasdiqlash xabari (admin chatiga) — boyitilgan ma'lumotlar bilan. */
export function buildPaymentCaption(t: Tenant, title: string): string {
  const tariff = TARIFFS.find((x) => x.value === t.pendingTariff);
  const username = t.ownerUsername ? `@${t.ownerUsername}` : '—';
  const biz = t.businessType ? BUSINESS_TYPE_LABELS[t.businessType] : '—';
  const date = t.createdAt.toLocaleDateString('ru-RU');
  const yearly = t.pendingBillingPeriod === 'yearly';
  const amount = tariff ? (yearly ? tariff.priceYearly : tariff.priceMonthly) : 0;
  const periodLabel = yearly ? 'yillik' : 'oylik';
  const priceStr = tariff ? ` (${amount.toLocaleString('ru-RU')} so'm · ${periodLabel})` : '';

  return (
    `💳 <b>${title}</b>\n\n` +
    `👤 Ism: ${t.ownerName}\n` +
    `🔗 Username: ${username}\n` +
    `📞 Telefon: ${t.ownerPhone ?? '—'}\n` +
    `🆔 TG ID: <code>${t.ownerTelegramId ?? '—'}</code>\n` +
    `🏪 Do'kon: ${t.shopName}\n` +
    `🏷 Turi: ${biz}\n` +
    `🤖 Bot: ${t.botUsername ? '@' + t.botUsername : '—'}\n` +
    `💎 Tarif: ${PLAN_LABEL[t.tariffPlan] ?? t.tariffPlan} → <b>${tariff?.label ?? t.pendingTariff ?? '—'}</b>${priceStr}\n` +
    `📅 Ro'yxatdan: ${date}`
  );
}
