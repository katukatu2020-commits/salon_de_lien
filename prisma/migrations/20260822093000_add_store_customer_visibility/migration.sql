ALTER TABLE "Customer"
ADD COLUMN IF NOT EXISTS "storeHiddenAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Customer_organizationId_storeHiddenAt_deletedAt_idx"
ON "Customer"("organizationId", "storeHiddenAt", "deletedAt");
