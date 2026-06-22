import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';
import { RelatedProductsService } from '../related-products/related-products.service';
import { localizeTitle, type Locale } from '@/common/helpers/localize';

/**
 * Post-purchase recommendation engine.
 *
 * Logikasi:
 *   1. Buyurtma yaratilganda (`order.created` event) — `OrderRecommendation` rejasiga 1 daqiqalik
 *      `scheduledAt` bilan qo'shamiz. `expiresAt` = +1 soat (eskirgan rejalar tashlanadi).
 *   2. Har daqiqada cron `processDue()` ishlaydi: nuqtada turgan rejalarni topib,
 *      buyurtmadagi har bir mahsulot uchun `RelatedRule` orqali tavsiya etilgan mahsulotlarni
 *      yig'adi va bot DM orqali foydalanuvchiga yuboradi.
 *   3. Idempotent — bir buyurtmaga bir marta yuboriladi (`sentAt` belgilanadi).
 */
@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);
  private readonly delayMinutes: number;
  private readonly maxItems: number;
  private readonly webappUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly bot: TelegramBotService,
    private readonly related: RelatedProductsService,
    config: ConfigService,
  ) {
    this.delayMinutes = Number(config.get('RECOMMENDATION_DELAY_MIN') ?? 1);
    this.maxItems = Number(config.get('RECOMMENDATION_MAX_ITEMS') ?? 4);
    this.webappUrl = config.get<string>('WEBAPP_URL') ?? '';
  }

  @OnEvent('order.created', { async: true })
  async onOrderCreated(payload: { orderId: string }): Promise<void> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: payload.orderId },
        select: { id: true, userId: true },
      });
      if (!order) return;

      const now = Date.now();
      await this.prisma.orderRecommendation.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          userId: order.userId,
          scheduledAt: new Date(now + this.delayMinutes * 60_000),
          expiresAt: new Date(now + 60 * 60_000),
        },
        update: {},
      });
    } catch (err) {
      this.logger.error(`Failed to schedule recommendation: ${(err as Error).message}`);
    }
  }

  /** Har daqiqada ishga tushadi — yetilgan rejalarni qidirib yuboradi. */
  @Cron(CronExpression.EVERY_MINUTE)
  async processDue(): Promise<void> {
    const now = new Date();
    const due = await this.prisma.orderRecommendation.findMany({
      where: {
        sentAt: null,
        scheduledAt: { lte: now },
        expiresAt: { gt: now },
        attempts: { lt: 3 },
      },
      take: 20,
      orderBy: { scheduledAt: 'asc' },
    });
    if (due.length === 0) return;

    this.logger.log(`Processing ${due.length} pending recommendations`);
    for (const rec of due) {
      await this.processOne(rec.id).catch((err) =>
        this.logger.error(`Recommendation ${rec.id} failed: ${(err as Error).message}`),
      );
    }
  }

  /** Eskirgan rejalarni tozalash — kuniga 1 marta */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpired(): Promise<void> {
    const removed = await this.prisma.orderRecommendation.deleteMany({
      where: {
        OR: [
          { sentAt: { not: null }, createdAt: { lt: new Date(Date.now() - 7 * 24 * 3600_000) } },
          { sentAt: null, expiresAt: { lt: new Date() } },
        ],
      },
    });
    if (removed.count > 0) {
      this.logger.log(`Cleaned up ${removed.count} old recommendations`);
    }
  }

  private async processOne(recId: string): Promise<void> {
    // Atomic locking: attempts'ni oshirib olish — boshqa worker shu rejani qaytadan olmaydi
    const updated = await this.prisma.orderRecommendation.updateMany({
      where: { id: recId, sentAt: null, attempts: { lt: 3 } },
      data: { attempts: { increment: 1 } },
    });
    if (updated.count === 0) return;

    const rec = await this.prisma.orderRecommendation.findUnique({
      where: { id: recId },
    });
    if (!rec || rec.sentAt) return;

    // Buyurtma + items + user
    const order = await this.prisma.order.findUnique({
      where: { id: rec.orderId },
      include: {
        items: { select: { productId: true, titleUz: true, titleRu: true } },
        user: { select: { telegramId: true, language: true } },
      },
    });
    if (!order || !order.user) {
      await this.markFailed(recId, 'Order or user not found');
      return;
    }

    const lang: Locale = order.user.language === 'ru' ? 'ru' : 'uz';

    // Har sotib olingan mahsulot uchun related'larni yig'amiz
    const uniqueProductIds = Array.from(new Set(order.items.map((i) => i.productId)));
    const buckets: Array<{ sourceTitle: string; related: Array<{ id: string; title: string; price: number; imageUrl: string | null }> }> = [];
    const alreadySuggested = new Set<string>();

    for (const pid of uniqueProductIds) {
      const sourceItem = order.items.find((i) => i.productId === pid);
      const sourceTitle = sourceItem ? (lang === 'ru' ? sourceItem.titleRu : sourceItem.titleUz) : '';

      const related = await this.related.getRelatedFor(
        pid,
        lang,
        order.userId,
        order.tenantId ?? null,
        this.maxItems,
      );
      // Buyurtmadagi mahsulotlarni va boshqa source'lar uchun avval taklif qilinganlarni chetlatamiz
      const filtered = related.filter(
        (r) => !uniqueProductIds.includes(r.id) && !alreadySuggested.has(r.id),
      );
      if (filtered.length === 0) continue;
      filtered.forEach((r) => alreadySuggested.add(r.id));
      buckets.push({
        sourceTitle,
        related: filtered.slice(0, this.maxItems).map((r) => ({
          id: r.id,
          title: r.title,
          price: r.price,
          imageUrl: r.imageUrl,
        })),
      });
    }

    if (buckets.length === 0) {
      // Tavsiya qilinadigan narsa yo'q — silently mark as sent
      await this.prisma.orderRecommendation.update({
        where: { id: recId },
        data: { sentAt: new Date(), sentProductIds: [] },
      });
      this.logger.log(`Recommendation ${recId}: no related products found, marked complete`);
      return;
    }

    // Xabar matnini quramiz
    const text = this.buildMessage(buckets, lang);
    const sentIds = buckets.flatMap((b) => b.related.map((r) => r.id));

    // WebApp tugma — savatga o'tadi (productlar list'iga linkga ko'p mahsulot bo'lsa search'ga)
    const firstProductId = sentIds[0];
    const inlineKeyboard = firstProductId
      ? [
          [
            {
              text: lang === 'ru' ? '🛍 Посмотреть товары' : '🛍 Mahsulotlarni ko\'rish',
              ...(this.webappUrl.startsWith('https://')
                ? { web_app: { url: this.webappUrl } }
                : { url: this.webappUrl }),
            },
          ],
        ]
      : undefined;

    // Global bot o'chirilgan bo'lsa — post-purchase tavsiya yuborilmaydi
    const gbot = this.bot.bot;
    if (!gbot) return;
    try {
      await gbot.api.sendMessage(Number(order.user.telegramId), text, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        ...(inlineKeyboard ? { reply_markup: { inline_keyboard: inlineKeyboard } } : {}),
      });

      await this.prisma.orderRecommendation.update({
        where: { id: recId },
        data: { sentAt: new Date(), sentProductIds: sentIds, lastError: null },
      });
      this.logger.log(`Recommendation ${recId} sent to user ${order.userId} (${sentIds.length} products)`);
    } catch (err) {
      await this.markFailed(recId, (err as Error).message);
    }
  }

  private async markFailed(recId: string, message: string): Promise<void> {
    await this.prisma.orderRecommendation.update({
      where: { id: recId },
      data: { lastError: message.slice(0, 500) },
    });
  }

  private buildMessage(
    buckets: Array<{
      sourceTitle: string;
      related: Array<{ id: string; title: string; price: number; imageUrl: string | null }>;
    }>,
    lang: Locale,
  ): string {
    const header =
      lang === 'ru'
        ? '🎁 <b>Специально для вас!</b>\n\nВы недавно сделали заказ. Возможно, эти товары вам тоже понравятся:\n'
        : "🎁 <b>Sizga maxsus takliflarimiz!</b>\n\nSiz yaqinda buyurtma qildingiz. Quyidagi mahsulotlar ham yoqishi mumkin:\n";

    const sections = buckets
      .map((b) => {
        const intro =
          lang === 'ru'
            ? `\n📦 К <i>«${escapeHtml(b.sourceTitle)}»</i>:\n`
            : `\n📦 <i>«${escapeHtml(b.sourceTitle)}»</i> uchun:\n`;
        const lines = b.related
          .map((r, i) => `${i + 1}. ${escapeHtml(r.title)} — <b>${formatMoney(r.price, lang)}</b>`)
          .join('\n');
        return intro + lines;
      })
      .join('\n');

    const footer =
      lang === 'ru'
        ? '\n\nНажмите кнопку ниже, чтобы открыть магазин 👇'
        : "\n\nDo'konni ochish uchun pastdagi tugmani bosing 👇";

    return header + sections + footer;
  }
}

function formatMoney(n: number, lang: Locale): string {
  const s = Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ');
  return `${s} ${lang === 'ru' ? 'сум' : "so'm"}`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
