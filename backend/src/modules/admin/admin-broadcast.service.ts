import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';

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
}

export interface CreateBroadcastInput {
  messageUz: string;
  messageRu?: string | null;
  filters: BroadcastFilters;
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
  ) {}

  /** Filter shartlariga mos foydalanuvchilarni nechtaligi (preview). */
  async countRecipients(filters: BroadcastFilters): Promise<number> {
    const where = this.buildUserWhere(filters);
    return this.prisma.user.count({ where });
  }

  async listHistory(limit = 30): Promise<Array<unknown>> {
    return this.prisma.broadcast.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
  }

  async getById(id: string): Promise<unknown> {
    const b = await this.prisma.broadcast.findUnique({ where: { id } });
    if (!b) throw new NotFoundException('Broadcast not found');
    return b;
  }

  /**
   * Yangi broadcast yaratadi va fonda yuborishni boshlaydi.
   * Yuborish jarayoni asinxron — bu funksiya darhol qaytadi.
   */
  async create(adminId: string, input: CreateBroadcastInput): Promise<{ id: string; totalCount: number }> {
    const filters = { ...input.filters, excludeBlocked: input.filters.excludeBlocked ?? true };
    const where = this.buildUserWhere(filters);
    const totalCount = await this.prisma.user.count({ where });

    const created = await this.prisma.broadcast.create({
      data: {
        messageUz: input.messageUz,
        messageRu: input.messageRu || null,
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

  /** Asosiy yuborish jarayoni — batch'larda, rate limit bilan. */
  private async processBroadcast(broadcastId: string): Promise<void> {
    const broadcast = await this.prisma.broadcast.findUnique({ where: { id: broadcastId } });
    if (!broadcast) return;
    if (broadcast.status !== 'pending') {
      this.logger.warn(`Broadcast ${broadcastId} status is ${broadcast.status}, skipping`);
      return;
    }

    await this.prisma.broadcast.update({
      where: { id: broadcastId },
      data: { status: 'running' },
    });

    const filters = broadcast.filters as unknown as BroadcastFilters;
    const where = this.buildUserWhere(filters);
    const recipients = await this.prisma.user.findMany({
      where,
      select: { id: true, telegramId: true, language: true },
    });

    this.logger.log(`Broadcast ${broadcastId}: starting send to ${recipients.length} users`);

    // Global bot o'chirilgan bo'lsa (token yo'q) — broadcast yuborib bo'lmaydi
    const gbot = this.bot.bot;
    if (!gbot) {
      this.logger.warn(`Broadcast ${broadcastId}: global bot o'chirilgan — bekor qilindi`);
      await this.prisma.broadcast.update({
        where: { id: broadcastId },
        data: { status: 'failed' },
      });
      return;
    }

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < recipients.length; i += this.BATCH_SIZE) {
      const batch = recipients.slice(i, i + this.BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((u) => {
          const text = u.language === 'ru' && broadcast.messageRu ? broadcast.messageRu : broadcast.messageUz;
          return gbot.api.sendMessage(Number(u.telegramId), text, {
            parse_mode: 'HTML',
            link_preview_options: { is_disabled: true },
          });
        }),
      );

      for (const r of results) {
        if (r.status === 'fulfilled') sent++;
        else failed++;
      }

      // Har 50 ta dan keyin progress yangilanadi
      await this.prisma.broadcast.update({
        where: { id: broadcastId },
        data: { sentCount: sent, failedCount: failed },
      });

      // Keyingi batchgacha kichik kechiktirish (rate limit)
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

    if (filters.hasOrders === true) {
      where.orders = { some: {} };
    } else if (filters.hasOrders === false) {
      where.orders = { none: {} };
    }

    if (filters.noOrdersInDays !== undefined && filters.noOrdersInDays > 0) {
      // Oxirgi N kun ichida buyurtma qilmaganlar — ya'ni undan oldingi orderlari bor, lekin yangi yo'q
      where.orders = {
        ...(where.orders ?? {}),
        none: {
          createdAt: { gte: this.daysAgo(filters.noOrdersInDays) },
        },
      };
    }

    return where;
  }

  private daysAgo(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }
}
