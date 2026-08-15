-- Allow store staff to override the total reception capacity for each date and 30-minute slot.
CREATE TABLE "BookingCapacityOverride" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "slotStartMinutes" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingCapacityOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookingCapacityOverride_organizationId_dateKey_slotStartMinutes_key"
ON "BookingCapacityOverride"("organizationId", "dateKey", "slotStartMinutes");

CREATE INDEX "BookingCapacityOverride_organizationId_dateKey_idx"
ON "BookingCapacityOverride"("organizationId", "dateKey");

ALTER TABLE "BookingCapacityOverride"
ADD CONSTRAINT "BookingCapacityOverride_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
