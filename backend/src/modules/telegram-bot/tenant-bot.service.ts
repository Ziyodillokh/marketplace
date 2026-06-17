import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus } from '@prisma/client';
import { Bot, type Context, InlineKeyboard, InputFile } from 'grammy';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Har sotuvchining o'z Telegram boti — mijozlar o'sha bot orqali shu sotuvchining
 * do'konini ochadi. Webhook'lar /telegram/t/:tenantId/webhook ga keladi.
 */
@Injectable()
export class TenantBotService implements OnModuleInit {
  private readonly logger = new Logger(TenantBotService.name);
  private readonly bots = new Map<string, Bot>();
  private readonly webappUrl: string;
  private readonly appUrl: string;
  private readonly secret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    config: ConfigService,
  ) {
    this.webappUrl = (config.get<string>('WEBAPP_URL') ?? '').replace(/\/$/, '');
    this.appUrl = (config.get<string>('APP_URL') ?? '').replace(/\/$/, '');
    this.secret = config.get<string>('TELEGRAM_WEBHOOK_SECRET') ?? '';
  }

  async onModuleInit(): Promise<void> {
    // Fonда — startupни bloklamaymiz
    void this.selfHeal().catch((err) =>
      this.logger.warn(`Tenant bot self-heal: ${(err as Error).message}`),
    );
  }

  /** Startupda: egasiz katalogni yagona do'konga biriktirish + barcha botlarni qayta sozlash. */
  private async selfHeal(): Promise<void> {
    const tenants = await this.prisma.tenant.findMany({ select: { id: true } });

    // Yagona do'kon bo'lsa — egasiz (null) mahsulot/bannerlarni unga biriktiramiz.
    // (Kategoriyalar global/null qoladi — asosiy taglik.)
    if (tenants.length === 1) {
      const tid = tenants[0].id;
      const [pr, bn, pc] = await Promise.all([
        this.prisma.product.updateMany({ where: { tenantId: null }, data: { tenantId: tid } }),
        this.prisma.banner.updateMany({ where: { tenantId: null }, data: { tenantId: tid } }),
        this.prisma.promoCode.updateMany({ where: { tenantId: null }, data: { tenantId: tid } }),
      ]);
      if (pr.count || bn.count || pc.count) {
        this.logger.log(
          `Backfill → tenant ${tid}: ${pr.count} mahsulot, ${bn.count} banner, ${pc.count} promokod`,
        );
      }
    }

    // Barcha ulangan botlarni qayta sozlaymiz (webhook + menu → ?shop=slug)
    const withBot = await this.prisma.tenant.findMany({
      where: { botToken: { not: null } },
      select: { id: true },
    });
    for (const t of withBot) {
      void this.configure(t.id).catch(() => undefined);
    }
    if (withBot.length) this.logger.log(`${withBot.length} ta tenant boti qayta sozlandi`);
  }

  private storeUrl(slug: string): string {
    return `${this.webappUrl}?shop=${encodeURIComponent(slug)}`;
  }

  private buildBot(token: string, slug: string, shopName: string, tenantId: string): Bot {
    const bot = new Bot(token);
    bot.catch((err) => this.logger.error(`Tenant bot error: ${err.error}`));
    bot.command('start', async (ctx) => {
      const url = this.storeUrl(slug);
      const text = `👋 Assalomu alaykum!\n\n<b>${shopName}</b> do'koniga xush kelibsiz. Quyidagi tugmadan xaridni boshlang:`;
      if (url.startsWith('https://')) {
        await ctx.reply(text, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: [[{ text: "🛍 Do'konni ochish", web_app: { url } }]] },
        });
      } else {
        await ctx.reply(text, { parse_mode: 'HTML' });
      }
    });

    // To'lov chekini tasdiqlash / rad etish (kanaldagi tugmalar)
    bot.callbackQuery(/^paycfm:(approve|reject):(.+)$/, async (ctx) => {
      const action = ctx.match![1] as 'approve' | 'reject';
      const orderId = ctx.match![2];
      try {
        await this.handlePaymentCallback(tenantId, action, orderId, ctx);
        await ctx.answerCallbackQuery({ text: action === 'approve' ? '✅ Tasdiqlandi' : '❌ Rad etildi' });
      } catch (err) {
        this.logger.error(`Payment callback failed: ${(err as Error).message}`);
        await ctx.answerCallbackQuery({ text: 'Xatolik yuz berdi' }).catch(() => undefined);
      }
    });

    return bot;
  }

  private async loadBot(tenantId: string): Promise<Bot | null> {
    const cached = this.bots.get(tenantId);
    if (cached) return cached;
    const t = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { botToken: true, slug: true, shopName: true },
    });
    if (!t?.botToken) return null;
    const bot = this.buildBot(t.botToken, t.slug, t.shopName, tenantId);
    await bot.init();
    this.bots.set(tenantId, bot);
    return bot;
  }

  private formatMoney(n: number | string): string {
    return Number(n).toLocaleString('ru-RU').replace(/,/g, ' ') + ' so\'m';
  }

  /**
   * Mijoz yuklagan to'lov chekini sotuvchining tasdiqlash kanaliga yuboradi.
   * Tugmalar: ✅ Tasdiqlash / ❌ Rad etish.
   * Sotuvchi boti shu kanalga admin bo'lishi shart.
   */
  async sendReceiptToChannel(
    tenantId: string,
    photo: Buffer,
    caption: string,
    orderId: string,
  ): Promise<number | null> {
    const t = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { manualPaymentChannelId: true },
    });
    if (!t?.manualPaymentChannelId) {
      this.logger.warn(`Tenant ${tenantId} uchun to'lov kanali sozlanmagan`);
      return null;
    }
    const bot = await this.loadBot(tenantId);
    if (!bot) return null;
    const keyboard = new InlineKeyboard()
      .text('✅ Tasdiqlash', `paycfm:approve:${orderId}`)
      .text('❌ Rad etish', `paycfm:reject:${orderId}`);
    const msg = await bot.api.sendPhoto(
      t.manualPaymentChannelId,
      new InputFile(photo, 'chek.jpg'),
      { caption, parse_mode: 'HTML', reply_markup: keyboard },
    );
    return msg.message_id;
  }

  /**
   * Sotuvchining Telegram kanaliga e'lon joylaydi (matn + ixtiyoriy rasm +
   * ixtiyoriy "Sotib olish" tugmasi → do'kon boti). Bot kanalga admin bo'lishi shart.
   * Joylangan xabarning message_id qaytadi.
   */
  async publishToChannel(
    tenantId: string,
    post: { text: string; imageUrl?: string | null; buyButton: boolean; buttonText?: string | null },
  ): Promise<number> {
    const t = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { channelId: true, botUsername: true },
    });
    if (!t?.channelId) throw new Error('Kanal sozlanmagan');
    const bot = await this.loadBot(tenantId);
    if (!bot) throw new Error('Bot ulanmagan');

    let keyboard: InlineKeyboard | undefined;
    if (post.buyButton && t.botUsername) {
      // Kanal postida faqat URL tugma ishlaydi — bot ochiladi, u do'konni ochadi
      keyboard = new InlineKeyboard().url(
        post.buttonText?.trim() || '🛍 Sotib olish',
        `https://t.me/${t.botUsername}`,
      );
    }

    if (post.imageUrl) {
      const abs = post.imageUrl.startsWith('http')
        ? post.imageUrl
        : `${this.appUrl}${post.imageUrl}`;
      const msg = await bot.api.sendPhoto(t.channelId, abs, {
        caption: post.text,
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
      return msg.message_id;
    }
    const msg = await bot.api.sendMessage(t.channelId, post.text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
    return msg.message_id;
  }

  /** Kanaldagi e'lonni o'chiradi (post o'chirilganda). Xato bo'lsa — e'tiborsiz. */
  async deleteChannelMessage(tenantId: string, messageId: number): Promise<void> {
    const t = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { channelId: true },
    });
    if (!t?.channelId) return;
    const bot = await this.loadBot(tenantId);
    if (!bot) return;
    await bot.api.deleteMessage(t.channelId, messageId).catch(() => undefined);
  }

  /** Kanaldagi tasdiqlash/rad tugmasi bosilganda buyurtma to'lovini hal qiladi. */
  private async handlePaymentCallback(
    tenantId: string,
    action: 'approve' | 'reject',
    orderId: string,
    ctx: Context,
  ): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });
    if (!order || order.tenantId !== tenantId) return;
    if (order.paidAt) return; // allaqachon tasdiqlangan — qayta ishlamaymiz

    const bot = await this.loadBot(tenantId);

    if (action === 'approve') {
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          paidAt: new Date(),
          status: OrderStatus.CONFIRMED,
          events: { create: { status: OrderStatus.CONFIRMED, comment: "To'lov cheki tasdiqlandi" } },
        },
      });
      // Admin paneli + foydalanuvchi WebApp real-time
      this.events.emit('order.status_changed', { orderId, status: OrderStatus.CONFIRMED });
      this.events.emit('user.order.status_changed', {
        userId: order.userId,
        orderId,
        status: OrderStatus.CONFIRMED,
        orderNumber: order.orderNumber,
      });
      // Mijozga xabar (sotuvchining boti orqali)
      if (bot && order.user.telegramId) {
        await bot.api
          .sendMessage(
            Number(order.user.telegramId),
            `✅ <b>To'lovingiz tasdiqlandi!</b>\n\nBuyurtma <b>#${order.orderNumber}</b> (${this.formatMoney(Number(order.total))}) qabul qilindi va tayyorlanmoqda.`,
            { parse_mode: 'HTML' },
          )
          .catch(() => undefined);
      }
    } else {
      // Rad etildi — chekni o'chiramiz, mijoz qayta yuklashi mumkin
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          paymentReceiptUrl: null,
          payReceiptMessageId: null,
          events: { create: { status: order.status, comment: "To'lov cheki rad etildi" } },
        },
      });
      if (bot && order.user.telegramId) {
        await bot.api
          .sendMessage(
            Number(order.user.telegramId),
            `❌ <b>To'lov tasdiqlanmadi.</b>\n\nBuyurtma <b>#${order.orderNumber}</b> uchun to'lov chekini qayta yuklang yoki sotuvchi bilan bog'laning.`,
            { parse_mode: 'HTML' },
          )
          .catch(() => undefined);
      }
    }

    // Kanaldagi xabarni belgilash
    try {
      const label = action === 'approve' ? "✅ TO'LOV TASDIQLANDI" : '❌ RAD ETILDI';
      const by = ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name ?? '';
      const cap = ctx.callbackQuery?.message?.caption ?? '';
      await ctx.editMessageCaption({
        caption: `${cap}\n\n<b>${label}</b>${by ? ` — ${by}` : ''}`,
        parse_mode: 'HTML',
      });
    } catch {
      // tahrirlash muhim emas
    }
  }

  /** Keshdagi bot instansiyasini unutadi (token o'zgargan/o'chirilganda). */
  forget(tenantId: string): void {
    this.bots.delete(tenantId);
  }

  /**
   * Berilgan token uchun Telegram webhook'ini o'chiradi.
   * Token o'zgarganda eski bot bizga update yubormasligi uchun ishlatiladi.
   * Xato bo'lsa (eski token allaqachon o'chirilgan/yaroqsiz) — log qilamiz,
   * exception qaytarmaymiz.
   */
  async deleteWebhookForToken(token: string): Promise<void> {
    if (!token) return;
    try {
      const bot = new Bot(token);
      await bot.api.deleteWebhook({ drop_pending_updates: true });
      this.logger.log(`Old webhook deleted for token ${token.slice(0, 10)}…`);
    } catch (err) {
      this.logger.warn(`Old webhook delete failed: ${(err as Error).message}`);
    }
  }

  /** Webhook'dan kelgan update'ni shu tenant boti bilan ishlaydi. */
  async handleUpdate(tenantId: string, update: unknown): Promise<void> {
    const bot = await this.loadBot(tenantId);
    if (!bot) {
      this.logger.warn(`No bot for tenant ${tenantId}`);
      return;
    }
    await bot.handleUpdate(update as Parameters<Bot['handleUpdate']>[0]);
  }

  /** Sotuvchi botiga webhook + menu tugma o'rnatadi (token ulanganda chaqiriladi). */
  async configure(tenantId: string): Promise<void> {
    const t = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { botToken: true, slug: true },
    });
    if (!t?.botToken) return;
    this.bots.delete(tenantId); // keshni yangilaymiz
    const bot = new Bot(t.botToken);
    const webhookUrl = `${this.appUrl}/telegram/t/${tenantId}/webhook`;
    try {
      await bot.api.setWebhook(webhookUrl, {
        secret_token: this.secret,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: false,
      });
      const url = this.storeUrl(t.slug);
      if (url.startsWith('https://')) {
        await bot.api
          .setChatMenuButton({ menu_button: { type: 'web_app', text: "🛍 Do'kon", web_app: { url } } })
          .catch(() => undefined);
      }
      this.logger.log(`Tenant ${tenantId} bot webhook set: ${webhookUrl}`);
    } catch (err) {
      this.logger.error(`Tenant ${tenantId} webhook set failed: ${(err as Error).message}`);
    }
  }
}
