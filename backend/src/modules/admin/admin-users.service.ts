import { Injectable, NotFoundException } from '@nestjs/common';
import { EventType, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { buildCursorPage, type CursorPage } from '@/common/helpers/pagination';

export interface ListUsersParams {
  q?: string;
  isBlocked?: boolean;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: ListUsersParams): Promise<CursorPage<unknown>> {
    const limit = Math.min(Math.max(params.limit ?? 30, 1), 100);
    const take = limit + 1;
    const where: Prisma.UserWhereInput = {
      ...(params.isBlocked !== undefined ? { isBlocked: params.isBlocked } : {}),
      ...(params.q
        ? {
            OR: [
              { username: { contains: params.q, mode: 'insensitive' } },
              { firstName: { contains: params.q, mode: 'insensitive' } },
              { lastName: { contains: params.q, mode: 'insensitive' } },
              { phone: { contains: params.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const rows = await this.prisma.user.findMany({
      where,
      orderBy: [{ lastSeenAt: 'desc' }, { id: 'desc' }],
      take,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: {
        _count: { select: { orders: true, cart: true, favorites: true } },
      },
    });
    const items = rows.map((u) => ({
      id: u.id,
      telegramId: u.telegramId.toString(),
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      photoUrl: u.photoUrl,
      phone: u.phone,
      language: u.language,
      isBlocked: u.isBlocked,
      ordersCount: u._count.orders,
      cartCount: u._count.cart,
      favoritesCount: u._count.favorites,
      lastSeenAt: u.lastSeenAt,
      createdAt: u.createdAt,
    }));
    return buildCursorPage(items, limit);
  }

  async getById(id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      include: {
        _count: { select: { orders: true, cart: true, favorites: true, events: true } },
      },
    });
    if (!u) throw new NotFoundException('User not found');

    const totals = await this.prisma.order.aggregate({
      where: { userId: id, status: { not: 'CANCELLED' } },
      _sum: { total: true },
      _count: true,
      _avg: { total: true },
    });

    return {
      ...u,
      telegramId: u.telegramId.toString(),
      stats: {
        ordersCount: totals._count,
        revenue: totals._sum.total ? Number(totals._sum.total) : 0,
        avgOrderValue: totals._avg.total ? Number(totals._avg.total) : 0,
        cartCount: u._count.cart,
        favoritesCount: u._count.favorites,
        eventsCount: u._count.events,
      },
    };
  }

  async block(id: string, isBlocked: boolean) {
    return this.prisma.user.update({ where: { id }, data: { isBlocked } });
  }

  async timeline(userId: string, params: { type?: EventType; from?: string; to?: string; cursor?: string; limit?: number }): Promise<CursorPage<unknown>> {
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
    const take = limit + 1;
    const where: Prisma.UserEventWhereInput = {
      userId,
      ...(params.type ? { type: params.type } : {}),
      ...(params.from || params.to
        ? {
            createdAt: {
              ...(params.from ? { gte: new Date(params.from) } : {}),
              ...(params.to ? { lte: new Date(params.to) } : {}),
            },
          }
        : {}),
    };
    const rows = await this.prisma.userEvent.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: {
        product: { select: { id: true, titleUz: true, images: { take: 1, orderBy: { position: 'asc' } } } },
      },
    });
    const items = rows.map((e) => ({
      id: e.id,
      type: e.type,
      productId: e.productId,
      categoryId: e.categoryId,
      payload: e.payload,
      product: e.product
        ? {
            id: e.product.id,
            title: e.product.titleUz,
            imageUrl: e.product.images[0]?.url ?? null,
          }
        : null,
      createdAt: e.createdAt,
    }));
    return buildCursorPage(items, limit);
  }

  async interests(userId: string) {
    // Top categories by weighted score
    const categoryRows = await this.prisma.$queryRaw<
      Array<{ categoryId: string; titleUz: string; titleRu: string; score: number; views: number; cartAdds: number; favorites: number; orders: number }>
    >`
      SELECT
        c.id as "categoryId",
        c."titleUz" as "titleUz",
        c."titleRu" as "titleRu",
        SUM(CASE WHEN ue.type = 'VIEW_PRODUCT' THEN 3 ELSE 0 END) +
        SUM(CASE WHEN ue.type = 'FAVORITE_ADD' THEN 5 ELSE 0 END) +
        SUM(CASE WHEN ue.type = 'CART_ADD' THEN 8 ELSE 0 END) +
        SUM(CASE WHEN ue.type = 'ORDER_PLACED' THEN 20 ELSE 0 END) AS score,
        SUM(CASE WHEN ue.type = 'VIEW_PRODUCT' THEN 1 ELSE 0 END)::int AS views,
        SUM(CASE WHEN ue.type = 'CART_ADD' THEN 1 ELSE 0 END)::int AS "cartAdds",
        SUM(CASE WHEN ue.type = 'FAVORITE_ADD' THEN 1 ELSE 0 END)::int AS favorites,
        SUM(CASE WHEN ue.type = 'ORDER_PLACED' THEN 1 ELSE 0 END)::int AS orders
      FROM "UserEvent" ue
      LEFT JOIN "Product" p ON ue."productId" = p.id
      JOIN "Category" c ON p."categoryId" = c.id
      WHERE ue."userId" = ${userId}
        AND ue."createdAt" >= NOW() - INTERVAL '90 days'
      GROUP BY c.id, c."titleUz", c."titleRu"
      HAVING SUM(CASE WHEN ue.type IN ('VIEW_PRODUCT','FAVORITE_ADD','CART_ADD','ORDER_PLACED') THEN 1 ELSE 0 END) > 0
      ORDER BY score DESC
      LIMIT 10;
    `;

    // Top viewed products
    const viewedProducts = await this.prisma.userEvent.groupBy({
      by: ['productId'],
      where: {
        userId,
        type: 'VIEW_PRODUCT',
        productId: { not: null },
        createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
      _count: { _all: true },
      orderBy: { _count: { productId: 'desc' } },
      take: 10,
    });
    const productIds = viewedProducts.map((v) => v.productId).filter((id): id is string => Boolean(id));
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { images: { orderBy: { position: 'asc' }, take: 1 } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    const topProducts: Array<{ id: string; title: string; imageUrl: string | null; viewCount: number }> = [];
    for (const v of viewedProducts) {
      const p = v.productId ? productMap.get(v.productId) : null;
      if (!p) continue;
      topProducts.push({
        id: p.id,
        title: p.titleUz,
        imageUrl: p.images[0]?.url ?? null,
        viewCount: v._count._all,
      });
    }

    // Cart abandonment for this user
    const abandonedProductIds = await this.prisma.$queryRaw<Array<{ productId: string; titleUz: string; addCount: number }>>`
      SELECT
        p.id as "productId",
        p."titleUz" as "titleUz",
        COUNT(*)::int AS "addCount"
      FROM "UserEvent" ue
      JOIN "Product" p ON ue."productId" = p.id
      WHERE ue."userId" = ${userId}
        AND ue.type = 'CART_ADD'
        AND ue."createdAt" >= NOW() - INTERVAL '30 days'
        AND NOT EXISTS (
          SELECT 1 FROM "Order" o
          JOIN "OrderItem" oi ON oi."orderId" = o.id
          WHERE o."userId" = ${userId}
            AND oi."productId" = ue."productId"
            AND o.status != 'CANCELLED'
            AND o."createdAt" >= ue."createdAt"
        )
      GROUP BY p.id, p."titleUz"
      ORDER BY "addCount" DESC
      LIMIT 10;
    `;

    return {
      topCategories: categoryRows.map((c) => ({
        ...c,
        score: Number(c.score),
      })),
      topProducts,
      cartAbandonment: abandonedProductIds,
    };
  }

  async orders(userId: string, params: { cursor?: string; limit?: number }): Promise<CursorPage<unknown>> {
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const take = limit + 1;
    const rows = await this.prisma.order.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: { _count: { select: { items: true } } },
    });
    const items = rows.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      total: Number(o.total),
      itemsCount: o._count.items,
      createdAt: o.createdAt,
    }));
    return buildCursorPage(items, limit);
  }
}
