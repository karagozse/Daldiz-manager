-- daily_field_check_answers: soru bazlı cevaplar (question_key, answer bool, note, photo_url)
-- daily_field_checks zaten 003 ile var. Bu tablo opsiyonel detay için.

CREATE TABLE IF NOT EXISTS "daily_field_check_answers" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "daily_field_check_id" TEXT NOT NULL REFERENCES "daily_field_checks"("id") ON DELETE CASCADE,
  "question_key" TEXT NOT NULL,
  "answer" BOOLEAN NOT NULL,
  "note" TEXT,
  "photo_url" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "daily_field_check_answers_check_question_key" 
  ON "daily_field_check_answers"("daily_field_check_id", "question_key");
CREATE INDEX IF NOT EXISTS "daily_field_check_answers_check_id_idx" ON "daily_field_check_answers"("daily_field_check_id");
