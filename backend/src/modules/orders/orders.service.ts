import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus, PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { localizeTitle, type Locale } from '@/common/helpers/localize';
import { buildCursorPage, type CursorPage } from '@/common/helpers/pagination';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import { SettingsService } from '../settings/settings.service';
import { UploadsService } from '../uploads/uploads.service';
import { TenantBotService } from '../telegram-bot/tenant-bot.service';
import { customAlphabet } from 'nanoid';

const orderNumberId = customAlphabet('0123456789', 6);

export interface CreateOrderInput {
  receiverName: string;
  receiverPhone: string;
  address: string;
  latitude?: number;
  longitude?: number;
  paymentMethod?: PaymentMethod;
  note?: string;
  promoCode?: string;
}

export interface OrderListItemDto {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  itemsCount: number;
  previewImages: string[];
  createdAt: Date;
}

export interface OrderDetailDto {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  receiverName: string;
  receiverPhone: string;
  address: string;
  note: string | null;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  total: number;
  promoSnapshot: string | null;
  items: Array<{
    id: string;
    productId: string;
    title: string;
    variantLabel: string | null;
    imageUrl: string | null;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }>;
  events: Array<{ status: OrderStatus; comment: string | null; createdAt: Date }>;
  paidAt: Date | null;
  paymentReceiptUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promos: PromoCodesService,
    private readonly events: EventEmitter2,
    private readonly settings: SettingsService,
    private readonly uploads: UploadsService,
    private readonly tenantBot: TenantBotService,
  ) {}

  private buildVariantLabel(v: { color: string | null; size: string | null }): string | null {
    const parts: string[] = [];
    if (v.color) parts.push(`Rang: ${v.color}`);
    if (v.size) parts.push(`O'lcham: ${v.size}`);
    return parts.length > 0 ? parts.join(', ') : null;
  }

  private async generateOrderNumber(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const candidate = `M-${orderNumberId()}`;
      const exists = await this.prisma.order.findUnique({ where: { orderNumber: candidate } });
      if (!exists) return candidate;
    }
    throw new Error('Failed to generate unique order number');
  }

  async create(
    userId: string,
    input: CreateOrderInput,
    tenantId?: string | null,
  ): Promise<OrderDetailDto> {
    const allCartItems = await this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: { images: { orderBy: { position: 'asc' }, take: 1 } },
        },
        variant: true,
      },
    });
    // Faqat shu do'kon (tenant) mahsulotlari bilan buyurtma tuziladi
    const cartItems = allCartItems.filter(
      (ci) => (ci.product.tenantId ?? null) === (tenantId ?? null),
    );
    if (cartItems.length === 0) throw new BadRequestException('Cart is empty');

    let subtotal = 0;
    for (const i of cartItems) {
      const unit = i.variant ? Number(i.variant.price) : Number(i.product.basePrice);
      subtotal += unit * i.quantity;
      if (i.variant && i.variant.stock < i.quantity) {
        throw new BadRequestException(`Not enough stock for ${i.product.titleUz}`);
      }
    }

    const business = await this.settings.getBusiness();
    if (subtotal < business.minOrderAmount) {
      throw new BadRequestException(`Minimum order amount is ${business.minOrderAmount}`);
    }

    let discountAmount = 0;
    let promoId: string | null = null;
    let promoSnapshot: string | null = null;
    if (input.promoCode) {
      const evaluation = await this.promos.evaluate(userId, input.promoCode, subtotal, tenantId);
      discountAmount = evaluation.discountAmount;
      promoId = evaluation.promo.id;
      promoSnapshot = evaluation.promo.code;
    }

    const deliveryFee =
      subtotal - discountAmount >= business.freeDeliveryThreshold ? 0 : business.deliveryFee;
    const total = subtotal - discountAmount + deliveryFee;

    const orderNumber = await this.generateOrderNumber();

    const created = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          tenantId: tenantId ?? null,
          userId,
          status: OrderStatus.PENDING,
          paymentMethod: input.paymentMethod ?? PaymentMethod.CASH_ON_DELIVERY,
          receiverName: input.receiverName,
          receiverPhone: input.receiverPhone,
          address: input.address,
          latitude: input.latitude,
          longitude: input.longitude,
          note: input.note ?? null,
          subtotal,
          discountAmount,
          deliveryFee,
          total,
          promoCodeId: promoId,
          promoSnapshot,
          events: { create: { status: OrderStatus.PENDING, comment: 'Order created' } },
          items: {
            create: cartItems.map((i) => {
              const unit = i.variant ? Number(i.variant.price) : Number(i.product.basePrice);
              return {
                productId: i.productId,
                variantId: i.variantId,
                titleUz: i.product.titleUz,
                titleRu: i.product.titleRu,
                variantLabel: i.variant ? this.buildVariantLabel(i.variant) : null,
                imageUrl: i.variant?.imageUrl ?? i.product.images[0]?.url ?? null,
                unitPrice: unit,
                quantity: i.quantity,
                lineTotal: unit * i.quantity,
              };
            }),
          },
        },
      });

      // Decrement variant stock and product sold count.
      // ATOMIK: shartli updateMany (stock >= quantity) — ikki bir vaqtdagi
      // buyurtma bir variantni manfiyga tushira olmaydi (oversell oldini oladi).
      for (const i of cartItems) {
        if (i.variantId) {
          const dec = await tx.productVariant.updateMany({
            where: { id: i.variantId, stock: { gte: i.quantity } },
            data: { stock: { decrement: i.quantity } },
          });
          if (dec.count === 0) {
            throw new BadRequestException(
              `"${i.product.titleUz}" — yetarli zaxira yo'q (omborda qoldi tugadi)`,
            );
          }
        }
        await tx.product.update({
          where: { id: i.productId },
          data: { soldCount: { increment: i.quantity } },
        });
      }

      if (promoId) {
        // ATOMIK: global limitni tx ichida qayta tekshiramiz. Prisma updateMany
        // ustun-ustun solishtira olmaydi, shuning uchun raw SQL ishlatamiz.
        const affected = await tx.$executeRaw`
          UPDATE "PromoCode"
          SET "usageCount" = "usageCount" + 1
          WHERE id = ${promoId}
            AND ("usageLimit" IS NULL OR "usageCount" < "usageLimit")
        `;
        if (affected === 0) {
          throw new BadRequestException('Promokod limiti tugagan');
        }
        // Per-user limitni tx ichida tekshiramiz (race oynasi juda kichik)
        const used = await tx.promoCodeUsage.count({ where: { promoCodeId: promoId, userId } });
        const promoRow = await tx.promoCode.findUnique({
          where: { id: promoId },
          select: { perUserLimit: true },
        });
        if (promoRow && used >= promoRow.perUserLimit) {
          throw new BadRequestException('Bu promokoddan foydalanish limiti tugagan');
        }
        await tx.promoCodeUsage.create({
          data: { promoCodeId: promoId, userId, orderId: order.id },
        });
      }

      await tx.cartItem.deleteMany({ where: { userId } });
      return order;
    });

    this.events.emit('order.created', { orderId: created.id });

    return this.getById(created.id, userId, 'uz');
  }

  async summary(userId: string): Promise<{ count: number; activeCount: number }> {
    const [count, activeCount] = await Promise.all([
      this.prisma.order.count({ where: { userId } }),
      this.prisma.order.count({
        where: {
          userId,
          status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.ON_THE_WAY] },
        },
      }),
    ]);
    return { count, activeCount };
  }

  async list(
    userId: string,
    params: { status?: OrderStatus; cursor?: string; limit?: number },
    lang: Locale,
  ): Promise<CursorPage<OrderListItemDto>> {
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const take = limit + 1;

    const where: Prisma.OrderWhereInput = {
      userId,
      ...(params.status ? { status: params.status } : {}),
    };

    const rows = await this.prisma.order.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: {
        items: { take: 4 },
      },
    });

    const items: OrderListItemDto[] = rows.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      total: Number(o.total),
      itemsCount: o.items.length,
      previewImages: o.items.map((i) => i.imageUrl ?? '').filter((u) => u !== '').slice(0, 4),
      createdAt: o.createdAt,
    }));

    return buildCursorPage(items, limit);
  }

  async getById(id: string, userId: string, lang: Locale): Promise<OrderDetailDto> {
    const o = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!o) throw new NotFoundException('Order not found');
    if (o.userId !== userId) throw new ForbiddenException('Forbidden');

    return {
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentMethod: o.paymentMethod,
      receiverName: o.receiverName,
      receiverPhone: o.receiverPhone,
      address: o.address,
      note: o.note,
      subtotal: Number(o.subtotal),
      discountAmount: Number(o.discountAmount),
      deliveryFee: Number(o.deliveryFee),
      total: Number(o.total),
      promoSnapshot: o.promoSnapshot,
      items: o.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        title: lang === 'ru' ? i.titleRu : i.titleUz,
        variantLabel: i.variantLabel,
        imageUrl: i.imageUrl,
        unitPrice: Number(i.unitPrice),
        quantity: i.quantity,
        lineTotal: Number(i.lineTotal),
      })),
      events: o.events.map((e) => ({ status: e.status, comment: e.comment, createdAt: e.createdAt })),
      paidAt: o.paidAt,
      paymentReceiptUrl: o.paymentReceiptUrl,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    };
  }

  /**
   * Karta o'tkazma to'lovi cheki — mijoz chek rasmini yuklaydi,
   * chek sotuvchining tasdiqlash kanaliga tugmalar bilan boradi.
   */
  async uploadReceipt(
    orderId: string,
    userId: string,
    fileBuffer: Buffer,
  ): Promise<{ ok: boolean }> {
    const o = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: true },
    });
    if (!o) throw new NotFoundException('Order not found');
    if (o.userId !== userId) throw new ForbiddenException('Forbidden');
    if (o.paymentMethod !== PaymentMethod.CARD_TRANSFER) {
      throw new BadRequestException('Bu buyurtma karta o\'tkazma orqali emas');
    }
    if (o.paidAt) throw new BadRequestException('To\'lov allaqachon tasdiqlangan');
    if (!o.tenantId) throw new BadRequestException('Do\'kon topilmadi');

    // Rasmni saqlaymiz (do'kon sahifasida ko'rsatish uchun)
    const saved = await this.uploads.saveImage(fileBuffer);

    const itemLines = o.items
      .map((i) => `• ${i.titleUz}${i.variantLabel ? ` (${i.variantLabel})` : ''} × ${i.quantity}`)
      .join('\n');
    const userLine = o.user.username ? `@${o.user.username}` : o.user.firstName ?? `ID ${o.user.telegramId}`;
    const caption =
      `🧾 <b>To'lov cheki — tasdiqlash kerak</b>\n\n` +
      `<b>Buyurtma:</b> #${o.orderNumber}\n` +
      `<b>Mijoz:</b> ${o.receiverName} (${userLine})\n` +
      `<b>Telefon:</b> ${o.receiverPhone}\n` +
      `<b>Manzil:</b> ${o.address}\n\n` +
      `${itemLines}\n\n` +
      `<b>Jami: ${Number(o.total).toLocaleString('ru-RU').replace(/,/g, ' ')} so'm</b>`;

    let messageId: number | null = null;
    try {
      messageId = await this.tenantBot.sendReceiptToChannel(o.tenantId, fileBuffer, caption, o.id);
    } catch {
      throw new BadRequestException('Chekni yuborishda xatolik. Keyinroq urinib ko\'ring.');
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentReceiptUrl: saved.url,
        payReceiptMessageId: messageId,
        events: { create: { status: o.status, comment: "To'lov cheki yuklandi" } },
      },
    });
    return { ok: true };
  }

  async cancel(id: string, userId: string): Promise<OrderDetailDto> {
    const o = await this.prisma.order.findUnique({ where: { id } });
    if (!o) throw new NotFoundException('Order not found');
    if (o.userId !== userId) throw new ForbiddenException('Forbidden');
    if (o.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be cancelled');
    }
    const hourAgo = Date.now() - 60 * 60 * 1000;
    if (o.createdAt.getTime() < hourAgo) {
      throw new BadRequestException('Cancellation window expired');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          events: { create: { status: OrderStatus.CANCELLED, comment: 'Cancelled by user' } },
        },
      });
      // Restore stock
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
    });

    this.events.emit('order.status_changed', { orderId: id, status: OrderStatus.CANCELLED });
    return this.getById(id, userId, 'uz');
  }
}
