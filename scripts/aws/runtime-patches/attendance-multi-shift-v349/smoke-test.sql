BEGIN;

CREATE TABLE "StaffAttendanceRecord" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "staffKey" TEXT NOT NULL,
  "staffName" TEXT NOT NULL,
  "workDate" TEXT NOT NULL,
  "clockInAt" TIMESTAMPTZ NOT NULL,
  "breakStartedAt" TIMESTAMPTZ,
  "breakEndedAt" TIMESTAMPTZ,
  "clockOutAt" TIMESTAMPTZ,
  "breakSeconds" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX "StaffAttendanceRecord_org_staff_date_idx"
  ON "StaffAttendanceRecord"("organizationId", "staffKey", "workDate", "clockInAt");
CREATE UNIQUE INDEX "StaffAttendanceRecord_open_staff_key"
  ON "StaffAttendanceRecord"("organizationId", "staffKey")
  WHERE "clockOutAt" IS NULL;

INSERT INTO "StaffAttendanceRecord" VALUES
  ('morning','org','staff','スタッフ','2026-08-21','2026-08-21 00:00:00+00',NULL,'2026-08-21 03:00:00+00','2026-08-21 03:00:00+00',1800),
  ('afternoon','org','staff','スタッフ','2026-08-21','2026-08-21 04:00:00+00',NULL,'2026-08-21 08:00:00+00','2026-08-21 08:00:00+00',1800);

DO $$
DECLARE
  shift_count INTEGER;
  work_minutes INTEGER;
  break_minutes INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER,
    FLOOR(SUM(EXTRACT(EPOCH FROM ("clockOutAt"-"clockInAt"))-"breakSeconds")/60)::INTEGER,
    FLOOR(SUM("breakSeconds")/60)::INTEGER
  INTO shift_count, work_minutes, break_minutes
  FROM "StaffAttendanceRecord"
  WHERE "organizationId"='org' AND "staffKey"='staff' AND "workDate"='2026-08-21';

  IF shift_count <> 2 OR work_minutes <> 360 OR break_minutes <> 60 THEN
    RAISE EXCEPTION 'attendance totals differ: shifts %, work %, break %', shift_count, work_minutes, break_minutes;
  END IF;
END $$;

ROLLBACK;
