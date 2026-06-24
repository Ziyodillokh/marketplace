import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Bot } from 'grammy';
import { PrismaService } from '@/prisma/prisma.service';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';
import { TenantBotService } from '../telegram-bot/tenant-bot.service';
import { UploadsService } from '../uploads/uploads.service';
import { isInstagramLink, parseTelegramPostLink, resolveInstagramMedia } from './broadcast-media';

export interface BroadcastFilters {
  /** Faqat order qilgan (true) yoki hech qachon order qilmagan (false). undefined = filtersiz. */
  hasOrders?: boolean;
  /** Oxirgi N kun ichida order qilmaganlar (re-engagement uchun). */
  noOrdersInDays?: number;
  /** Oxirgi N kun ichida faol bo'lganlar (lastSeenAt asosida). */
  activeInDays?: number;
  /** Faqat shu tildagi foydalanuvchilar (uz / ru). */
  language?: 'uz' | 'ru';
  /** Bloklanganlarni qo'shmaslik (default true). */
  excludeBlocked?: boolean;
  /** Joriy do'kon — shu do'kon mijozlari bilan cheklash (server tomonda qo'yiladi). */
  tenantId?: string | null;
}

export interface CreateBroadcastInput {
  messageUz: string;
  messageRu?: string | null;
  filters: BroadcastFilters;
  /** 'text' | 'photo' | 'video' — yuklangan media turi. */
  mediaType?: 'text' | 'photo' | 'video';
  /** Yuklangan media URL'i (rasm/video). */
  mediaUrl?: string | null;
  /** Havola: Telegram kanal posti yoki Instagram post/reel. */
  link?: string | null;
}

