import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { execSync } from 'child_process';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { PrismaService } from './prisma/prisma.service';
import { runMigrations } from './db/migrate';

async function bootstrap() {
  if (process.env.SEED_ON_START === 'true') {
    console.log('SEED_ON_START=true: running prisma db seed...');
    execSync('npx prisma db seed', { stdio: 'inherit' });
  }

  try {
    execSync('npx prisma migrate deploy', { stdio: 'pipe', cwd: process.cwd() });
  } catch {
    // DB may be unreachable or already up-to-date; continue so app boots
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Idempotent custom migrations (harvest_entries, harvest_photos, schema_migrations)
  try {
    const prisma = app.get(PrismaService);
    await prisma.$connect();
    await runMigrations(prisma as any);
  } catch (e) {
    console.warn('Custom migrations skipped or failed:', (e as Error).message);
  }

  // Serve uploaded files at /uploads
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  app.enableCors({
    origin: [
      "http://localhost:8080",
      "http://localhost:8081",
      "http://localhost:5173",
      "http://127.0.0.1:8080",
      "http://127.0.0.1:8081",
      "http://127.0.0.1:5173"
    ],
    credentials: true,
  });

  await app.listen(process.env.PORT || 3100);
}
bootstrap();
