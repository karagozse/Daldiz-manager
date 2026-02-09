# Custom DB migrations (harvest tabloları)

- **Ne zaman çalışır:** Backend startup'ta (`main.ts`) `runMigrations(prisma)` otomatik çağrılır.
- **Nasıl çalışır:** `db/migrations/*.sql` dosyaları isim sırasına göre okunur; `schema_migrations` tablosunda adı kayıtlı olmayan her dosya bir kez çalıştırılır, sonra adı `schema_migrations`'a yazılır.
- **Idempotent:** Tüm SQL `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` kullanır; aynı migration tekrar çalışsa da hata vermez.
