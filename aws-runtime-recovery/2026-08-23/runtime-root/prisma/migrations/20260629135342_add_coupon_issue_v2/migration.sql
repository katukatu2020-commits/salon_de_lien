-- DropIndex
DROP INDEX "StyleSuggestion_customerId_archivedAt_createdAt_idx";

-- CreateTable
CREATE TABLE "CouponIssue" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "staffUserId" TEXT,
    "styleSuggestionId" TEXT,
    "couponCode" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "discountRate" INTEGER NOT NULL,
    "targetMenusJson" JSONB NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "salonMessage" TEXT,
    "footerAddress" TEXT,
    "footerHours" TEXT,
    "footerReservation" TEXT,
    "footerPayments" TEXT,
    "templateVersion" TEXT NOT NULL DEFAULT 'coupon-v2',
    "status" TEXT NOT NULL DEFAULT 'issued',
    "printedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CouponIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CouponIssue_couponCode_key" ON "CouponIssue"("couponCode");

-- CreateIndex
CREATE INDEX "CouponIssue_customerId_createdAt_idx" ON "CouponIssue"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "CouponIssue_couponCode_idx" ON "CouponIssue"("couponCode");

-- AddForeignKey
ALTER TABLE "CouponIssue" ADD CONSTRAINT "CouponIssue_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
