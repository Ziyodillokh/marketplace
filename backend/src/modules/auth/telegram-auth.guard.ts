import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { InvalidInitDataError } from '@/common/helpers/telegram-init-data';
import { TenantScopeService } from '@/common/tenant-scope/tenant-scope.service';

const DEV_TELEGRAM_ID = 999000001;

@Injectable()
export class TelegramAuthGuard implements CanActivate {
  private readonly devMode = process.env.NODE_ENV !== 'production';

  constructor(
    private readonly auth: AuthService,
    private readonly tenantScope: TenantScopeService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: unknown;
      tenantId?: string | null;
    }>();

    const initData =
      (req.headers['x-telegram-init-data'] as string | undefined) ??
      (req.headers['x-telegram-initdata'] as string | undefined);

    // Multi-tenant: do'kon slug'i bo'lsa, o'sha sotuvchi bot tokeni bilan tekshiramiz
    const shopSlug = req.headers['x-tenant-slug'];
    const scope = shopSlug ? await this.tenantScope.resolve(shopSlug) : null;
    req.tenantId = scope?.tenantId ?? null;
    const tenantBotToken = scope?.botToken ?? undefined;

    // DEV mode: agar Telegram'dan tashqari brauzerda ochilgan bo'lsa,
    // initData yo'q va dev user ishlatiladi.
    if (!initData && this.devMode) {
      const user = await this.auth.devLogin(DEV_TELEGRAM_ID);
      if (user.isBlocked) throw new ForbiddenException('User is blocked');
      (req as { user: unknown }).user = user;
      return true;
    }

    if (!initData) {
      throw new UnauthorizedException('Telegram initData required');
    }

    try {
      const user = await this.auth.authenticate(initData, tenantBotToken);
      if (user.isBlocked) throw new ForbiddenException('User is blocked');
      (req as { user: unknown }).user = user;
      return true;
    } catch (err) {
      if (err instanceof InvalidInitDataError) {
        // Dev'da invalid initData ham bo'lishi mumkin — bypass qilamiz
        if (this.devMode) {
          const user = await this.auth.devLogin(DEV_TELEGRAM_ID);
          if (user.isBlocked) throw new ForbiddenException('User is blocked');
          (req as { user: unknown }).user = user;
          return true;
        }
        throw new UnauthorizedException(err.message);
      }
      throw err;
    }
  }
}
