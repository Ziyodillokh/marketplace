import { TariffPlan } from '@prisma/client';

export interface TariffOption {
  value: TariffPlan;
  label: string;
  /** So'mda, oylik. FREE = 0. */
  priceMonthly: number;
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
    tagline: 'Yangi boshlaganlar uchun',
    trialDays: 0,
    features: [
      '1 kategoriya, 3 tagacha mahsulot',
      'Har mahsulotga 3 rasm, 5 opsiya',
      '1 ta banner',
      '3 ta AI rasm yaxshilash',
      '3 ta AI avto-to\'ldirish',
      'Cheksiz buyurtmalar',
      "O'z Telegram botingiz",
      'Promokodlar va kanal tugmasi',
    ],
  },
  {
    value: 'STANDARD',
    label: 'Standart',
    priceMonthly: 199_000,
    tagline: "O'suvchi do'konlar uchun",
    trialDays: 14,
    features: [
      '50 kategoriya, 200 tagacha mahsulot',
      'Har mahsulotga 15 rasm',
      '10 tagacha banner',
      '30 ta AI rasm yaxshilash',
      '30 ta AI avto-to\'ldirish',
      'Sotuv analitikasi',
      'Free tarifdagi barcha imkoniyatlar',
      '14 kun bepul sinov',
    ],
  },
  {
    value: 'PRO',
    label: 'Pro',
    priceMonthly: 499_000,
    tagline: 'Professional sotuvchilar uchun',
    popular: true,
    trialDays: 14,
    features: [
      '100 kategoriya, 1,000 tagacha mahsulot',
      '150 ta AI rasm yaxshilash',
      'Kengaytirilgan analitika va hisobotlar',
      'Ustuvor qo\'llab-quvvatlash',
      "Standart'dagi barcha imkoniyatlar",
      '14 kun bepul sinov',
    ],
  },
  {
    value: 'PREMIUM',
    label: 'Premium',
    priceMonthly: 790_000,
    tagline: 'Katta bizneslar uchun',
    trialDays: 14,
    features: [
      'Cheksiz kategoriya va mahsulot',
      'Cheksiz bannerlar',
      '250 ta AI rasm yaxshilash',
      'Maxsus domen (white-label)',
      '24/7 ustuvor qo\'llab-quvvatlash',
      "Pro'dagi barcha imkoniyatlar",
      '14 kun bepul sinov',
    ],
  },
];

export function trialDaysFor(plan: TariffPlan): number {
  return TARIFFS.find((t) => t.value === plan)?.trialDays ?? 0;
}
