CREATE TABLE "PendingPointReward" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "eligibleAfter" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "claimContextType" TEXT,
    "claimContextId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingPointReward_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PendingPointReward_sourceType_sourceId_key"
ON "PendingPointReward"("sourceType", "sourceId");

CREATE INDEX "PendingPointReward_customerId_status_expiresAt_idx"
ON "PendingPointReward"("customerId", "status", "expiresAt");

CREATE INDEX "PendingPointReward_status_eligibleAfter_expiresAt_idx"
ON "PendingPointReward"("status", "eligibleAfter", "expiresAt");

ALTER TABLE "PendingPointReward"
ADD CONSTRAINT "PendingPointReward_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
