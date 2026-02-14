-- Ensure daily_field_checks exists (fallback if 003 failed)
-- Idempotent: CREATE TABLE IF NOT EXISTS, indexes IF NOT EXISTS
CREATE TABLE IF NOT EXISTS "daily_field_checks" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId" TEXT NOT NULL,
  "gardenId" INTEGER NOT NULL REFERENCES "gardens"("id") ON DELETE CASCADE,
  "createdById" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "date" DATE NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "answers" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3)
);
CREATE UNIQUE INDEX IF NOT EXISTS "daily_field_checks_gardenId_date_key" ON "daily_field_checks"("gardenId", "date");
CREATE INDEX IF NOT EXISTS "daily_field_checks_tenantId_idx" ON "daily_field_checks"("tenantId");
CREATE INDEX IF NOT EXISTS "daily_field_checks_gardenId_idx" ON "daily_field_checks"("gardenId");
CREATE INDEX IF NOT EXISTS "daily_field_checks_createdById_idx" ON "daily_field_checks"("createdById");
CREATE INDEX IF NOT EXISTS "daily_field_checks_status_idx" ON "daily_field_checks"("status");
