import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { Prisma, AIOperation } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { SuperJwtGuard, PlatformRoles, PlatformRolesGuard } from './super-jwt.guard';

class ListQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
  @IsOptional() @IsString() tenantId?: string;
  @IsOptional() @IsString() operation?: string;
  @IsOptional() @IsString() since?: string;
}

@Controller('super-admin/ai')
@UseGuards(SuperJwtGuard, PlatformRolesGuard)
@PlatformRoles('DEVOPS', 'FINANCE')
export class SuperAiController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('overview')
  async overview() {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

    const [mtd, today, byOp, byModel] = await Promise.all([
      this.prisma.aICreditUsage.aggregate({
        where: { createdAt: { gte: monthStart } },
        _sum: { costUsd: true, costUzs: true, inputTokens: true, outputTokens: true, imagesCount: true },
        _count: { _all: true },
      }),
      this.prisma.aICreditUsage.aggregate({
        where: { createdAt: { gte: todayStart } },
        _sum: { costUsd: true, costUzs: true },
        _count: { _all: true },
      }),
      this.prisma.aICreditUsage.groupBy({
        by: ['operation'],
        where: { createdAt: { gte: monthStart } },
        _sum: { costUsd: true },
        _count: { _all: true },
      }),
      this.prisma.aICreditUsage.groupBy({
        by: ['model'],
        where: { createdAt: { gte: monthStart } },
        _sum: { costUsd: true },
        _count: { _all: true },
      }),
    ]);

    return {
      mtd: {
        costUsd: Number(mtd._sum.costUsd ?? 0),
        costUzs: Number(mtd._sum.costUzs ?? 0),
        totalCalls: mtd._count._all,
        totalImages: mtd._sum.imagesCount ?? 0,
        totalInputTokens: mtd._sum.inputTokens ?? 0,
        totalOutputTokens: mtd._sum.outputTokens ?? 0,
      },
      today: {
        costUsd: Number(today._sum.costUsd ?? 0),
        costUzs: Number(today._sum.costUzs ?? 0),
        totalCalls: today._count._all,
      },
      byOperation: byOp.map((r) => ({
        operation: r.operation,
        costUsd: Number(r._sum.costUsd ?? 0),
        calls: r._count._all,
      })),
      byModel: byModel.map((r) => ({
        model: r.model,
        costUsd: Number(r._sum.costUsd ?? 0),
        calls: r._count._all,
      })),
    };
  }

  @Get('top-consumers')
  async topConsumers() {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const groups = await this.prisma.aICreditUsage.groupBy({
      by: ['tenantId'],
      where: { createdAt: { gte: monthStart } },
      _sum: { costUsd: true, costUzs: true },
      _count: { _all: true },
      orderBy: { _sum: { costUsd: 'desc' } },
      take: 20,
    });

    if (groups.length === 0) return [];

    const tenants = await this.prisma.tenant.findMany({
      where: { id: { in: groups.map((g) => g.tenantId) } },
      select: { id: true, shopName: true, tariffPlan: true, logoUrl: true },
    });
    const tenantMap = new Map(tenants.map((t) => [t.id, t]));

    return groups.map((g) => ({
      tenant: tenantMap.get(g.tenantId) ?? null,
      tenantId: g.tenantId,
      costUsd: Number(g._sum.costUsd ?? 0),
      costUzs: Number(g._sum.costUzs ?? 0),
      calls: g._count._all,
    }));
  }

  @Get('usage')
  async usage(@Query() q: ListQuery) {
    const page = Math.max(1, q.page ?? 1);
    const pageSize = Math.min(100, q.pageSize ?? 50);

    const where: Prisma.AICreditUsageWhereInput = {};
    if (q.tenantId) where.tenantId = q.tenantId;
    if (q.operation) where.operation = q.operation as AIOperation;
    if (q.since) where.createdAt = { gte: new Date(q.since) };

    const [total, items] = await Promise.all([
      this.prisma.aICreditUsage.count({ where }),
      this.prisma.aICreditUsage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          tenant: { select: { id: true, shopName: true, logoUrl: true } },
        },
      }),
    ]);

    return { items, total, page, pageSize };
  }

  @Get('daily-chart')
  async dailyChart(@Query('days') daysRaw?: string) {
    const days = Math.min(90, Math.max(7, Number(daysRaw) || 30));
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const rows = await this.prisma.aICreditUsage.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, costUsd: true, costUzs: true },
    });

    const map = new Map<string, { costUsd: number; costUzs: number; calls: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      map.set(d.toISOString().slice(0, 10), { costUsd: 0, costUzs: 0, calls: 0 });
    }
    for (const r of rows) {
      const key = r.createdAt.toISOString().slice(0, 10);
      const cur = map.get(key) ?? { costUsd: 0, costUzs: 0, calls: 0 };
      cur.costUsd += Number(r.costUsd);
      cur.costUzs += Number(r.costUzs);
      cur.calls += 1;
      map.set(key, cur);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));
  }
}
