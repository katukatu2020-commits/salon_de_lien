-- AlterTable
ALTER TABLE "Organization"
ADD COLUMN "pointDefaultValidDays" INTEGER NOT NULL DEFAULT 40,
ADD COLUMN "pointMinimumRedeem" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "pointMaxRedemptionPercent" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN "reviewPrizeFirstPoints" INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN "reviewPrizeFirstRate" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "reviewPrizeSecondPoints" INTEGER NOT NULL DEFAULT 200,
ADD COLUMN "reviewPrizeSecondRate" INTEGER NOT NULL DEFAULT 9,
ADD COLUMN "reviewPrizeThirdPoints" INTEGER NOT NULL DEFAULT 80,
ADD COLUMN "reviewPrizeThirdRate" INTEGER NOT NULL DEFAULT 90,
ADD COLUMN "couponDefaultValidDays" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN "couponMaxValidDays" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN "couponMinimumDiscountRate" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "couponMaximumDiscountRate" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "CustomerBroadcast" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdByStaffId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "audienceGender" TEXT,
    "audienceMinAge" INTEGER,
    "audienceMaxAge" INTEGER,
    "audienceMatchedCount" INTEGER NOT NULL DEFAULT 0,
    "couponEnabled" BOOLEAN NOT NULL DEFAULT false,
    "couponTitle" TEXT,
    "couponDescription" TEXT,
    "couponTargetMenu" TEXT,
    "couponDiscountRate" INTEGER,
    "couponValidDays" INTEGER,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerBroadcastRecipient" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "couponIssueId" TEXT,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerBroadcastRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerBroadcast_organizationId_sentAt_idx" ON "CustomerBroadcast"("organizationId", "sentAt");
CREATE INDEX "CustomerBroadcast_status_sentAt_idx" ON "CustomerBroadcast"("status", "sentAt");
CREATE UNIQUE INDEX "CustomerBroadcastRecipient_broadcastId_customerId_key" ON "CustomerBroadcastRecipient"("broadcastId", "customerId");
CREATE INDEX "CustomerBroadcastRecipient_customerId_deliveredAt_idx" ON "CustomerBroadcastRecipient"("customerId", "deliveredAt");
CREATE INDEX "CustomerBroadcastRecipient_couponIssueId_idx" ON "CustomerBroadcastRecipient"("couponIssueId");

-- AddForeignKey
ALTER TABLE "CustomerBroadcast" ADD CONSTRAINT "CustomerBroadcast_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerBroadcastRecipient" ADD CONSTRAINT "CustomerBroadcastRecipient_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "CustomerBroadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerBroadcastRecipient" ADD CONSTRAINT "CustomerBroadcastRecipient_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
