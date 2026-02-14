-- daily_field_check_photos: soru bazlı veya referans fotoğrafları (inspections/harvest_photos pattern)
CREATE TABLE IF NOT EXISTS "daily_field_check_photos" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "daily_field_check_id" TEXT NOT NULL REFERENCES "daily_field_checks"("id") ON DELETE CASCADE,
  "question_key" TEXT,
  "category" TEXT NOT NULL DEFAULT 'evidence',
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "daily_field_check_photos_check_id_idx" ON "daily_field_check_photos"("daily_field_check_id");
CREATE INDEX IF NOT EXISTS "daily_field_check_photos_category_idx" ON "daily_field_check_photos"("category");
