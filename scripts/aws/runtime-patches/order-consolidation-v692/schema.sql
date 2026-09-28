CREATE TABLE IF NOT EXISTS "WholesaleShippingPolicy" (
 "dealerId" TEXT PRIMARY KEY REFERENCES "WholesaleDealer"("id"),
 "feeYen" INTEGER NOT NULL DEFAULT 0 CHECK ("feeYen" BETWEEN 0 AND 1000000),
 "freeThresholdYen" INTEGER NOT NULL DEFAULT 0 CHECK ("freeThresholdYen" BETWEEN 0 AND 100000000),
 "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(), "updatedBy" TEXT NOT NULL
);
ALTER TABLE "WholesaleOrder" ADD COLUMN IF NOT EXISTS "consolidationClosesAt" TIMESTAMPTZ(3);
ALTER TABLE "WholesaleOrder" ADD COLUMN IF NOT EXISTS "businessDate" DATE;
ALTER TABLE "WholesaleOrder" ADD COLUMN IF NOT EXISTS "shippingPolicyFeeYen" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WholesaleOrder" ADD COLUMN IF NOT EXISTS "shippingFreeThresholdYen" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WholesaleOrder" ADD COLUMN IF NOT EXISTS "shippingFeeYen" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS "WholesaleOrder_open_batch_key" ON "WholesaleOrder" ("dealerId","organizationId","consolidationClosesAt") WHERE "consolidationClosesAt" IS NOT NULL AND "status"<>'CANCELLED';
CREATE TABLE IF NOT EXISTS "WholesaleOrderSubmission" (
 "organizationId" TEXT NOT NULL REFERENCES "Organization"("id"), "key" TEXT NOT NULL,
 "userId" TEXT NOT NULL, "payloadHash" TEXT NOT NULL, "result" JSONB NOT NULL,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY ("organizationId","key")
);