@Injectable()
export class AdminBroadcastService {
  private readonly logger = new Logger(AdminBroadcastService.name);
  /** Telegram global rate limit ~30 msg/sec. Bizniki 25 — xavfsiz chegara. */
  private readonly BATCH_SIZE = 25;
  private readonly BATCH_DELAY_MS = 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly bot: TelegramBotService,
    private readonly tenantBot: TenantBotService,
    private readonly uploads: UploadsService,
  ) {}

  /** Filter shartlariga mos foydalanuvchilarni nechtaligi (preview). */
  async countRecipients(filters: BroadcastFilters, tenantId: string | null): Promise<number> {
    const where = this.buildUserWhere({ ...filters, tenantId });
    return this.prisma.user.count({ where });
  }

  async listHistory(tenantId: string | null, limit = 30): Promise<Array<unknown>> {
    return this.prisma.broadcast.findMany({
      where: tenantId ? { tenantId } : {},
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
  }

  async getById(id: string, tenantId: string | null): Promise<unknown> {
    const b = await this.prisma.broadcast.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
    });
    if (!b) throw new NotFoundException('Broadcast not found');
    return b;
  }

  /**
   * Yangi broadcast yaratadi va fonda yuborishni boshlaydi.
   * Havola berilgan bo'lsa (Telegram/Instagram) — shu yerda hal qilinadi.
   */
  async create(
    adminId: string,
    tenantId: string | null,
    input: CreateBroadcastInput,
  ): Promise<{ id: string; totalCount: number }> {
    const filters = { ...input.filters, excludeBlocked: input.filters.excludeBlocked ?? true };

    // ─── Media: havola yoki yuklangan fayl ───────────────────
    let mediaType: 'text' | 'photo' | 'video' = input.mediaType ?? 'text';
    let mediaUrl: string | null = input.mediaUrl ?? null;
    let copyFromChatId: string | null = null;
    let copyMessageId: number | null = null;

    const link = input.link?.trim();
    if (link) {
      const tg = parseTelegramPostLink(link);
      if (tg) {
        copyFromChatId = tg.fromChatId;
        copyMessageId = tg.messageId;
        mediaType = 'text';
        mediaUrl = null;
      } else if (isInstagramLink(link)) {
        const media = await resolveInstagramMedia(link);
        if (!media) {
          throw new BadRequestException(
            "Instagram havolasidan media olib bo'lmadi. Iltimos, faylni to'g'ridan-to'g'ri yuklang.",
          );
        }
        if (media.type === 'video') {
          const saved = await this.uploads.saveVideo(media.buffer, media.mime);
          mediaUrl = saved.url;
          mediaType = 'video';
        } else {
          const saved = await this.uploads.saveImage(media.buffer);
          mediaUrl = saved.url;
          mediaType = 'photo';
        }
      } else {
        throw new BadRequestException("Havola noto'g'ri. Telegram kanal posti yoki Instagram havolasi bo'lishi kerak.");
      }
    }

    const where = this.buildUserWhere({ ...filters, tenantId });
    const totalCount = await this.prisma.user.count({ where });

    const created = await this.prisma.broadcast.create({
      data: {
        tenantId: tenantId ?? null,
        messageUz: input.messageUz,
        messageRu: input.messageRu || null,
        mediaType,
        mediaUrl,
        copyFromChatId,
        copyMessageId,
        filters: filters as unknown as Prisma.JsonObject,
        totalCount,
        status: 'pending',
        createdById: adminId,
      },
    });

    // Fonda yuborish — async, errorni log qilamiz lekin javobni kutmaymiz
    this.processBroadcast(created.id).catch((err) =>
      this.logger.error(`Broadcast ${created.id} processing failed: ${(err as Error).message}`),
    );

    return { id: created.id, totalCount };
  }

  /** Asosiy yuborish jarayoni — batch'larda, rate limit bilan, do'kon boti orqali. */
  private async processBroadcast(broadcastId: string): Promise<void> {
    const broadcast = await this.prisma.broadcast.findUnique({ where: { id: broadcastId } });
    if (!broadcast) return;
    if (broadcast.status !== 'pending') {
      this.logger.warn(`Broadcast ${broadcastId} status is ${broadcast.status}, skipping`);
      return;
    }

    await this.prisma.broadcast.update({ where: { id: broadcastId }, data: { status: 'running' } });

    const filters = broadcast.filters as unknown as BroadcastFilters;
    const where = this.buildUserWhere({ ...filters, tenantId: broadcast.tenantId });
    const recipients = await this.prisma.user.findMany({
      where,
      select: { id: true, telegramId: true, language: true },
    });

    this.logger.log(`Broadcast ${broadcastId}: starting send to ${recipients.length} users`);

    // Do'kon broadcast'i — do'kon boti; platforma broadcast'i (tenantId yo'q) — global bot.
    const sender: Bot | null = broadcast.tenantId
      ? await this.tenantBot.getBot(broadcast.tenantId)
      : this.bot.bot ?? null;

    if (!sender) {
      this.logger.warn(`Broadcast ${broadcastId}: bot topilmadi (token yo'q) — bekor qilindi`);
      await this.prisma.broadcast.update({ where: { id: broadcastId }, data: { status: 'failed' } });
      return;
    }

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < recipients.length; i += this.BATCH_SIZE) {
      const batch = recipients.slice(i, i + this.BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((u) => this.sendOne(sender, Number(u.telegramId), u.language, broadcast)),
      );
      for (const r of results) {
        if (r.status === 'fulfilled') sent++;
        else failed++;
      }
      await this.prisma.broadcast.update({
        where: { id: broadcastId },
        data: { sentCount: sent, failedCount: failed },
      });
      if (i + this.BATCH_SIZE < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, this.BATCH_DELAY_MS));
      }
    }

    await this.prisma.broadcast.update({
      where: { id: broadcastId },
      data: {
        sentCount: sent,
        failedCount: failed,
        status: failed === recipients.length && recipients.length > 0 ? 'failed' : 'completed',
        finishedAt: new Date(),
      },
    });

    this.logger.log(`Broadcast ${broadcastId} finished: ${sent} sent, ${failed} failed`);
  }

  /** Telegram caption chegarasi. Bundan uzun matn alohida xabar bo'lib ketadi. */
  private readonly CAPTION_MAX = 1024;

  private sendText(bot: Bot, chatId: number, text: string): Promise<unknown> {
    return bot.api.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
  }

  /** Bitta foydalanuvchiga matn yoki media yuboradi. */
  private async sendOne(
    bot: Bot,
    chatId: number,
    lang: string,
    b: { messageUz: string; messageRu: string | null; mediaType: string; mediaUrl: string | null; copyFromChatId: string | null; copyMessageId: number | null },
  ): Promise<unknown> {
    const text = (lang === 'ru' && b.messageRu ? b.messageRu : b.messageUz) ?? '';

    // ─── Telegram kanal posti (havola) — postni o'zini qayta yuboramiz.
    // Matnni alohida xabar qilamiz: copyMessage'ga caption berish matnli postda
    // xato beradi, media postda esa originalni almashtirib yuboradi.
    if (b.copyFromChatId && b.copyMessageId) {
      if (text.trim()) await this.sendText(bot, chatId, text);
      return bot.api.copyMessage(chatId, b.copyFromChatId, b.copyMessageId);
    }

    const hasMedia = (b.mediaType === 'photo' || b.mediaType === 'video') && b.mediaUrl;
    if (hasMedia) {
      // Caption faqat 1024 belgidan oshmasa beramiz (kesmaymiz — HTML teglari buzilmasligi uchun).
      const fits = text.length <= this.CAPTION_MAX;
      const opts = fits && text.trim() ? { caption: text, parse_mode: 'HTML' as const } : {};
      if (b.mediaType === 'photo') {
        await bot.api.sendPhoto(chatId, b.mediaUrl as string, opts);
      } else {
        await bot.api.sendVideo(chatId, b.mediaUrl as string, opts);
      }
      // Matn caption'ga sig'masa — to'liq matnni alohida xabar qilib yuboramiz.
      if (!fits && text.trim()) await this.sendText(bot, chatId, text);
      return undefined;
    }

    return this.sendText(bot, chatId, text);
  }

  private buildUserWhere(filters: BroadcastFilters): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};

    if (filters.excludeBlocked !== false) {
      where.isBlocked = false;
    }
    if (filters.language) {
      where.language = filters.language;
    }
    if (filters.activeInDays !== undefined && filters.activeInDays > 0) {
      where.lastSeenAt = { gte: this.daysAgo(filters.activeInDays) };
    }

    // Order shartlarini AND bilan birlashtiramiz — bir-birini bekor qilmasligi uchun.
    const orderScope: Prisma.OrderWhereInput = filters.tenantId ? { tenantId: filters.tenantId } : {};
    const orderConds: Prisma.UserWhereInput[] = [];

    // Do'kon konteksti: "Mijozlar" = shu do'kondan kamida bitta order qilganlar
    // (dashboard "customersCount" bilan bir xil ta'rif).
    if (filters.tenantId) {
      orderConds.push({ orders: { some: orderScope } });
    }
    if (filters.hasOrders === true) {
      orderConds.push({ orders: { some: orderScope } });
    } else if (filters.hasOrders === false) {
      // Do'kon konteksti bilan birga bu bo'sh to'plam beradi (mijoz, lekin order'i yo'q) — to'g'ri.
      orderConds.push({ orders: { none: orderScope } });
    }
    if (filters.noOrdersInDays !== undefined && filters.noOrdersInDays > 0) {
      orderConds.push({
        orders: { none: { ...orderScope, createdAt: { gte: this.daysAgo(filters.noOrdersInDays) } } },
      });
    }

    if (orderConds.length === 1) {
      Object.assign(where, orderConds[0]);
    } else if (orderConds.length > 1) {
      where.AND = orderConds;
    }

    return where;
  }

  private daysAgo(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }
}
