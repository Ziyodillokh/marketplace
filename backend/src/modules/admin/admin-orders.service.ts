import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { buildCursorPage, type CursorPage } from '@/common/helpers/pagination';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';
import { TenantBotService } from '../telegram-bot/tenant-bot.service';

export interface ListOrdersParams {
  status?: OrderStatus;
  q?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class AdminOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly bot: TelegramBotService,
    private readonly tenantBot: TenantBotService,
  ) {}

  async list(params: ListOrdersParams, tenantId?: string | null): Promise<CursorPage<unknown>> {
    const limit = Math.min(Math.max(params.limit ?? 30, 1), 100);
    const take = limit + 1;
    const where: Prisma.OrderWhereInput = {
      ...(tenantId ? { tenantId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.from || params.to
        ? {
            createdAt: {
              ...(params.from ? { gte: new Date(params.from) } : {}),
              ...(params.to ? { lte: new Date(params.to) } : {}),
            },
          }
        : {}),
      ...(params.q
        ? {
            OR: [
              { orderNumber: { contains: params.q, mode: 'insensitive' } },
              { receiverName: { contains: params.q, mode: 'insensitive' } },
              { receiverPhone: { contains: params.q, mode: 'insensitive' } },
              { user: { username: { contains: params.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const rows = await this.prisma.order.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: {
        user: { select: { id: true, username: true, firstName: true, telegramId: true } },
        items: { take: 4, select: { imageUrl: true, titleUz: true, quantity: true } },
        _count: { select: { items: true } },
      },
    });
    const items = rows.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      total: Number(o.total),
      subtotal: Number(o.subtotal),
      discountAmount: Number(o.discountAmount),
      deliveryFee: Number(o.deliveryFee),
      receiverName: o.receiverName,
      receiverPhone: o.receiverPhone,
      address: o.address,
      paymentMethod: o.paymentMethod,
      itemsCount: o._count.items,
      previewImages: o.items.map((i) => i.imageUrl).filter((u): u is string => Boolean(u)).slice(0, 4),
      user: {
        id: o.user.id,
        username: o.user.username,
        firstName: o.user.firstName,
        telegramId: o.user.telegramId.toString(),
      },
      createdAt: o.createdAt,
    }));
    return buildCursorPage(items, limit);
  }

  async getById(id: string, tenantId?: string | null) {
    const o = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        items: { orderBy: { id: 'asc' } },
        events: { orderBy: { createdAt: 'asc' } },
        promoCode: true,
      },
    });
    if (!o) throw new NotFoundException('Order not found');
    if (tenantId && o.tenantId !== tenantId) throw new NotFoundException('Order not found');
    return {
      ...o,
      subtotal: Number(o.subtotal),
      discountAmount: Number(o.discountAmount),
      deliveryFee: Number(o.deliveryFee),
      total: Number(o.total),
      items: o.items.map((i) => ({
        ...i,
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.lineTotal),
      })),
      user: {
        ...o.user,
        telegramId: o.user.telegramId.toString(),
      },
    };
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    comment: string | undefined,
    adminId: string,
    tenantId?: string | null,
  ) {
    const o = await this.prisma.order.findUnique({ where: { id } });
    if (!o) throw new NotFoundException('Order not found');
    if (tenantId && o.tenantId !== tenantId) throw new NotFoundException('Order not found');
    if (o.status === status) throw new BadRequestException('Same status');

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          status,
          events: { create: { status, comment: comment ?? null, changedBy: adminId } },
        },
      });
      if (status === OrderStatus.CANCELLED && o.status !== OrderStatus.CANCELLED) {
        const items = await tx.orderItem.findMany({ where: { orderId: id } });
        for (const i of items) {
          if (i.variantId) {
            await tx.productVariant.update({
              where: { id: i.variantId },
              data: { stock: { increment: i.quantity } },
            });
          }
          await tx.product.update({
            where: { id: i.productId },
            data: { soldCount: { decrement: i.quantity } },
          });
        }
      }
    });

    this.events.emit('order.status_changed', { orderId: id, status });
    // Foydalanuvchining real-time WebApp uchun
    this.events.emit('user.order.status_changed', {
      userId: o.userId,
      orderId: id,
      status,
      orderNumber: o.orderNumber,
    });
    return this.getById(id, tenantId);
  }

  async sendMessageToUser(id: string, text: string, tenantId?: string | null) {
    const o = await this.prisma.order.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!o) throw new NotFoundException('Order not found');
    if (tenantId && o.tenantId !== tenantId) throw new NotFoundException('Order not found');
    // Mijozга do'kon (sotuvchi) boti orqali — ulanmagan bo'lsa global botga fallback.
    const sent = await this.tenantBot.sendToCustomer(o.tenantId, o.user.telegramId, text);
    if (!sent) await this.bot.sendDirectMessage(o.user.telegramId, text);
    return { ok: true };
  }
}
