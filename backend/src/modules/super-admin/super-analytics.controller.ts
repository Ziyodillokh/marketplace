import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SuperJwtGuard, PlatformRolesGuard } from './super-jwt.guard';

@Controller('super-admin/analytics')
@UseGuards(SuperJwtGuard, PlatformRolesGuard)
export class SuperAnalyticsController {
  constructor(private readonly prisma: PrismaService) {}

  /** Funnel: signup → first product → first order → upgrade from FREE */
  @Get('funnel')
  async funnel() {
    const [total, withProducts, withOrders, paidTariff] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { totalOrders: { gt: 0 } } }),
      this.prisma.tenant.count({ where: { totalRevenue: { gt: 0 } } }),
      this.prisma.tenant.count({ where: { tariffPlan: { not: 'FREE' } } }),
    ]);

    return [
      { step: 'signup', label: "Ro'yxatdan o'tdi", count: total },
      { step: 'first_order', label: '1-buyurtma qildi', count: withProducts },
      { step: 'first_revenue', label: 'Sotuvi bo\'ldi', count: withOrders },
      { step: 'paid_upgrade', label: "Pulli tarifga o'tdi", count: paidTariff },
    ];
  }

  /** Cohort: oyma-oy ro'yxatdan o'tganlar va ularning faolligi */
  @Get('cohort')
  async cohort(@Query('months') monthsRaw?: string) {
    const months = Math.min(12, Math.max(1, Number(monthsRaw) || 6));
    const buckets: Array<{
      month: string;
      total: number;
      active: number;
      paying: number;
      revenue: number;
    }> = [];

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date();
      start.setMonth(start.getMonth() - i, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);

      const [total, active, paying] = await Promise.all([
        this.prisma.tenant.count({
          where: { createdAt: { gte: start, lt: end } },
        }),
        this.prisma.tenant.count({
          where: { createdAt: { gte: start, lt: end }, status: 'ACTIVE' },
        }),
        this.prisma.tenant.count({
          where: {
            createdAt: { gte: start, lt: end },
            tariffPlan: { not: 'FREE' },
          },
        }),
      ]);

      const revenueAgg = await this.prisma.tenant.aggregate({
        where: { createdAt: { gte: start, lt: end } },
        _sum: { totalRevenue: true },
      });

      buckets.push({
        month: start.toISOString().slice(0, 7),
        total,
        active,
        paying,
        revenue: Number(revenueAgg._sum.totalRevenue ?? 0),
      });
    }

    return buckets;
  }

  /** Geografik tahlil — viloyat bo'yicha buyurtmalar */
  @Get('geo')
  async geo() {
    const orders = await this.prisma.order.findMany({
      where: { status: { not: 'CANCELLED' } },
      select: { address: true, total: true },
      take: 5000,
      orderBy: { createdAt: 'desc' },
    });

    const REGIONS = [
      'Toshkent',
      'Samarqand',
      'Buxoro',
      "Farg'ona",
      'Andijon',
      'Namangan',
      'Qashqadaryo',
      'Surxondaryo',
      'Xorazm',
      'Jizzax',
      'Sirdaryo',
      'Navoiy',
      'Qoraqalpog\'iston',
    ];

    const map = new Map<string, { count: number; revenue: number }>();
    for (const r of REGIONS) map.set(r, { count: 0, revenue: 0 });

    for (const o of orders) {
      const region = REGIONS.find((r) =>
        o.address?.toLowerCase().includes(r.toLowerCase()),
      ) ?? 'Boshqa';
      const cur = map.get(region) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += Number(o.total);
      map.set(region, cur);
    }

    return Array.from(map.entries())
      .map(([region, v]) => ({ region, ...v }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  /** Status bo'yicha tenant taqsimoti */
  @Get('status-distribution')
  async statusDistribution() {
    const groups = await this.prisma.tenant.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    return groups.map((g) => ({ status: g.status, count: g._count._all }));
  }
}
