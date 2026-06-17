import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot } from 'grammy';
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

  private buildBot(token: string, slug: string, shopName: string): Bot {
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
    const bot = this.buildBot(t.botToken, t.slug, t.shopName);
    await bot.init();
    this.bots.set(tenantId, bot);
    return bot;
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
