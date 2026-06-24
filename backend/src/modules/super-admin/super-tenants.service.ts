import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { TariffPlan, Tenant, TenantStatus, Prisma } from '@prisma/client';

export interface TenantListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  plan?: TariffPlan;
  status?: TenantStatus;
  sort?: 'created' | 'revenue' | 'activity' | 'products';
  order?: 'asc' | 'desc';
}

@Injectable()
export class SuperTenantsService {
  constructor(private readonly prisma: PrismaService) {}

  private orderBy(sort?: string, order: 'asc' | 'desc' = 'desc'): Prisma.TenantOrderByWithRelationInput {
    switch (sort) {
      case 'revenue':
        return { totalRevenue: order };
      case 'activity':
        return { lastActivityAt: order };
      case 'products':
        return { totalOrders: order };
      case 'created':
      default:
        return { createdAt: order };
    }
  }

  async list(params: TenantListParams = {}) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, params.pageSize ?? 25);

    const where: Prisma.TenantWhereInput = {};
    if (params.plan) where.tariffPlan = params.plan;
    if (params.status) where.status = params.status;
    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { shopName: { contains: q, mode: 'insensitive' } },
        { ownerName: { contains: q, mode: 'insensitive' } },
        { ownerEmail: { contains: q, mode: 'insensitive' } },
        { ownerPhone: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.tenant.count({ where }),
      this.prisma.tenant.findMany({
        where,
        orderBy: this.orderBy(params.sort, params.order),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const enriched = await this.enrichTenants(items);

    return {
      items: enriched,
      total,
      page,
      pageSize,
    };
  }

  private async enrichTenants(tenants: Tenant[]) {
    if (tenants.length === 0) return [];
    const ids = tenants.map((t) => t.id);

    const [productCounts, storage] = await Promise.all([
      // TODO: mahsulot soni — tenantId qo'shilgandan keyin
      Promise.resolve<Array<{ tenantId: string; count: number }>>([]),
      this.prisma.tenantResourceStat.findMany({
        where: {
          tenantId: { in: ids },
          date: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        },
        orderBy: { date: 'desc' },
      }),
    ]);

    const productMap = new Map(productCounts.map((p) => [p.tenantId, p.count]));
    const storageMap = new Map<string, number>();
    for (const s of storage) {
      if (!storageMap.has(s.tenantId)) {
        storageMap.set(s.tenantId, s.storageMb);
      }
    }

    return tenants.map((t) => ({
      ...t,
      totalRevenue: t.totalRevenue.toString(),
      productsCount: productMap.get(t.id) ?? 0,
      storageMb: storageMap.get(t.id) ?? 0,
    }));
  }

  async getById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const [enriched] = await this.enrichTenants([tenant]);
    return enriched;
  }

  async suspend(id: string, reason: string): Promise<Tenant> {
    return this.prisma.tenant.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
        suspendedReason: reason,
        suspendedAt: new Date(),
      },
    });
  }

  async resume(id: string): Promise<Tenant> {
    return this.prisma.tenant.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        suspendedReason: null,
        suspendedAt: null,
      },
    });
  }

  async changeTariff(id: string, plan: TariffPlan): Promise<Tenant> {
    return this.prisma.tenant.update({
      where: { id },
      data: {
        tariffPlan: plan,
        tariffStartedAt: new Date(),
      },
    });
  }

  async extendTrial(id: string, days: number): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const base = tenant.trialEndsAt ?? new Date();
    const trialEndsAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    return this.prisma.tenant.update({
      where: { id },
      data: { isOnTrial: true, trialEndsAt },
    });
  }

  async create(data: {
    slug: string;
    shopName: string;
    ownerName: string;
    ownerEmail: string;
    ownerPhone?: string;
    tariffPlan?: TariffPlan;
    isOnTrial?: boolean;
    trialDays?: number;
  }): Promise<Tenant> {
    const slug = data.slug.toLowerCase().trim();
    const email = data.ownerEmail.toLowerCase().trim();

    const exists = await this.prisma.tenant.findFirst({
      where: { OR: [{ slug }, { ownerEmail: email }] },
    });
    if (exists) {
      throw new ConflictException('Slug yoki email allaqachon ishlatilgan');
    }

    const trialEndsAt = data.isOnTrial && data.trialDays
      ? new Date(Date.now() + data.trialDays * 24 * 60 * 60 * 1000)
      : null;

    return this.prisma.tenant.create({
      data: {
        slug,
        shopName: data.shopName.trim(),
        ownerName: data.ownerName.trim(),
        ownerEmail: email,
        ownerPhone: data.ownerPhone?.trim() ?? null,
        tariffPlan: data.tariffPlan ?? 'FREE',
        status: 'ACTIVE',
        isOnTrial: data.isOnTrial ?? false,
        trialEndsAt,
      },
    });
  }

  /**
   * Do'kon va unга tegishli BARCHA ma'lumotni xavfsiz tartibda o'chiradi.
   * Order/Product/Banner/PromoCode'da Tenant'ga FK yo'q (faqat tenantId ustun) —
   * shuning uchun ular alohida o'chiriladi, aks holda orphan qoladi.
   * Invoice FK = RESTRICT — tenant'dan oldin o'chirilishi shart.
   * Tenant o'chgach: Admin/Subscription/AICreditUsage/ResourceStat/
   * ChannelPost/TenantBlockedUser cascade orqali o'chadi.
   */
  private async purgeTenant(id: string): Promise<void> {
    await this.prisma.$transaction([
      // Buyurtmalar → OrderItem/OrderEvent/PaymentTransaction(orderId) cascade
      this.prisma.order.deleteMany({ where: { tenantId: id } }),
      // Mahsulotga bog'liq RESTRICT FK'lar (cart/event) — mahsulotdan oldin
      this.prisma.cartItem.deleteMany({ where: { product: { tenantId: id } } }),
      this.prisma.userEvent.deleteMany({ where: { product: { tenantId: id } } }),
      // Mahsulotlar → image/variant/spec/favorite/relatedRule(product) cascade
      this.prisma.product.deleteMany({ where: { tenantId: id } }),
      // Kategoriyalar → relatedRule(category) cascade
      this.prisma.category.deleteMany({ where: { tenantId: id } }),
      this.prisma.banner.deleteMany({ where: { tenantId: id } }),
      this.prisma.promoCode.deleteMany({ where: { tenantId: id } }), // → PromoCodeUsage cascade
      this.prisma.paymentTransaction.deleteMany({ where: { tenantId: id } }),
      this.prisma.invoice.deleteMany({ where: { tenantId: id } }), // FK RESTRICT
      // Va nihoyat do'konning o'zi (qolgan relations cascade)
      this.prisma.tenant.delete({ where: { id } }),
    ]);
  }

  async delete(id: string): Promise<{ ok: true }> {
    const t = await this.prisma.tenant.findUnique({ where: { id }, select: { id: true } });
    if (!t) throw new NotFoundException('Tenant not found');
    await this.purgeTenant(id);
    return { ok: true };
  }

  async bulkUpdate(
    ids: string[],
    action: 'suspend' | 'resume' | 'delete',
    reason?: string,
  ): Promise<{ updated: number }> {
    if (action === 'delete') {
      let updated = 0;
      for (const id of ids) {
        try {
          await this.purgeTenant(id);
          updated += 1;
        } catch {
          // bittasi xato bo'lsa qolganlarini davom ettiramiz
        }
      }
      return { updated };
    }
    const result = await this.prisma.tenant.updateMany({
      where: { id: { in: ids } },
      data:
        action === 'suspend'
          ? { status: 'SUSPENDED', suspendedReason: reason ?? 'Bulk action', suspendedAt: new Date() }
          : { status: 'ACTIVE', suspendedReason: null, suspendedAt: null },
    });
    return { updated: result.count };
  }

  async exportAll(): Promise<Tenant[]> {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
