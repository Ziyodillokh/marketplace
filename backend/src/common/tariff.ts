import { TariffPlan } from '@prisma/client';

/** -1 = cheksiz */
export interface TariffLimits {
  maxCategories: number;
  maxProducts: number;
  maxBanners: number;
  maxImagesPerProduct: number;
  maxOptionsPerProduct: number;
  aiImageEnhance: number;
  aiAutofill: number;
  analytics: boolean;
  onlinePayment: boolean;
  branding: boolean;
  prioritySupport: boolean;
  maxStores: number;
}

export type TariffFeature = 'analytics' | 'onlinePayment' | 'branding' | 'prioritySupport';

export const TARIFF_LIMITS: Record<TariffPlan, TariffLimits> = {
  FREE: {
    maxCategories: 1,
    maxProducts: 3,
    maxBanners: 1,
    maxImagesPerProduct: 3,
    maxOptionsPerProduct: 5,
    aiImageEnhance: 3,
    aiAutofill: 3,
    analytics: false,
    onlinePayment: false,
    branding: false,
    prioritySupport: false,
    maxStores: 1,
  },
  STANDARD: {
    maxCategories: 50,
    maxProducts: 200,
    maxBanners: 10,
    maxImagesPerProduct: 15,
    maxOptionsPerProduct: 5,
    aiImageEnhance: 30,
    aiAutofill: 100,
    analytics: true,
    onlinePayment: true,
    branding: true,
    prioritySupport: true,
    maxStores: 1,
  },
  PRO: {
    maxCategories: 100,
    maxProducts: 1000,
    maxBanners: 10,
    maxImagesPerProduct: 10,
    maxOptionsPerProduct: 5,
    aiImageEnhance: 150,
    aiAutofill: 1000,
    analytics: true,
    onlinePayment: true,
    branding: true,
    prioritySupport: true,
    maxStores: 1,
  },
  PREMIUM: {
    maxCategories: -1,
    maxProducts: -1,
    maxBanners: -1,
    maxImagesPerProduct: 10,
    maxOptionsPerProduct: 5,
    aiImageEnhance: 250,
    aiAutofill: 2000,
    analytics: true,
    onlinePayment: true,
    branding: true,
    prioritySupport: true,
    maxStores: 2,
  },
};

export function limitsFor(plan: TariffPlan): TariffLimits {
  return TARIFF_LIMITS[plan] ?? TARIFF_LIMITS.FREE;
}

export function hasFeature(plan: TariffPlan, feature: TariffFeature): boolean {
  return limitsFor(plan)[feature] === true;
}
