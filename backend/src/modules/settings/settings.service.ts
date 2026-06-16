import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface StoreSettings {
  name?: string;
  phone?: string;
  address?: string;
  workingHours?: string;
  about?: string;
}

export interface BusinessSettings {
  minOrderAmount: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  currency: string;
}

export interface PublicSettings {
  store: StoreSettings;
  business: BusinessSettings;
}

const BUSINESS_DEFAULTS = (): BusinessSettings => ({
  minOrderAmount: Number(process.env.MIN_ORDER_AMOUNT ?? 30000),
  deliveryFee: Number(process.env.DELIVERY_FEE ?? 25000),
  freeDeliveryThreshold: Number(process.env.FREE_DELIVERY_THRESHOLD ?? 500000),
  currency: process.env.DEFAULT_CURRENCY ?? 'UZS',
});

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get<T = unknown>(key: string): Promise<T | null> {
    const row = await this.prisma.settings.findUnique({ where: { key } });
    return (row?.value as T | undefined) ?? null;
  }

  async getStore(): Promise<StoreSettings> {
    return (
      (await this.get<StoreSettings>('store')) ?? {
        name: 'Marketplace',
        phone: '+998901234567',
        address: '',
        workingHours: '09:00–22:00',
      }
    );
  }

  /**
   * Biznes qoidalari (minimal buyurtma, yetkazib berish narxi, va h.k.).
   *
   * DB'dan o'qiladi (key="business"). Agar yo'q bo'lsa, env defaults qaytariladi.
   * Admin UI orqali o'zgartirilganda zudlik bilan kuchga kiradi —
   * server restart kerak emas.
   */
  async getBusiness(): Promise<BusinessSettings> {
    const saved = await this.get<Partial<BusinessSettings>>('business');
    const defaults = BUSINESS_DEFAULTS();
    if (!saved) return defaults;
    // DB'da ba'zi maydonlar bo'lmasa — defaults bilan to'ldiramiz
    return {
      minOrderAmount: Number(saved.minOrderAmount ?? defaults.minOrderAmount),
      deliveryFee: Number(saved.deliveryFee ?? defaults.deliveryFee),
      freeDeliveryThreshold: Number(saved.freeDeliveryThreshold ?? defaults.freeDeliveryThreshold),
      currency: String(saved.currency ?? defaults.currency),
    };
  }

  async getPublic(): Promise<PublicSettings> {
    return {
      store: await this.getStore(),
      business: await this.getBusiness(),
    };
  }
}
