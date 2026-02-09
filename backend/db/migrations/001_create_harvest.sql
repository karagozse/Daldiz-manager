-- Idempotent harvest tables migration (run by custom migrate() on startup)
-- schema_migrations is created by migrate.ts before running this file

-- Traders (required by harvest_entries FK)
CREATE TABLE IF NOT EXISTS traders (
  id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId" TEXT NOT NULL,
  name TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS traders_tenantId_name_key ON traders("tenantId", name);
CREATE INDEX IF NOT EXISTS traders_tenantId_idx ON traders("tenantId");
CREATE INDEX IF NOT EXISTS traders_name_idx ON traders(name);

-- Harvest entries (Prisma: HarvestEntry)
CREATE TABLE IF NOT EXISTS harvest_entries (
  id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId" TEXT NOT NULL,
  "gardenId" INTEGER NOT NULL REFERENCES gardens(id) ON DELETE RESTRICT,
  "trader_id" TEXT REFERENCES traders(id) ON DELETE SET NULL,
  "trader_name" TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  price_per_kg DECIMAL(12,4) NOT NULL DEFAULT 0,
  grade1_kg DECIMAL(12,4),
  grade2_kg DECIMAL(12,4),
  third_label TEXT,
  third_kg DECIMAL(12,4),
  third_price_per_kg DECIMAL(12,4),
  independent_scale_full_kg DECIMAL(12,4),
  independent_scale_empty_kg DECIMAL(12,4),
  trader_scale_full_kg DECIMAL(12,4),
  trader_scale_empty_kg DECIMAL(12,4),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS harvest_entries_tenantId_idx ON harvest_entries("tenantId");
CREATE INDEX IF NOT EXISTS harvest_entries_gardenId_idx ON harvest_entries("gardenId");
CREATE INDEX IF NOT EXISTS harvest_entries_date_idx ON harvest_entries(date);
CREATE INDEX IF NOT EXISTS harvest_entries_status_idx ON harvest_entries(status);
CREATE INDEX IF NOT EXISTS harvest_entries_trader_id_idx ON harvest_entries("trader_id");

-- Harvest photos (Prisma: HarvestPhoto)
CREATE TABLE IF NOT EXISTS harvest_photos (
  id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  harvest_id TEXT NOT NULL REFERENCES harvest_entries(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  url TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS harvest_photos_harvest_id_idx ON harvest_photos(harvest_id);
CREATE INDEX IF NOT EXISTS harvest_photos_category_idx ON harvest_photos(category);

-- Add trader_id/trader_name to harvest_entries if table existed without them (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'harvest_entries' AND column_name = 'trader_id') THEN
    ALTER TABLE harvest_entries ADD COLUMN "trader_id" TEXT REFERENCES traders(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'harvest_entries' AND column_name = 'trader_name') THEN
    ALTER TABLE harvest_entries ADD COLUMN "trader_name" TEXT NOT NULL DEFAULT '';
  END IF;
END $$;
