# Daily Field Check Migration Raporu

## Kullanılan migration sistemi

Proje **iki** migration mekanizması kullanıyor:

1. **Prisma Migrate** (`prisma migrate deploy`)
   - Çalıştırma: Backend başlangıcında `main.ts` içinde
   - Migration dosyaları: `prisma/migrations/`
   - Prisma schema ile senkron

2. **Custom SQL Migrations** (`src/db/migrate.ts`)
   - Çalıştırma: Backend başlangıcında `runMigrations(prisma)` ile
   - Migration dosyaları: `backend/db/migrations/*.sql`
   - Takip: `schema_migrations` tablosu (name, applied_at)
   - harvest_entries, daily_field_checks vb. buradan oluşturuluyor

## DATABASE_URL

- `.env` dosyasından okunuyor (backend kök dizininde)
- Prisma ve custom migrations aynı DATABASE_URL kullanıyor
- Neon: `postgresql://...@ep-xxx.neon.tech/neondb?sslmode=require`
- Doğrulama: `npm run db:migrate-and-verify` DATABASE_URL host'unu logluyor

## Yapılan düzeltmeler

### 1. splitStatements hatası
**Sorun:** Yorum satırı ile başlayan SQL blokları (örn. `-- daily_field_checks...\nCREATE TABLE...`) tamamen atlanıyordu.  
**Çözüm:** `migrate.ts` içinde sadece satır başı yorumlar kaldırılıp içinde gerçek SQL olan bloklar çalıştırılıyor.

### 2. Tablo oluşturma
**Dosyalar:**
- `db/migrations/002_create_daily_field_checks.sql` (ilk deneme, split hatası vardı)
- `db/migrations/003_create_daily_field_checks_table.sql` (çalışan migration)
- `prisma/migrations/20260213000000_add_daily_field_checks/migration.sql` (Prisma tarafı, P3005 nedeniyle deploy atlanıyor)

### 3. Migration path
`migrate.ts` artık `__dirname` ile path çözümlüyor; `process.cwd()` sadece fallback.

## Çalıştırılan komutlar

```bash
cd backend
npm run db:migrate-and-verify
```

veya:

```bash
cd backend
DATABASE_URL="postgresql://..." npx ts-node scripts/run-migrations-and-verify.ts
```

## Doğrulama SQL çıktısı

```
daily* tablolar: daily_field_checks
Tüm public tablolar: campuses, critical_warnings, daily_field_checks, gardens, ...
schema_migrations: 001_create_harvest, 002_create_daily_field_checks, 003_create_daily_field_checks_table
```

## Neon Console kontrolü

1. Neon Console → production branch → SQL Editor
2. `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%daily%';`
3. Sonuç: `daily_field_checks`

## P3005 (Prisma) hakkında

Mevcut production DB'de `prisma migrate deploy` P3005 veriyor (schema not empty, baseline gerekebilir). Bu yüzden daily_field_checks tablosu **custom migrations** ile oluşturuldu. Prisma migration dosyası ileride baseline sonrası kullanılabilir.
