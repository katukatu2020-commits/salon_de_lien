ALTER TABLE "Product"
ADD COLUMN "salesSuspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "salesStagnant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "campaignTags" JSONB;

UPDATE "Product" p
SET "salesStagnant" = true
WHERE p."active" = true
  AND NOT EXISTS (
    SELECT 1
    FROM "ProductSaleLine" line
    WHERE line."productId" = p."id"
      AND line."createdAt" >= NOW() - INTERVAL '90 days'
  );
