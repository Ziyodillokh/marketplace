import { TariffPlan } from '@prisma/client';

export interface TariffOption {
  value: TariffPlan;
  label: string;
  /** So'mda, oylik. FREE = 0. */
  priceMonthly: number;
  /** So'mda, yillik. FREE = 0. */
  priceYearly: number;
  /** Yillik chegirma foizi (oylik×12 ga nisbatan). */
  yearlyDiscount: number;
  tagline: string;
  popular?: boolean;
  /** Sinov muddati (kun). FREE da 0. */
  trialDays: number;
  features: string[];
}

export const TARIFFS: TariffOption[] = [
  {
    value: 'FREE',
    label: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    yearlyDiscount: 0,
    tagline: 'Yangi boshlaganlar uchun',
    trialDays: 0,
    features: [
      '1 ta kategoriya',
      '3 tagacha mahsulot',
      '1 ta banner',
      'Har bir mahsulotga 3 ta rasm',
      'Har bir mahsulotga 5 ta opsiya',
      '3 ta rasm yaxshilash',
      '3 ta avto-to\'ldirish',
      'Cheksiz buyurtmalar',
      "O'z Telegram-botingiz",
      'Telegram kanalidagi tugma',
      'Promokodlar',
    ],
  },
  {
    value: 'STANDARD',
    label: 'Standart',
    priceMonthly: 199_000,
    priceYearly: 1_910_400,
    yearlyDiscount: 20,
    tagline: "O'suvchi do'konlar uchun",
    trialDays: 0,
    features: [
      '50 tagacha kategoriya',
      '200 tagacha mahsulot',
      '10 tagacha banner',
      'Har bir mahsulotga 15 ta rasm',
      'Har bir mahsulotga 5 ta opsiya',
      '30 ta rasm yaxshilash',
      '100 ta avto-to\'ldirish',
      'Cheksiz buyurtmalar',
      "O'z Telegram-botingiz",
      'Payme va Click orqali onlayn to\'lov',
      'Do\'kon statistikasi',
      'Telegram kanalidagi tugma',
      'Promokodlar',
      'O\'z brendingiz bilan',
      'Ustuvor qo\'llab-quvvatlash',
    ],
  },
  {
    value: 'PRO',
    label: 'Pro',
    priceMonthly: 499_000,
    priceYearly: 4_790_400,
    yearlyDiscount: 20,
    tagline: 'Professional sotuvchilar uchun',
    popular: true,
    trialDays: 0,
    features: [
      '100 tagacha kategoriya',
      '1000 tagacha mahsulot',
      '10 tagacha banner',
      'Har bir mahsulotga 10 ta rasm',
      'Har bir mahsulotga 5 ta opsiya',
      '150 ta rasm yaxshilash',
      '1000 ta avto-to\'ldirish',
      'Cheksiz buyurtmalar',
      "O'z Telegram-botingiz",
      'Payme va Click orqali onlayn to\'lov',
      'Do\'kon statistikasi',
      'Telegram kanalidagi tugma',
      'Promokodlar',
      'O\'z brendingiz bilan',
      'Ustuvor qo\'llab-quvvatlash',
    ],
  },
  {
    value: 'PREMIUM',
    label: 'Premium',
    priceMonthly: 999_000,
    priceYearly: 8_991_000,
    yearlyDiscount: 25,
    tagline: 'Katta bizneslar uchun',
    trialDays: 0,
    features: [
      'Cheksiz kategoriyalar',
      'Cheksiz mahsulotlar',
      'Cheksiz bannerlar',
      'Har bir mahsulotga 10 ta rasm',
      'Har bir mahsulotga 5 ta opsiya',
      '250 ta rasm yaxshilash',
      '2000 ta avto-to\'ldirish',
      'Cheksiz buyurtmalar',
      "O'z Telegram-botingiz",
      'Payme va Click orqali onlayn to\'lov',
      'Do\'kon statistikasi',
      'Telegram kanalidagi tugma',
      '2 tagacha do\'kon ochish imkoni (2 ta bot)',
      'Promokodlar',
      'O\'z brendingiz bilan',
      'Ustuvor qo\'llab-quvvatlash',
    ],
  },
];

export function trialDaysFor(plan: TariffPlan): number {
  return TARIFFS.find((t) => t.value === plan)?.trialDays ?? 0;
}
