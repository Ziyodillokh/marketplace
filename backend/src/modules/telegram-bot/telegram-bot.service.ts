import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, InlineKeyboard, webhookCallback } from 'grammy';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  readonly bot: Bot;
  private readonly useWebhook: boolean;
  private readonly envWebappUrl: string;
  private readonly adminPanelUrl: string;
  private readonly ordersChannelId: string;
  private readonly botUsername: string;
  private readonly tunnelFilePath: string;

  constructor(private readonly config: ConfigService) {
    const token = this.config.getOrThrow<string>('TELEGRAM_BOT_TOKEN');
    this.bot = new Bot(token);
    this.useWebhook = this.config.get('TELEGRAM_USE_WEBHOOK') === 'true';
    this.envWebappUrl = this.config.getOrThrow<string>('WEBAPP_URL');
    this.adminPanelUrl =
      this.config.get<string>('ADMIN_PANEL_URL') ??
      `${this.config.get<string>('APP_URL') ?? ''}/admin/login`;
    this.ordersChannelId = this.config.getOrThrow<string>('TELEGRAM_ORDERS_CHANNEL_ID');
    this.botUsername = this.config.getOrThrow<string>('TELEGRAM_BOT_USERNAME');
    this.tunnelFilePath = join(process.cwd(), '.tunnel-url');
    this.registerHandlers();
  }

  /** WebApp URL ni .tunnel-url fayldan yoki .env'dan oladi. Dinamik — restartsiz yangilanadi. */
  private getWebappUrl(): string {
    try {
      if (existsSync(this.tunnelFilePath)) {
        const url = readFileSync(this.tunnelFilePath, 'utf-8').trim();
        if (url.startsWith('https://')) return url;
      }
    } catch {
      // ignore
    }
    return this.envWebappUrl;
  }

  async onModuleInit(): Promise<void> {
    try {
      // Webhook rejimida bot.init() majburiy — bot.handleUpdate uni talab qiladi.
      // Polling rejimida bot.start() avtomatik chaqiradi, lekin biz xohlamaymiz duplicate.
      if (this.useWebhook) {
        await this.bot.init();
        const me = this.bot.botInfo;
        this.logger.log(`Bot @${me.username} initialized (id=${me.id})`);
        await this.ensureWebhook();
      } else {
        const me = await this.bot.api.getMe();
        this.logger.log(`Bot @${me.username} connected (id=${me.id})`);
        await this.bot.api.deleteWebhook({ drop_pending_updates: false }).catch(() => undefined);
        void this.bot.start({
          onStart: (info) => this.logger.log(`Polling started as @${info.username}`),
        });
      }
      // Menu commands va chat menu button — har safar startda yangilanadi (idempotent)
      await this.setupBotMenu();
    } catch (err) {
      this.logger.error(`Bot init failed: ${(err as Error).message}`);
    }
  }

  /** Bot komandalar ro'yxati va chat pastidagi doimiy "Menu" tugmasini o'rnatadi. */
  private async setupBotMenu(): Promise<void> {
    try {
      await this.bot.api.setMyCommands([
        { command: 'start', description: "Do'konni ochish / Открыть магазин" },
        { command: 'admin', description: 'Admin panel' },
        { command: 'help', description: 'Yordam / Помощь' },
      ]);
      this.logger.log('Bot commands ro\'yxati o\'rnatildi');

      const webappUrl = this.getWebappUrl();
      if (webappUrl.startsWith('https://')) {
        await this.bot.api.setChatMenuButton({
          menu_button: {
            type: 'web_app',
            text: "🛍 Do'kon",
            web_app: { url: webappUrl },
          },
        });
        this.logger.log(`Chat menu button o'rnatildi → ${webappUrl}`);
      }
    } catch (err) {
      this.logger.warn(`Bot menu setup failed: ${(err as Error).message}`);
    }
  }

  private async ensureWebhook(): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL') ?? '';
    if (!appUrl.startsWith('https://')) {
      this.logger.warn(`APP_URL HTTPS emas — webhook o'rnatilmadi: ${appUrl}`);
      return;
    }
    const webhookUrl = `${appUrl.replace(/\/$/, '')}/telegram/webhook`;
    const secret = this.config.getOrThrow<string>('TELEGRAM_WEBHOOK_SECRET');

    try {
      const info = await this.bot.api.getWebhookInfo();
      if (info.url !== webhookUrl) {
        await this.bot.api.setWebhook(webhookUrl, {
          secret_token: secret,
          allowed_updates: ['message', 'callback_query'],
          drop_pending_updates: false,
        });
        this.logger.log(`Webhook o'rnatildi: ${webhookUrl}`);
      } else {
        this.logger.log(`Webhook allaqachon to'g'ri: ${webhookUrl}`);
      }
    } catch (err) {
      this.logger.error(`Webhook setup error: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.useWebhook) {
      await this.bot.stop().catch(() => undefined);
    }
  }

  private registerHandlers(): void {
    // Universal error catcher — handler ichida xato bo'lsa loglarda ko'rinadi
    this.bot.catch((err) => {
      this.logger.error(`Bot handler error: ${err.error}`);
    });

    this.bot.command('start', async (ctx) => {
      const url = this.getWebappUrl();
      this.logger.log(`/start from user ${ctx.from?.id} (@${ctx.from?.username ?? '-'}) → WebApp URL: ${url}`);
      const text = `👋 Assalomu alaykum, ${ctx.from?.first_name ?? 'mehmon'}!\n\nMarketplace botiga xush kelibsiz. Quyidagi tugmadan do'konni oching:`;
      const isHttps = url.startsWith('https://');
      try {
        if (isHttps) {
          await ctx.reply(text, {
            reply_markup: {
              inline_keyboard: [[{ text: '🛍 Do\'konni ochish', web_app: { url } }]],
            },
          });
        } else {
          await ctx.reply(text + `\n\n${url}`, {
            reply_markup: {
              inline_keyboard: [[{ text: '🌐 Do\'konni ochish', url }]],
            },
          });
        }
        this.logger.log(`/start reply sent to ${ctx.from?.id}`);
      } catch (err) {
        this.logger.error(`/start reply failed for ${ctx.from?.id}: ${(err as Error).message}`);
        throw err;
      }
    });

    this.bot.command('help', async (ctx) => {
      await ctx.reply(
        'Yordam kerakmi?\n\n• Do\'konni ochish uchun /start\n• Admin panel uchun /admin\n• Buyurtma berishda muammo bo\'lsa, support orqali yozing.',
      );
    });

    this.bot.command('admin', async (ctx) => {
      const adminUrl = this.adminPanelUrl;
      this.logger.log(`/admin from user ${ctx.from?.id} (@${ctx.from?.username ?? '-'}) → ${adminUrl}`);
      const text =
        '🔐 <b>Admin panel</b>\n\n' +
        'Quyidagi variantlardan birini tanlang:\n\n' +
        '📱 <b>Telegram ichida</b> — bot ichida ochiladi (mobil uchun qulay)\n' +
        '🌐 <b>Brauzerda</b> — alohida brauzer oynasida ochiladi (kompyuter uchun qulay)\n\n' +
        '⚠️ Faqat tasdiqlangan administratorlar uchun.';
      try {
        if (adminUrl.startsWith('https://')) {
          await ctx.reply(text, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '📱 Telegram ichida ochish', web_app: { url: adminUrl } }],
                [{ text: '🌐 Brauzerda ochish', url: adminUrl }],
              ],
            },
          });
        } else {
          await ctx.reply(text + `\n\n${adminUrl}`, { parse_mode: 'HTML' });
        }
      } catch (err) {
        this.logger.error(`/admin reply failed: ${(err as Error).message}`);
      }
    });

    this.bot.callbackQuery(/^order:(.+?):(.+)$/, async (ctx) => {
      const match = ctx.match;
      if (!match) return;
      const action = match[1];
      const orderId = match[2];
      this.callbackEmitter?.emit('callback', { action, orderId, ctx });
      await ctx.answerCallbackQuery({ text: '✓' });
    });
  }

  private callbackEmitter?: { emit: (event: string, data: unknown) => void };
  setCallbackEmitter(emitter: { emit: (event: string, data: unknown) => void }): void {
    this.callbackEmitter = emitter;
  }

  webhookHandler() {
    return webhookCallback(this.bot, 'express');
  }

  async sendToOrdersChannel(text: string, replyMarkup?: InlineKeyboard): Promise<{ messageId: number }> {
    const msg = await this.bot.api.sendMessage(this.ordersChannelId, text, {
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    });
    return { messageId: msg.message_id };
  }

  async editOrdersChannelMessage(messageId: number, text: string, replyMarkup?: InlineKeyboard): Promise<void> {
    try {
      await this.bot.api.editMessageText(this.ordersChannelId, messageId, text, {
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      });
    } catch (err) {
      this.logger.warn(`Failed to edit channel message: ${(err as Error).message}`);
    }
  }

  async sendDirectMessage(telegramId: bigint | number, text: string): Promise<void> {
    try {
      await this.bot.api.sendMessage(Number(telegramId), text, { parse_mode: 'HTML' });
    } catch (err) {
      this.logger.warn(`Failed to send DM to ${telegramId}: ${(err as Error).message}`);
    }
  }

  async sendToSupportChat(text: string, replyMarkup?: InlineKeyboard): Promise<void> {
    const chatId = this.config.get<string>('TELEGRAM_SUPPORT_CHAT_ID');
    if (!chatId) return;
    try {
      await this.bot.api.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: replyMarkup });
    } catch (err) {
      this.logger.warn(`Failed to send to support chat: ${(err as Error).message}`);
    }
  }
}
