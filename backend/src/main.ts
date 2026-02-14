import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { execSync } from 'child_process';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { PrismaService } from './prisma/prisma.service';
import { runMigrations } from './db/migrate';

/** Redact DATABASE_URL for safe logging: show host + db name only, no password */
function redactDbUrl(url: string | undefined): string {
  if (!url || typeof url !== 'string') return '(not set)';
  try {
    const u = new URL(url.replace(/^postgresql:\/\//, 'https://'));
    return `${u.hostname}${u.pathname || '/'}`;
  } catch {
    return '(parse failed)';
  }
}

async function bootstrap() {
  // Load backend/.env explicitly (works regardless of cwd - single source for DATABASE_URL)
  try {
    require('dotenv').config({ path: join(__dirname, '..', '.env') });
  } catch {
    // dotenv optional
  }

  // Log DB connection at startup (masked - no password)
  const dbUrl = process.env.DATABASE_URL;
  const dbTarget = redactDbUrl(dbUrl);
  const isNeon = dbTarget.includes('neon.tech');
  console.log('[boot] NODE_ENV:', process.env.NODE_ENV || '(not set)');
  console.log('[boot] DATABASE_URL target:', dbTarget, isNeon ? '(Neon)' : '(local/other)');
  if (process.env.SEED_ON_START === 'true') {
    console.log('SEED_ON_START=true: running prisma db seed...');
    execSync('npx prisma db seed', { stdio: 'inherit' });
  }

  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'pipe',
      cwd: join(__dirname, '..'),
    });
  } catch {
    // DB may be unreachable or already up-to-date; continue so app boots
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Idempotent custom migrations (harvest_entries, daily_field_checks, etc.)
  try {
    const prisma = app.get(PrismaService);
    await prisma.$connect();
    await runMigrations(prisma as any);
    console.log('Custom migrations completed.');
  } catch (e) {
    console.error('Custom migrations failed:', (e as Error).message);
    console.error('Ensure DATABASE_URL is correct and DB is reachable. daily_field_checks table may be missing.');
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
