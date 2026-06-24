import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { OrderStatus, PaymentMethod } from '@prisma/client';
import { InlineKeyboard } from 'grammy';
import { PrismaService } from '@/prisma/prisma.service';
import { TelegramBotService } from './telegram-bot.service';
import { TenantBotService } from './tenant-bot.service';

@Injectable()
export class TelegramOrdersListener implements OnModuleInit {
  private readonly logger = new Logger(TelegramOrdersListener.name);

  constructor(
    private readonly bot: TelegramBotService,
    private readonly tenantBot: TenantBotService,
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * Mijozга xabar yuboradi — avval do'kon (sotuvchi) boti orqali, ulanmagan
   * bo'lsa global (Sellio) botiga fallback. Mijoz do'konni o'z boti orqali
   * ochgani uchun xabar shu botdan kelishi to'g'ri.
   */
  private async notifyCustomer(
    tenantId: string | null,
    telegramId: bigint,
    text: string,
  ): Promise<void> {
    const sent = await this.tenantBot.sendToCustomer(tenantId, telegramId, text);
    if (!sent) await this.bot.sendDirectMessage(telegramId, text);
  }

  onModuleInit(): void {
    this.bot.setCallbackEmitter(this.events);
    this.events.on(
      'callback',
      async (payload: { action: string; orderId: string; ctx: unknown }) => {
        try {
          await this.handleCallback(payload.action, payload.orderId);
        } catch (err) {
          this.logger.error(`Callback handling failed: ${(err as Error).message}`);
        }
      },
    );
  }

  private statusEmoji(status: OrderStatus): string {
    switch (status) {
      case 'PENDING':
        return '🆕';
      case 'CONFIRMED':
        return '✅';
      case 'ON_THE_WAY':
        return '🚚';
      case 'DELIVERED':
        return '📦';
      case 'CANCELLED':
        return '❌';
      default:
        return '•';
    }
  }

  private statusLabel(status: OrderStatus): string {
    switch (status) {
      case 'PENDING':
        return 'Yangi';
      case 'CONFIRMED':
        return 'Tasdiqlandi';
      case 'ON_THE_WAY':
        return "Yo'lda";
      case 'DELIVERED':
        return 'Yetkazildi';
      case 'CANCELLED':
        return 'Bekor qilindi';
      default:
        return status;
    }
  }

  private formatPaymentMethod(pm: PaymentMethod): string {
    return pm === PaymentMethod.CARD_ON_DELIVERY ? 'Karta (yetkazganda)' : 'Naqd (yetkazganda)';
  }

  private formatMoney(n: number | string): string {
    const v = Number(n);
    return v.toLocaleString('ru-RU').replace(/,/g, ' ') + ' so\'m';
  }

  private buildChannelMessage(order: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    paymentMethod: PaymentMethod;
    receiverName: string;
    receiverPhone: string;
    address: string;
    note: string | null;
    subtotal: number | string;
    discountAmount: number | string;
    deliveryFee: number | string;
    total: number | string;
    promoSnapshot: string | null;
    createdAt: Date;
    items: Array<{
      titleUz: string;
      variantLabel: string | null;
      quantity: number;
      unitPrice: number | string;
      lineTotal: number | string;
    }>;
    user: { telegramId: bigint; username: string | null; firstName: string | null };
  }): { text: string; keyboard: InlineKeyboard } {
    const itemLines = order.items
      .map(
        (i) =>
          `• ${i.titleUz}${i.variantLabel ? ` (${i.variantLabel})` : ''} × ${i.quantity} = <b>${this.formatMoney(i.lineTotal)}</b>`,
      )
      .join('\n');

    const userLine = order.user.username
      ? `@${order.user.username}`
      : order.user.firstName ?? `ID ${order.user.telegramId}`;

    const date = order.createdAt.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const text = `${this.statusEmoji(order.status)} <b>Buyurtma #${order.orderNumber}</b> — ${this.statusLabel(order.status)}\n\n` +
      `<b>Mahsulotlar:</b>\n${itemLines}\n\n` +
      `<b>Mijoz:</b> ${order.receiverName} (${userLine})\n` +
      `<b>Telefon:</b> ${order.receiverPhone}\n` +
      `<b>Manzil:</b> ${order.address}\n` +
      (order.note ? `<b>Izoh:</b> ${order.note}\n` : '') +
      `<b>To'lov:</b> ${this.formatPaymentMethod(order.paymentMethod)}\n\n` +
      `Mahsulotlar: ${this.formatMoney(order.subtotal)}\n` +
      (Number(order.discountAmount) > 0
        ? `Chegirma${order.promoSnapshot ? ` (${order.promoSnapshot})` : ''}: −${this.formatMoney(order.discountAmount)}\n`
        : '') +
      (Number(order.deliveryFee) > 0
        ? `Yetkazib berish: ${this.formatMoney(order.deliveryFee)}\n`
        : `Yetkazib berish: <b>Bepul</b>\n`) +
      `<b>Jami: ${this.formatMoney(order.total)}</b>\n\n` +
      `<i>${date}</i>`;

    const keyboard = new InlineKeyboard();
    if (order.status === OrderStatus.PENDING) {
      keyboard.text('✅ Tasdiqlash', `order:confirm:${order.id}`).text('❌ Bekor qilish', `order:cancel:${order.id}`);
    } else if (order.status === OrderStatus.CONFIRMED) {
      keyboard.text("🚚 Yo'lda", `order:onway:${order.id}`).text('❌ Bekor qilish', `order:cancel:${order.id}`);
    } else if (order.status === OrderStatus.ON_THE_WAY) {
      keyboard.text('📦 Yetkazildi', `order:delivered:${order.id}`);
    }
    return { text, keyboard };
  }

