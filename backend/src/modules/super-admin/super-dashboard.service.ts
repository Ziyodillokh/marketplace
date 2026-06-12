import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { TariffPlan } from '@prisma/client';

const TARIFF_PRICE: Record<TariffPlan, number> = {
  FREE: 0,
  STANDARD: 199_000,
  PRO: 499_000,
  PREMIUM: 999_000,
};

@Injectable()
export class SuperDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getKpi() {
    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      trialTenants,
      tariffGroups,
      newThisMonth,
      todayOrders,
      todayRevenue,
      aiSpend,
      storage,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      this.prisma.tenant.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.tenant.count({ where: { isOnTrial: true } }),
      this.prisma.tenant.groupBy({
        by: ['tariffPlan'],
        where: { status: 'ACTIVE' },
        _count: { _all: true },
      }),
      this.prisma.tenant.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      this.prisma.order.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          status: { not: 'CANCELLED' },
        },
        _sum: { total: true },
      }),
      this.prisma.aICreditUsage.aggregate({
        where: {
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
        _sum: { costUsd: true, costUzs: true },
      }),
      this.prisma.tenantResourceStat.aggregate({
        where: {
          date: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        _sum: { storageMb: true },
      }),
    ]);

    // MRR — har bir faol tarif × narx
    const mrr = tariffGroups.reduce(
      (sum, g) => sum + g._count._all * TARIFF_PRICE[g.tariffPlan],
      0,
    );

    return {
      totalTenants,
      activeTenants,
      suspendedTenants,
      trialTenants,
      mrr,
      arr: mrr * 12,
      newThisMonth,
      churnRate: 0, // TODO: oxirgi 30 kun ichida CANCELLED bo'lganlar
      aiSpendUsd: Number(aiSpend._sum.costUsd ?? 0),
      aiSpendUzs: Number(aiSpend._sum.costUzs ?? 0),
      storageGb: Number(storage._sum.storageMb ?? 0) / 1024,
      todayOrders,
      todayRevenue: Number(todayRevenue._sum.total ?? 0),
    };
  }

  async getRevenueChart(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    // Kunlik buyurtma daromadi + yangi obunalar
    const orders = await this.prisma.order.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: since },
        status: { not: 'CANCELLED' },
      },
      _sum: { total: true },
    });

    const subs = await this.prisma.subscription.groupBy({
      by: ['startsAt'],
      where: { startsAt: { gte: since } },
      _count: { _all: true },
    });

    // Kunlar bo'yicha aggregate
    const map = new Map<string, { revenue: number; newSubs: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, { revenue: 0, newSubs: 0 });
    }

    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      const cur = map.get(key) ?? { revenue: 0, newSubs: 0 };
      cur.revenue += Number(o._sum.total ?? 0);
      map.set(key, cur);
    }
    for (const s of subs) {
      const key = s.startsAt.toISOString().slice(0, 10);
      const cur = map.get(key) ?? { revenue: 0, newSubs: 0 };
      cur.newSubs += s._count._all;
      map.set(key, cur);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));
  }

  async getTariffDistribution() {
    const groups = await this.prisma.tenant.groupBy({
      by: ['tariffPlan'],
      where: { status: 'ACTIVE' },
      _count: { _all: true },
    });

    const order: TariffPlan[] = ['FREE', 'STANDARD', 'PRO', 'PREMIUM'];
    return order.map((plan) => {
      const found = groups.find((g) => g.tariffPlan === plan);
      const count = found?._count._all ?? 0;
      return {
        plan,
        count,
        mrr: count * TARIFF_PRICE[plan],
      };
    });
  }

  async getActivity(limit = 20) {
    // So'nggi yangi tenant'lar + invoyslar + suspended
    const [newTenants, paidInvoices, failedInvoices] = await Promise.all([
      this.prisma.tenant.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, shopName: true, tariffPlan: true, createdAt: true },
      }),
      this.prisma.invoice.findMany({
        where: { status: 'PAID' },
        orderBy: { paidAt: 'desc' },
        take: limit,
        select: {
          id: true,
          amount: true,
          paidAt: true,
          tenantId: true,
          tenant: { select: { shopName: true } },
        },
      }),
      this.prisma.invoice.findMany({
        where: { status: 'FAILED' },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          amount: true,
          updatedAt: true,
          tenantId: true,
          tenant: { select: { shopName: true } },
        },
      }),
    ]);

    type Event = {
      id: string;
      type:
        | 'tenant_signup'
        | 'tariff_upgrade'
        | 'payment_success'
        | 'payment_failed'
        | 'tenant_suspended'
        | 'support_ticket';
      tenantName: string | null;
      tenantId: string | null;
      description: string;
      amount?: number;
      createdAt: string;
    };

    const events: Event[] = [
      ...newTenants.map((t) => ({
        id: `signup-${t.id}`,
        type: 'tenant_signup' as const,
        tenantName: t.shopName,
        tenantId: t.id,
        description: `Yangi do'kon ro'yxatdan o'tdi (${t.tariffPlan})`,
        createdAt: t.createdAt.toISOString(),
      })),
      ...paidInvoices.map((i) => ({
        id: `paid-${i.id}`,
        type: 'payment_success' as const,
        tenantName: i.tenant.shopName,
        tenantId: i.tenantId,
        description: `To'lov qabul qilindi`,
        amount: Number(i.amount),
        createdAt: (i.paidAt ?? new Date()).toISOString(),
      })),
      ...failedInvoices.map((i) => ({
        id: `failed-${i.id}`,
        type: 'payment_failed' as const,
        tenantName: i.tenant.shopName,
        tenantId: i.tenantId,
        description: `To'lov muvaffaqiyatsiz`,
        amount: Number(i.amount),
        createdAt: i.updatedAt.toISOString(),
      })),
    ];

    return events
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }
}
