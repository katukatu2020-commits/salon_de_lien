-- A staff member may have multiple completed work intervals on the same day,
-- while the partial unique index continues to allow only one open interval.
DROP INDEX IF EXISTS "StaffAttendanceRecord_org_staff_date_key";

CREATE INDEX IF NOT EXISTS "StaffAttendanceRecord_org_staff_date_idx"
  ON "StaffAttendanceRecord"("organizationId", "staffKey", "workDate", "clockInAt");

ALTER TABLE "StaffAttendanceRecord"
  ADD COLUMN IF NOT EXISTS "breakSeconds" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "StaffAttendanceRecord"
  ADD COLUMN IF NOT EXISTS "legacyBreakMigrated" BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE "StaffAttendanceRecord"
SET "breakSeconds" = GREATEST(0, EXTRACT(EPOCH FROM ("breakEndedAt" - "breakStartedAt"))::INTEGER),
    "legacyBreakMigrated" = TRUE
WHERE "legacyBreakMigrated" = FALSE
  AND "breakStartedAt" IS NOT NULL
  AND "breakEndedAt" IS NOT NULL;

UPDATE "StaffAttendanceRecord"
SET "legacyBreakMigrated" = TRUE
WHERE "legacyBreakMigrated" = FALSE
  AND ("breakStartedAt" IS NULL OR "breakEndedAt" IS NULL);