  @OnEvent('order.created', { async: true })
  async onOrderCreated(payload: { orderId: string }): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: payload.orderId },
      include: {
        items: true,
        user: true,
      },
    });
    if (!order) return;
    const { text, keyboard } = this.buildChannelMessage({
      ...order,
      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discountAmount),
      deliveryFee: Number(order.deliveryFee),
      total: Number(order.total),
      items: order.items.map((i) => ({
        titleUz: i.titleUz,
        variantLabel: i.variantLabel,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.lineTotal),
      })),
    });
    try {
      const { messageId } = await this.bot.sendToOrdersChannel(text, keyboard);
      await this.prisma.order.update({
        where: { id: order.id },
        data: { channelMessageId: messageId },
      });
    } catch (err) {
      this.logger.error(`Failed to post order to channel: ${(err as Error).message}`);
    }

    // Notify user (do'kon boti orqali)
    await this.notifyCustomer(
      order.tenantId,
      order.user.telegramId,
      `✅ <b>Buyurtmangiz qabul qilindi!</b>\n\nRaqami: <b>#${order.orderNumber}</b>\nJami: <b>${this.formatMoney(Number(order.total))}</b>\n\nTez orada operatorimiz siz bilan bog'lanadi.`,
    );
  }

  @OnEvent('order.status_changed', { async: true })
  async onOrderStatusChanged(payload: { orderId: string }): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: payload.orderId },
      include: { items: true, user: true },
    });
    if (!order || !order.channelMessageId) return;
    const { text, keyboard } = this.buildChannelMessage({
      ...order,
      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discountAmount),
      deliveryFee: Number(order.deliveryFee),
      total: Number(order.total),
      items: order.items.map((i) => ({
        titleUz: i.titleUz,
        variantLabel: i.variantLabel,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.lineTotal),
      })),
    });
    await this.bot.editOrdersChannelMessage(order.channelMessageId, text, keyboard);

    const userMessages: Record<OrderStatus, string | null> = {
      PENDING: null,
      CONFIRMED: `✅ Buyurtmangiz #${order.orderNumber} tasdiqlandi va tayyorlanmoqda.`,
      ON_THE_WAY: `🚚 Buyurtmangiz #${order.orderNumber} yo'lga chiqdi.`,
      DELIVERED: `📦 Buyurtmangiz #${order.orderNumber} yetkazildi. Marketplace bilan birga bo'lganingiz uchun rahmat!`,
      CANCELLED: `❌ Buyurtmangiz #${order.orderNumber} bekor qilindi.`,
    };
    const msg = userMessages[order.status];
    if (msg) await this.notifyCustomer(order.tenantId, order.user.telegramId, msg);
  }

  private async handleCallback(action: string, orderId: string): Promise<void> {
    const map: Record<string, OrderStatus> = {
      confirm: OrderStatus.CONFIRMED,
      onway: OrderStatus.ON_THE_WAY,
      delivered: OrderStatus.DELIVERED,
      cancel: OrderStatus.CANCELLED,
    };
    const newStatus = map[action];
    if (!newStatus) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          events: { create: { status: newStatus, comment: `Channel button: ${action}` } },
        },
      });
      if (newStatus === OrderStatus.CANCELLED) {
        const items = await tx.orderItem.findMany({ where: { orderId } });
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

    this.events.emit('order.status_changed', { orderId, status: newStatus });
  }
}
