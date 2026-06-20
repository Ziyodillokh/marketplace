import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { limitsFor } from '@/common/tariff';

export interface StoreSettings {
  name?: string;
  phone?: string;
  address?: string;
  workingHours?: string;
  about?: string;
  primaryColor?: string | null;
  logoUrl?: string | null;
  /** Paid tarif (branding) — webapp sarlavhasida do'kon nomini ko'rsatish uchun */
  branded?: boolean;
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
  payments: { payme: boolean; click: boolean; card: boolean };
  /** Karta o'tkazma uchun rekvizitlar (sozlangan bo'lsa) */
  cardPayment: { number: string; holder: string } | null;
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
    // Tenant rejimida store+payments ma'lumotini bitta DB so'rovida olamiz —
    // bu endpoint webapp'ning har bir sahifa yuklanishida chaqiriladi,
    // shuning uchun 2 ta tenant.findUnique bir-biri ortidan latency tug'diradi.
    if (tenantId) {
      const [t, business] = await Promise.all([
        this.prisma.tenant.findUnique({
          where: { id: tenantId },
          select: {
            shopName: true,
            ownerPhone: true,
            address: true,
            workingHours: true,
            about: true,
            primaryColor: true,
            logoUrl: true,
            tariffPlan: true,
            paymeMerchantId: true,
            clickServiceId: true,
            clickMerchantId: true,
            manualCardNumber: true,
            manualCardHolder: true,
            manualPaymentChannelId: true,
          },
        }),
        this.getBusiness(),
      ]);
      const store: StoreSettings = t
        ? {
            name: t.shopName,
            phone: t.ownerPhone ?? undefined,
            address: t.address ?? undefined,
            workingHours: t.workingHours ?? undefined,
            about: t.about ?? undefined,
            primaryColor: t.primaryColor,
            logoUrl: t.logoUrl,
            branded: limitsFor(t.tariffPlan).branding,
          }
        : await this.getStore(null);
      const cardReady = !!(t?.manualCardNumber && t?.manualPaymentChannelId);
      return {
        store,
        business,
        payments: {
          payme: !!t?.paymeMerchantId,
          click: !!(t?.clickServiceId && t?.clickMerchantId),
          card: cardReady,
        },
        cardPayment:
          cardReady && t?.manualCardNumber && t?.manualCardHolder
            ? { number: t.manualCardNumber, holder: t.manualCardHolder }
            : null,
      };
    }

    // Tenant'siz (global) chaqiruv — eski global Settings'dan
    const [store, business] = await Promise.all([this.getStore(null), this.getBusiness()]);
    return {
      store,
      business,
      payments: { payme: false, click: false, card: false },
      cardPayment: null,
    };
  }
}
