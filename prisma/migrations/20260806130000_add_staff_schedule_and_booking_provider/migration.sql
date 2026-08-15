-- Additive reservation source metadata and per-staff booking capacity.
ALTER TABLE "Appointment" ADD COLUMN "bookingProvider" TEXT;

CREATE INDEX "Appointment_bookingProvider_scheduledAt_idx"
ON "Appointment"("bookingProvider", "scheduledAt");

UPDATE "Appointment"
SET "bookingProvider" = CASE
  WHEN "source" LIKE 'gmail:%' THEN 'kanzashi'
  WHEN "source" = 'お客様アプリ' THEN 'customer_app'
  WHEN "source" IN ('電話', 'TEL') THEN 'phone'
  WHEN "source" = '店頭' THEN 'walk_in'
  ELSE 'manual'
END
WHERE "bookingProvider" IS NULL;

CREATE TABLE "StaffBookingSetting" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "staffKey" TEXT NOT NULL,
  "staffName" TEXT NOT NULL,
  "maxConcurrentAppointments" INTEGER NOT NULL DEFAULT 1,
  "workStartMinutes" INTEGER NOT NULL DEFAULT 600,
  "workEndMinutes" INTEGER NOT NULL DEFAULT 1140,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StaffBookingSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffBookingSetting_organizationId_staffKey_key"
ON "StaffBookingSetting"("organizationId", "staffKey");

CREATE INDEX "StaffBookingSetting_organizationId_staffName_idx"
ON "StaffBookingSetting"("organizationId", "staffName");

ALTER TABLE "StaffBookingSetting"
ADD CONSTRAINT "StaffBookingSetting_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
