-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "referredByCustomerId" TEXT;

-- CreateTable
CREATE TABLE "CustomerPointAccount" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "availablePoints" INTEGER NOT NULL DEFAULT 0,
    "pendingPoints" INTEGER NOT NULL DEFAULT 0,
    "lifetimeEarned" INTEGER NOT NULL DEFAULT 0,
    "lifetimeRedeemed" INTEGER NOT NULL DEFAULT 0,
    "lifetimeExpired" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerPointAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointTransaction" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdByStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointLot" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "earnTransactionId" TEXT NOT NULL,
    "originalAmount" INTEGER NOT NULL,
    "remainingAmount" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointRedemptionAllocation" (
    "id" TEXT NOT NULL,
    "redeemTransactionId" TEXT NOT NULL,
    "pointLotId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointRedemptionAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointRule" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "validDays" INTEGER NOT NULL DEFAULT 180,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrerCustomerId" TEXT NOT NULL,
    "referredCustomerId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'issued',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredAt" TIMESTAMP(3),
    "firstVisitCompletedAt" TIMESTAMP(3),
    "rewardedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- Backfill existing customers with point accounts.
INSERT INTO "CustomerPointAccount" (
    "id",
    "customerId",
    "availablePoints",
    "pendingPoints",
    "lifetimeEarned",
    "lifetimeRedeemed",
    "lifetimeExpired",
    "createdAt",
    "updatedAt"
)
SELECT
    'point_account_' || "Customer"."id",
    "Customer"."id",
    0,
    0,
    0,
    0,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Customer"
WHERE NOT EXISTS (
    SELECT 1 FROM "CustomerPointAccount" WHERE "CustomerPointAccount"."customerId" = "Customer"."id"
);

-- CreateIndex
CREATE INDEX "Customer_referredByCustomerId_idx" ON "Customer"("referredByCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPointAccount_customerId_key" ON "CustomerPointAccount"("customerId");

-- CreateIndex
CREATE INDEX "CustomerPointAccount_availablePoints_idx" ON "CustomerPointAccount"("availablePoints");

-- CreateIndex
CREATE UNIQUE INDEX "PointTransaction_sourceType_sourceId_type_key" ON "PointTransaction"("sourceType", "sourceId", "type");

-- CreateIndex
CREATE INDEX "PointTransaction_customerId_createdAt_idx" ON "PointTransaction"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "PointTransaction_accountId_createdAt_idx" ON "PointTransaction"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "PointTransaction_type_createdAt_idx" ON "PointTransaction"("type", "createdAt");

-- CreateIndex
CREATE INDEX "PointTransaction_sourceType_sourceId_idx" ON "PointTransaction"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "PointLot_customerId_expiresAt_idx" ON "PointLot"("customerId", "expiresAt");

-- CreateIndex
CREATE INDEX "PointLot_earnTransactionId_idx" ON "PointLot"("earnTransactionId");

-- CreateIndex
CREATE INDEX "PointLot_remainingAmount_idx" ON "PointLot"("remainingAmount");

-- CreateIndex
CREATE INDEX "PointRedemptionAllocation_redeemTransactionId_idx" ON "PointRedemptionAllocation"("redeemTransactionId");

-- CreateIndex
CREATE INDEX "PointRedemptionAllocation_pointLotId_idx" ON "PointRedemptionAllocation"("pointLotId");

-- CreateIndex
CREATE UNIQUE INDEX "PointRule_key_key" ON "PointRule"("key");

-- CreateIndex
CREATE INDEX "PointRule_eventType_idx" ON "PointRule"("eventType");

-- CreateIndex
CREATE INDEX "PointRule_active_idx" ON "PointRule"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_tokenHash_key" ON "Referral"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_code_key" ON "Referral"("code");

-- CreateIndex
CREATE INDEX "Referral_referrerCustomerId_createdAt_idx" ON "Referral"("referrerCustomerId", "createdAt");

-- CreateIndex
CREATE INDEX "Referral_referredCustomerId_idx" ON "Referral"("referredCustomerId");

-- CreateIndex
CREATE INDEX "Referral_status_expiresAt_idx" ON "Referral"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "CustomerPointAccount" ADD CONSTRAINT "CustomerPointAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CustomerPointAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointLot" ADD CONSTRAINT "PointLot_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointLot" ADD CONSTRAINT "PointLot_earnTransactionId_fkey" FOREIGN KEY ("earnTransactionId") REFERENCES "PointTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointRedemptionAllocation" ADD CONSTRAINT "PointRedemptionAllocation_redeemTransactionId_fkey" FOREIGN KEY ("redeemTransactionId") REFERENCES "PointTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointRedemptionAllocation" ADD CONSTRAINT "PointRedemptionAllocation_pointLotId_fkey" FOREIGN KEY ("pointLotId") REFERENCES "PointLot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerCustomerId_fkey" FOREIGN KEY ("referrerCustomerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredCustomerId_fkey" FOREIGN KEY ("referredCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

