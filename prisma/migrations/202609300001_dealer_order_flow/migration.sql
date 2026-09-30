ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "serviceMode" TEXT NOT NULL DEFAULT 'FULL';
ALTER TABLE "AppUser" ADD COLUMN IF NOT EXISTS "orderOnlyPasswordChangeRequired" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "DealerSalesMember" ADD COLUMN IF NOT EXISTS "canProcure" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "WholesaleDealerContract" ADD COLUMN IF NOT EXISTS "showDiscountRate" BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE "WholesaleDealerProduct" ADD COLUMN IF NOT EXISTS "manufacturerProductCode" TEXT;
CREATE TABLE IF NOT EXISTS "DealerSupplier" (
 "id" TEXT PRIMARY KEY,
 "dealerId" TEXT NOT NULL REFERENCES "WholesaleDealer"("id"),
 "name" TEXT NOT NULL, "code" TEXT NOT NULL,
 "note" TEXT NOT NULL DEFAULT '', "active" BOOLEAN NOT NULL DEFAULT TRUE,
 "exporterKey" TEXT NOT NULL DEFAULT 'generic',
 "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE ("dealerId","code"), UNIQUE ("id","dealerId")
);
CREATE TABLE IF NOT EXISTS "DealerProductSupplier" (
 "productId" TEXT NOT NULL REFERENCES "WholesaleDealerProduct"("id"),
 "supplierId" TEXT NOT NULL REFERENCES "DealerSupplier"("id"),
 "supplierProductCode" TEXT NOT NULL DEFAULT '',
 "unitCost" INTEGER NOT NULL DEFAULT 0 CHECK ("unitCost" BETWEEN 0 AND 10000000),
 "isPrimary" BOOLEAN NOT NULL DEFAULT FALSE,
 "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY ("productId","supplierId")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DealerProductSupplier_primary" ON "DealerProductSupplier" ("productId") WHERE "isPrimary";
ALTER TABLE "DealerErpPurchase" ADD COLUMN IF NOT EXISTS "supplierId" TEXT REFERENCES "DealerSupplier"("id");
ALTER TABLE "DealerErpPurchase" ADD COLUMN IF NOT EXISTS "manufacturerName" TEXT;
ALTER TABLE "DealerErpPurchase" ADD COLUMN IF NOT EXISTS "fromOrders" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "DealerErpPurchase" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMPTZ;
ALTER TABLE "DealerErpPurchase" ADD COLUMN IF NOT EXISTS "exportedAt" TIMESTAMPTZ;
ALTER TABLE "DealerErpPurchase" ADD COLUMN IF NOT EXISTS "exporterKey" TEXT NOT NULL DEFAULT 'generic';
CREATE TABLE IF NOT EXISTS "DealerErpPurchaseSource" (
 "purchaseLineId" TEXT NOT NULL REFERENCES "DealerErpPurchaseLine"("id"),
 "orderLineId" TEXT NOT NULL REFERENCES "WholesaleOrderLine"("id"),
 "quantity" INTEGER NOT NULL CHECK ("quantity">0),
 "snapshot" JSONB NOT NULL,
 PRIMARY KEY ("purchaseLineId","orderLineId")
);
CREATE INDEX IF NOT EXISTS "DealerErpPurchaseSource_order" ON "DealerErpPurchaseSource" ("orderLineId");
CREATE INDEX IF NOT EXISTS "DealerErpPurchase_supplier" ON "DealerErpPurchase" ("dealerId","supplierId","submittedAt");
-- Legacy accepted orders also need their original dealer cutoff captured.
INSERT INTO "WholesaleOrderAmendment" ("orderId", "cutoffMinutes", "cutoffAt")
SELECT o.id, p."cutoffMinutes",
  (date_trunc('day', o."orderedAt" AT TIME ZONE 'Asia/Tokyo')
   + p."cutoffMinutes" * INTERVAL '1 minute'
   + CASE WHEN EXTRACT(HOUR FROM o."orderedAt" AT TIME ZONE 'Asia/Tokyo') * 60
     + EXTRACT(MINUTE FROM o."orderedAt" AT TIME ZONE 'Asia/Tokyo') >= p."cutoffMinutes"
     THEN INTERVAL '1 day' ELSE INTERVAL '0 day' END) AT TIME ZONE 'Asia/Tokyo'
FROM "WholesaleOrder" o
JOIN "WholesaleOrderCutoffPolicy" p ON p."dealerId" = o."dealerId"
ON CONFLICT ("orderId") DO NOTHING;
