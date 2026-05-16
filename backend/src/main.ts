import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TraceIdInterceptor } from './common/interceptors/trace-id.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));

  const webappUrl = process.env.WEBAPP_URL ?? 'http://localhost:5174';
  const adminUrl = process.env.ADMIN_URL ?? 'http://localhost:5175';

  app.enableCors({
    origin: [
      webappUrl,
      adminUrl,
      /\.ngrok-free\.app$/,
      /\.ngrok\.io$/,
      /\.trycloudflare\.com$/,
      /\.loca\.lt$/,
      /^http:\/\/localhost(:\d+)?$/,
    ],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Accept-Language',
      'X-Telegram-Init-Data',
      'bypass-tunnel-reminder',
    ],
  });
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());

  app.setGlobalPrefix('api', { exclude: ['health', 'telegram/webhook'] });

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

  app.useStaticAssets(join(process.cwd(), process.env.UPLOAD_DIR ?? './uploads'), {
    prefix: '/uploads/',
  });

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`🚀 Marketplace API running on http://localhost:${port}`);
}

bootstrap();
