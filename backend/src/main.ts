import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { resolve, isAbsolute } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TraceIdInterceptor } from './common/interceptors/trace-id.interceptor';
import { corsOriginFn } from './common/helpers/cors-origins';

// JSON.stringify BigInt'larni qanday serialize qilishni bilmaydi —
// Prisma'dagi BigInt maydonlar (masalan, Tenant.ownerTelegramId,
// User.telegramId) javob yuborilishda "Do not know how to serialize a
// BigInt" xatosi beradi. Global toJSON o'rnatib, ularni avtomatik
// string'ga aylantiramiz. Telegram ID lar 64-bit bo'lishi mumkin —
// JavaScript Number 2^53 dan oshganda aniqlikni yo'qotadi, shuning
// uchun string eng xavfsiz ko'rinish.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function (
  this: bigint,
): string {
  return this.toString();
};

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));

  // Nginx orqasida turamiz: req.ip / X-Forwarded-Proto to'g'ri bo'lsin
  // (rate-limit, audit log IP, secure cookie). Bitta proxy hop.
  app.set('trust proxy', 1);

  // Origin ro'yxati bitta joyda (HTTP + Socket.IO): common/helpers/cors-origins.ts.
  // Dev tunnel/localhost origin'lari production'da yopiq.
  app.enableCors({
    origin: corsOriginFn,
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Accept-Language',
      'Authorization',
      'X-Telegram-Init-Data',
      'X-Tenant-Slug',
      'bypass-tunnel-reminder',
    ],
  });
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());

  app.setGlobalPrefix('api', {
    exclude: ['telegram/webhook', 'telegram/t/:tenantId/webhook'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TraceIdInterceptor());

  const uploadDirRaw = process.env.UPLOAD_DIR ?? './uploads';
  const uploadDir = isAbsolute(uploadDirRaw) ? uploadDirRaw : resolve(process.cwd(), uploadDirRaw);
  app.useStaticAssets(uploadDir, {
    prefix: '/uploads/',
  });

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`🚀 Marketplace API running on http://localhost:${port}`);
}

bootstrap();
