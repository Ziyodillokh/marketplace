import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, InlineKeyboard, InputFile, webhookCallback } from 'grammy';

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  readonly bot: Bot;
  private readonly useWebhook: boolean;
  private readonly adminPanelUrl: string;
  private readonly ordersChannelId: string;
  private readonly paymentsChatId: string;
  private readonly botUsername: string;

  constructor(private readonly config: ConfigService) {
    const token = this.config.getOrThrow<string>('TELEGRAM_BOT_TOKEN');
    this.bot = new Bot(token);
    this.useWebhook = this.config.get('TELEGRAM_USE_WEBHOOK') === 'true';
    // Sellio bot do'kon emas, sotuvchi onboarding/panelini ochadi (/register).
    // Sahifa o'zi hal qiladi: ro'yxatdan o'tgan bo'lsa panelga kiritadi, bo'lmasa forma ko'rsatadi.
    // ADMIN_PANEL_URL berilmasa ADMIN_URL (masalan https://admin.selliostore.uz) + /register ishlatiladi.
    // ADMIN_PANEL_URL bo'sh satr bo'lsa ham (?? bo'shni ushlamaydi) ADMIN_URL ga tushamiz
    this.adminPanelUrl =
      (this.config.get<string>('ADMIN_PANEL_URL') || '').trim() ||
      `${(this.config.get<string>('ADMIN_URL') ?? '').replace(/\/$/, '')}/register`;
    this.ordersChannelId = this.config.getOrThrow<string>('TELEGRAM_ORDERS_CHANNEL_ID');
    // To'lov tasdiqlash xabarlari shu chatga boradi (berilmasa orders kanaliga)
    this.paymentsChatId =
      this.config.get<string>('TELEGRAM_PAYMENTS_CHAT_ID') ?? this.ordersChannelId;
    this.botUsername = this.config.getOrThrow<string>('TELEGRAM_BOT_USERNAME');
    this.registerHandlers();
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
        { command: 'id', description: "Telegram ID (jamoaga qo'shilish uchun)" },
        { command: 'help', description: 'Yordam / Помощь' },
      ]);
      this.logger.log('Bot commands ro\'yxati o\'rnatildi');

      const adminUrl = this.adminPanelUrl;
      if (adminUrl.startsWith('https://')) {
        await this.bot.api.setChatMenuButton({
          menu_button: {
            type: 'web_app',
            text: '🏪 Mening do\'konim',
            web_app: { url: adminUrl },
          },
        });
        this.logger.log(`Chat menu button o'rnatildi → ${adminUrl}`);
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
      const url = this.adminPanelUrl;
      this.logger.log(`/start from user ${ctx.from?.id} (@${ctx.from?.username ?? '-'}) → Admin URL: ${url}`);
      const text = `👋 Assalomu alaykum, ${ctx.from?.first_name ?? 'mehmon'}!\n\nSellio'ga xush kelibsiz — Telegramda o'z onlayn do'koningizni oching. Quyidagi tugmadan boshlang:`;
      const isHttps = url.startsWith('https://');
      try {
        if (isHttps) {
          await ctx.reply(text, {
            reply_markup: {
              inline_keyboard: [[{ text: '🚀 Boshlash', web_app: { url } }]],
            },
          });
        } else {
          await ctx.reply(text + `\n\n${url}`, {
            reply_markup: {
              inline_keyboard: [[{ text: '🚀 Boshlash', url }]],
            },
          });
        }
        this.logger.log(`/start reply sent to ${ctx.from?.id}`);
      } catch (err) {
        this.logger.error(`/start reply failed for ${ctx.from?.id}: ${(err as Error).message}`);
        throw err;
      }
    });

    // Xodimni do'kon jamoasiga qo'shish uchun kerak bo'ladigan Telegram ID
    this.bot.command('id', async (ctx) => {
      const id = ctx.from?.id;
      await ctx.reply(
        `🆔 Sizning Telegram ID: <code>${id}</code>\n\n` +
          'Do\'kon egasi sizni jamoaga qo\'shishi uchun shu raqamni unga yuboring.',
        { parse_mode: 'HTML' },
      );
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
        'Quyidagi tugmadan admin panelni oching va login/parolingiz bilan kiring.\n\n' +
        '⚠️ Faqat tasdiqlangan administratorlar uchun.';
      try {
        if (adminUrl.startsWith('https://')) {
          // Faqat web_app tugma — admin panel Telegram ichida ochiladi.
          await ctx.reply(text, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔐 Admin panelni ochish', web_app: { url: adminUrl } }],
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

    // To'lovni tasdiqlash / bekor qilish tugmalari
    this.bot.callbackQuery(/^pay:(approve|reject):(.+)$/, async (ctx) => {
      const match = ctx.match;
      if (!match) return;
      const action = match[1];
      const tenantId = match[2];
      this.callbackEmitter?.emit('payment-callback', { action, tenantId, ctx });
      await ctx.answerCallbackQuery({ text: action === 'approve' ? '✅' : '❌' });
    });
  }

  private callbackEmitter?: { emit: (event: string, data: unknown) => void };
  setCallbackEmitter(emitter: { emit: (event: string, data: unknown) => void }): void {
    this.callbackEmitter = emitter;
  }

  webhookHandler() {
    return webhookCallback(this.bot, 'express');
  }

  /** To'lov chekini (rasm) tasdiqlash chatiga tugmalar bilan yuboradi. */
  async sendPaymentReceipt(
    photo: Buffer,
    caption: string,
    tenantId: string,
  ): Promise<{ messageId: number }> {
    const keyboard = new InlineKeyboard()
      .text('✅ Tasdiqlash', `pay:approve:${tenantId}`)
      .text('❌ Bekor qilish', `pay:reject:${tenantId}`);
    const msg = await this.bot.api.sendPhoto(this.paymentsChatId, new InputFile(photo, 'chek.jpg'), {
      caption,
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
    return { messageId: msg.message_id };
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
    // Support chat berilmasa — to'lov/admin kanaliga yuboramiz (har doim sozlangan)
    const chatId = this.config.get<string>('TELEGRAM_SUPPORT_CHAT_ID') || this.paymentsChatId;
    if (!chatId) return;
    try {
      await this.bot.api.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: replyMarkup });
    } catch (err) {
      this.logger.warn(`Failed to send to support chat: ${(err as Error).message}`);
    }
  }
}
