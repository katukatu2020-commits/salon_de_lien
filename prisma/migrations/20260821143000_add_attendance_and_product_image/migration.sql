ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

CREATE TABLE IF NOT EXISTS "StaffAttendanceRecord" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "staffKey" TEXT NOT NULL,
  "staffName" TEXT NOT NULL,
  "recordedByUserId" TEXT,
  "workDate" TEXT NOT NULL,
  "clockInAt" TIMESTAMPTZ NOT NULL,
  "breakStartedAt" TIMESTAMPTZ,
  "breakEndedAt" TIMESTAMPTZ,
  "clockOutAt" TIMESTAMPTZ,
  "note" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "StaffAttendanceRecord_org_date_idx"
  ON "StaffAttendanceRecord"("organizationId", "workDate", "clockInAt");

CREATE UNIQUE INDEX IF NOT EXISTS "StaffAttendanceRecord_org_staff_date_key"
  ON "StaffAttendanceRecord"("organizationId", "staffKey", "workDate");

CREATE UNIQUE INDEX IF NOT EXISTS "StaffAttendanceRecord_open_staff_key"
  ON "StaffAttendanceRecord"("organizationId", "staffKey")
  WHERE "clockOutAt" IS NULL;

CREATE TABLE IF NOT EXISTS "StaffAttendancePolicy" (
  "organizationId" TEXT NOT NULL,
  "staffKey" TEXT NOT NULL,
  "plannedStart" TEXT NOT NULL DEFAULT '10:00',
  "plannedEnd" TEXT NOT NULL DEFAULT '19:00',
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("organizationId", "staffKey")
);
