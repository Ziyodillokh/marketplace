import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface StoreSettings {
  name?: string;
  phone?: string;
  address?: string;
  workingHours?: string;
  about?: string;
}

export interface PublicSettings {
  store: StoreSettings;
  business: {
    minOrderAmount: number;
    deliveryFee: number;
    freeDeliveryThreshold: number;
    currency: string;
  };
}

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

  async getPublic(): Promise<PublicSettings> {
    return {
      store: await this.getStore(),
      business: {
        minOrderAmount: Number(process.env.MIN_ORDER_AMOUNT ?? 30000),
        deliveryFee: Number(process.env.DELIVERY_FEE ?? 25000),
        freeDeliveryThreshold: Number(process.env.FREE_DELIVERY_THRESHOLD ?? 500000),
        currency: process.env.DEFAULT_CURRENCY ?? 'UZS',
      },
    };
  }
}
