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
  private readonly ordersChannelId: string;
  private readonly botUsername: string;
  private readonly tunnelFilePath: string;

  constructor(private readonly config: ConfigService) {
    const token = this.config.getOrThrow<string>('TELEGRAM_BOT_TOKEN');
    this.bot = new Bot(token);
    this.useWebhook = this.config.get('TELEGRAM_USE_WEBHOOK') === 'true';
    this.envWebappUrl = this.config.getOrThrow<string>('WEBAPP_URL');
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
      const me = await this.bot.api.getMe();
      this.logger.log(`Bot @${me.username} connected (id=${me.id})`);
      if (this.useWebhook) {
        // Webhook'ni avtomatik o'rnatamiz (deploy/restart paytida)
        await this.ensureWebhook();
      } else {
        // Polling rejimida webhook'ni o'chirish kerak (gibrid bo'lmasin)
        await this.bot.api.deleteWebhook({ drop_pending_updates: false }).catch(() => undefined);
        void this.bot.start({
          onStart: (info) => this.logger.log(`Polling started as @${info.username}`),
        });
      }
    } catch (err) {
      this.logger.error(`Bot init failed: ${(err as Error).message}`);
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
    this.bot.command('start', async (ctx) => {
      const url = this.getWebappUrl();
      const text = `👋 Assalomu alaykum, ${ctx.from?.first_name ?? 'mehmon'}!\n\nMarketplace botiga xush kelibsiz. Quyidagi tugmadan do'konni oching:`;
      this.logger.debug(`/start → WebApp URL: ${url}`);
      // WebApp button only supports HTTPS (or t.me/<bot> deep-link). If we have https — use it; otherwise fallback to URL button.
      const isHttps = url.startsWith('https://');
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
    });

    this.bot.command('help', async (ctx) => {
      await ctx.reply(
        'Yordam kerakmi?\n\n• Do\'konni ochish uchun /start\n• Buyurtma berishda muammo bo\'lsa, support orqali yozing.',
      );
    });

    this.bot.callbackQuery(/^order:(.+?):(.+)$/, async (ctx) => {
      // Format: order:<action>:<orderId>
      const match = ctx.match;
      if (!match) return;
      const action = match[1];
      const orderId = match[2];
      // Emit event for listener to handle
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
