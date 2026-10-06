CREATE TABLE IF NOT EXISTS "StaffDailySchedule" (
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "staffKey" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "isDayOff" BOOLEAN NOT NULL DEFAULT FALSE,
  "startMinutes" INTEGER NOT NULL,
  "endMinutes" INTEGER NOT NULL,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("organizationId", "staffKey", "date"),
  CONSTRAINT "StaffDailySchedule_time_check" CHECK ("startMinutes" >= 0 AND "endMinutes" <= 1440 AND "startMinutes" < "endMinutes")
);
CREATE INDEX IF NOT EXISTS "StaffDailySchedule_org_date_idx" ON "StaffDailySchedule"("organizationId", "date");
