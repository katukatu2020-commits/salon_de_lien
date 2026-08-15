-- This migration was created locally after the AWS runtime had already created
-- the same table. Keep it idempotent so migrate deploy can safely reconcile both
-- histories. Prisma exposes dateKey/slotStartMinutes/capacity through @map.
CREATE TABLE IF NOT EXISTS "BookingCapacityOverride" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "slotStart" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingCapacityOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BookingCapacityOverride_organizationId_date_slotStart_key"
ON "BookingCapacityOverride"("organizationId", "date", "slotStart");
