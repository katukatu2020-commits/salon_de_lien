ALTER TABLE "Appointment"
ADD COLUMN "durationMinutes" INTEGER;

UPDATE "Appointment"
SET "durationMinutes" = CAST(substring("note" from '所要時間: ([0-9]+)分') AS INTEGER)
WHERE "durationMinutes" IS NULL
  AND "note" ~ '所要時間: [0-9]+分';
