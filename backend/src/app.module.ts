import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { CartModule } from './modules/cart/cart.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PromoCodesModule } from './modules/promo-codes/promo-codes.module';
import { SupportModule } from './modules/support/support.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { RelatedProductsModule } from './modules/related-products/related-products.module';
import { BannersModule } from './modules/banners/banners.module';
import { TelegramBotModule } from './modules/telegram-bot/telegram-bot.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AdminAuthModule } from './modules/admin-auth/admin-auth.module';
import { AdminProductsModule } from './modules/admin/admin-products.module';
import { AdminCategoriesModule } from './modules/admin/admin-categories.module';
import { AdminOrdersModule } from './modules/admin/admin-orders.module';
import { AdminUsersModule } from './modules/admin/admin-users.module';
import { AdminPromoModule } from './modules/admin/admin-promo.module';
import { AdminSupportModule } from './modules/admin/admin-support.module';
import { AdminBannersModule } from './modules/admin/admin-banners.module';
import { AdminRelatedModule } from './modules/admin/admin-related.module';
import { AdminSettingsModule } from './modules/admin/admin-settings.module';
import { AdminAdminsModule } from './modules/admin/admin-admins.module';
import { AdminStatsModule } from './modules/admin/admin-stats.module';
import { UploadsModule } from './modules/uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: { singleLine: true, translateTime: 'HH:MM:ss' },
              }
            : undefined,
        autoLogging: true,
        redact: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-telegram-init-data"]'],
      },
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    CartModule,
    FavoritesModule,
    OrdersModule,
    PromoCodesModule,
    SupportModule,
    AnalyticsModule,
    RelatedProductsModule,
    BannersModule,
    TelegramBotModule,
    NotificationsModule,
    SettingsModule,
    // Admin
    AdminAuthModule,
    UploadsModule,
    AdminProductsModule,
    AdminCategoriesModule,
    AdminOrdersModule,
    AdminUsersModule,
    AdminPromoModule,
    AdminSupportModule,
    AdminBannersModule,
    AdminRelatedModule,
    AdminSettingsModule,
    AdminAdminsModule,
    AdminStatsModule,
  ],
})
export class AppModule {}
