CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "visitId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "couponType" TEXT NOT NULL DEFAULT 'salon',
    "targetMenu" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'issued',
    "issuedReason" TEXT,
    "staffMemo" TEXT,
    "printText" TEXT,
    "aiGeneratedText" TEXT,
    "couponCode" TEXT NOT NULL,
    "couponCodeHash" TEXT,
    "printDesignTitle" TEXT,
    "printSubtitle" TEXT,
    "illustrationImageUrl" TEXT,
    "illustrationPrompt" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "printedAt" TIMESTAMP(3),
    "printCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Coupon_couponCode_key" ON "Coupon"("couponCode");
CREATE INDEX "Coupon_customerId_createdAt_idx" ON "Coupon"("customerId", "createdAt");
CREATE INDEX "Coupon_visitId_idx" ON "Coupon"("visitId");
CREATE INDEX "Coupon_status_validUntil_idx" ON "Coupon"("status", "validUntil");
CREATE INDEX "Coupon_couponType_idx" ON "Coupon"("couponType");
CREATE INDEX "Coupon_targetMenu_idx" ON "Coupon"("targetMenu");

ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
