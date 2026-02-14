/**
 * Manuel migration script: Prisma migrate deploy + custom migrations + doğrulama
 * Neon production branch'a uygulayıp tabloları kontrol etmek için kullanın.
 *
 * Kullanım:
 *   cd backend
 *   DATABASE_URL="postgresql://..." npx ts-node scripts/run-migrations-and-verify.ts
 *
 * veya .env'de DATABASE_URL tanımlıysa:
 *   npx ts-node scripts/run-migrations-and-verify.ts
 */

import { execSync } from 'child_process';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { runMigrations } from '../src/db/migrate';

// .env yükle (backend kök dizininde)
try {
  require('dotenv').config({ path: join(__dirname, '..', '.env') });
} catch {
  // dotenv yoksa devam et - DATABASE_URL zaten env'de olabilir
}

function redactUrl(url: string): string {
  try {
    const u = new URL(url.replace(/^postgresql:\/\//, 'https://'));
    return `${u.hostname}${u.pathname} (branch/DB görünür)`;
  } catch {
    return '(parse edilemedi)';
  }
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('HATA: DATABASE_URL tanımlı değil. .env dosyasını kontrol edin veya env olarak verin.');
    process.exit(1);
  }

  console.log('--- Migration & Doğrulama ---');
  console.log('DATABASE_URL host:', redactUrl(dbUrl));
  console.log('');

  // 1) Prisma migrate deploy (opsiyonel - P3005 baseline gerekebilir)
  console.log('1) prisma migrate deploy çalıştırılıyor...');
  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      cwd: join(__dirname, '..'),
    });
    console.log('   Prisma migrate deploy tamamlandı.\n');
  } catch (e) {
    console.warn('   Prisma migrate deploy atlandı (P3005 baseline gerekebilir). Custom migrations ile devam ediliyor...\n');
  }

  // 2) Custom migrations (schema_migrations, harvest, daily_field_checks vb.)
  console.log('2) Custom migrations (runMigrations) çalıştırılıyor...');
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    await runMigrations(prisma as any);
    console.log('   Custom migrations tamamlandı.\n');
  } catch (e) {
    console.error('   Custom migrations HATA:', (e as Error).message);
    await prisma.$disconnect();
    process.exit(1);
  }

  // 3) Doğrulama: daily ile ilgili tablolar
  console.log('3) Doğrulama: public schema tabloları...');
  const tables = await prisma.$queryRawUnsafe<
    { tablename: string }[]
  >(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%daily%' ORDER BY tablename`
  );
  console.log('   daily* tablolar:', tables.length ? tables.map((r) => r.tablename).join(', ') : '(yok)');

  const allTables = await prisma.$queryRawUnsafe<
    { tablename: string }[]
  >(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`);
  console.log('   Tüm public tablolar:', allTables.map((r) => r.tablename).join(', '));

  // schema_migrations içeriği
  const migrations = await prisma.$queryRawUnsafe<
    { name: string; applied_at: Date }[]
  >(`SELECT name, applied_at FROM schema_migrations ORDER BY name`).catch(() => []);
  console.log('\n   schema_migrations:', migrations.length ? migrations.map((m) => m.name).join(', ') : '(boş veya yok)');

  await prisma.$disconnect();

  if (!tables.some((t) => t.tablename === 'daily_field_checks')) {
    console.error('\nUYARI: daily_field_checks tablosu bulunamadı. Migration tekrar kontrol edin.');
    process.exit(1);
  }
  console.log('\n--- Başarılı: daily_field_checks tablosu mevcut ---');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
