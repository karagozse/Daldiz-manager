import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join, resolve } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Static file serving removed - photos are now served from Cloudflare R2
  // Old code (kept for reference):
  // const uploadsStaticPath = resolve(process.cwd(), 'uploads');
  // app.useStaticAssets(uploadsStaticPath, { prefix: '/uploads' });

  // CORS configuration: production + local dev (localhost / 127.0.0.1 on frontend port)
  const allowedOrigins = [
    'https://daldiz.app',
    'https://www.daldiz.app',
    'https://daldiz-frontend.onrender.com',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
  ];
  // Optional: allow LAN access (e.g. phone on same Wi-Fi) via env
  const extraOrigin = process.env.CORS_ORIGIN;
  if (extraOrigin) {
    allowedOrigins.push(extraOrigin);
  }
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Sadece localhost yerine tüm arayüzlerde dinle (LAN erişimi için)
  await app.listen(port, "0.0.0.0");

  const url = await app.getUrl();
  console.log(`🚀 Backend server running on ${url}`);
}

bootstrap();
