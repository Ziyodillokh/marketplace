import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface StoreSettings {
  name?: string;
  phone?: string;
  address?: string;
  workingHours?: string;
  about?: string;
  primaryColor?: string | null;
  logoUrl?: string | null;
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
  payments: { payme: boolean; click: boolean };
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

  async getStore(tenantId?: string | null): Promise<StoreSettings> {
    // Tenant (do'kon) bo'lsa — o'sha sotuvchining ma'lumotini qaytaramiz
    if (tenantId) {
      const t = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          shopName: true,
          ownerPhone: true,
          address: true,
          workingHours: true,
          about: true,
          primaryColor: true,
          logoUrl: true,
        },
      });
      if (t) {
        return {
          name: t.shopName,
          phone: t.ownerPhone ?? undefined,
          address: t.address ?? undefined,
          workingHours: t.workingHours ?? undefined,
          about: t.about ?? undefined,
          primaryColor: t.primaryColor,
          logoUrl: t.logoUrl,
        };
      }
    }
    return (
      (await this.get<StoreSettings>('store')) ?? {
        name: 'Sellio',
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

  async getPublic(tenantId?: string | null): Promise<PublicSettings> {
    return {
      store: await this.getStore(tenantId),
      business: await this.getBusiness(),
      payments: await this.getPaymentsAvail(tenantId),
    };
  }

  /** Shu do'kon uchun qaysi onlayn to'lov sozlangan. */
  private async getPaymentsAvail(tenantId?: string | null): Promise<{ payme: boolean; click: boolean }> {
    if (!tenantId) return { payme: false, click: false };
    const t = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { paymeMerchantId: true, clickServiceId: true, clickMerchantId: true },
    });
    return {
      payme: !!t?.paymeMerchantId,
      click: !!(t?.clickServiceId && t?.clickMerchantId),
    };
  }
}
