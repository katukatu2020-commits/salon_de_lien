CREATE TABLE "CustomerOffer" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "offerType" TEXT NOT NULL DEFAULT 'salon',
    "description" TEXT,
    "benefit" TEXT,
    "couponCode" TEXT,
    "expectedRevenue" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "reactionStatus" TEXT,
    "reactionNote" TEXT,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "redeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerOffer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductSuggestion" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "offerId" TEXT,
    "productName" TEXT NOT NULL,
    "category" TEXT,
    "makerName" TEXT,
    "reason" TEXT,
    "estimatedPrice" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "reactionStatus" TEXT,
    "reactionNote" TEXT,
    "purchasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartnerCoupon" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "offerId" TEXT,
    "partnerName" TEXT NOT NULL,
    "industry" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "benefit" TEXT,
    "couponCode" TEXT,
    "url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "reactionStatus" TEXT,
    "reactionNote" TEXT,
    "validUntil" TIMESTAMP(3),
    "redeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerCoupon_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerOffer_customerId_createdAt_idx" ON "CustomerOffer"("customerId", "createdAt");
CREATE INDEX "CustomerOffer_status_validUntil_idx" ON "CustomerOffer"("status", "validUntil");
CREATE INDEX "ProductSuggestion_customerId_createdAt_idx" ON "ProductSuggestion"("customerId", "createdAt");
CREATE INDEX "ProductSuggestion_offerId_idx" ON "ProductSuggestion"("offerId");
CREATE INDEX "ProductSuggestion_status_idx" ON "ProductSuggestion"("status");
CREATE INDEX "PartnerCoupon_customerId_createdAt_idx" ON "PartnerCoupon"("customerId", "createdAt");
CREATE INDEX "PartnerCoupon_offerId_idx" ON "PartnerCoupon"("offerId");
CREATE INDEX "PartnerCoupon_status_validUntil_idx" ON "PartnerCoupon"("status", "validUntil");

ALTER TABLE "CustomerOffer" ADD CONSTRAINT "CustomerOffer_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductSuggestion" ADD CONSTRAINT "ProductSuggestion_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductSuggestion" ADD CONSTRAINT "ProductSuggestion_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "CustomerOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PartnerCoupon" ADD CONSTRAINT "PartnerCoupon_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerCoupon" ADD CONSTRAINT "PartnerCoupon_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "CustomerOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
