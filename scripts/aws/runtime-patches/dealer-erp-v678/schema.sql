CREATE TABLE IF NOT EXISTS "DealerErpWarehouse" (
  "id" TEXT PRIMARY KEY, "dealerId" TEXT NOT NULL REFERENCES "WholesaleDealer"("id"),
  "branchId" TEXT REFERENCES "DealerSalesBranch"("id"), "name" TEXT NOT NULL,
  UNIQUE ("dealerId","name")
);
CREATE TABLE IF NOT EXISTS "DealerErpLocation" (
  "id" TEXT PRIMARY KEY, "dealerId" TEXT NOT NULL REFERENCES "WholesaleDealer"("id"),
  "warehouseId" TEXT NOT NULL REFERENCES "DealerErpWarehouse"("id"), "name" TEXT NOT NULL,
  UNIQUE ("warehouseId","name")
);
CREATE TABLE IF NOT EXISTS "DealerErpStock" (
  "id" TEXT PRIMARY KEY, "dealerId" TEXT NOT NULL REFERENCES "WholesaleDealer"("id"),
  "locationId" TEXT NOT NULL REFERENCES "DealerErpLocation"("id"),
  "productId" TEXT NOT NULL REFERENCES "WholesaleDealerProduct"("id"),
  "onHand" INTEGER NOT NULL DEFAULT 0, "reserved" INTEGER NOT NULL DEFAULT 0,
  "minimum" INTEGER NOT NULL DEFAULT 0 CHECK ("minimum">=0), "version" INTEGER NOT NULL DEFAULT 0,
  UNIQUE ("locationId","productId"), CHECK ("onHand">=0 AND "reserved">=0 AND "onHand">="reserved")
);
CREATE TABLE IF NOT EXISTS "DealerErpStockEvent" (
  "id" TEXT PRIMARY KEY, "dealerId" TEXT NOT NULL REFERENCES "WholesaleDealer"("id"),
  "stockId" TEXT NOT NULL REFERENCES "DealerErpStock"("id"), "kind" TEXT NOT NULL,
  "delta" INTEGER NOT NULL, "reservedDelta" INTEGER NOT NULL, "onHand" INTEGER NOT NULL,
  "reserved" INTEGER NOT NULL, "referenceId" TEXT, "reason" TEXT NOT NULL,
  "actorId" TEXT NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "DealerErpStockEvent_dealer_time" ON "DealerErpStockEvent" ("dealerId","createdAt" DESC);
CREATE TABLE IF NOT EXISTS "DealerErpOrder" (
  "orderId" TEXT PRIMARY KEY REFERENCES "WholesaleOrder"("id"),
  "dealerId" TEXT NOT NULL REFERENCES "WholesaleDealer"("id"), "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "DealerErpOrderLine" (
  "lineId" TEXT PRIMARY KEY REFERENCES "WholesaleOrderLine"("id"),
  "orderId" TEXT NOT NULL REFERENCES "DealerErpOrder"("orderId"),
  "cancelled" INTEGER NOT NULL DEFAULT 0 CHECK ("cancelled">=0)
);
CREATE TABLE IF NOT EXISTS "DealerErpAllocation" (
  "id" TEXT PRIMARY KEY, "lineId" TEXT NOT NULL REFERENCES "DealerErpOrderLine"("lineId"),
  "stockId" TEXT NOT NULL REFERENCES "DealerErpStock"("id"), "quantity" INTEGER NOT NULL CHECK ("quantity">=0),
  UNIQUE ("lineId","stockId")
);
CREATE TABLE IF NOT EXISTS "DealerErpShipment" (
  "id" TEXT PRIMARY KEY, "dealerId" TEXT NOT NULL REFERENCES "WholesaleDealer"("id"),
  "orderId" TEXT NOT NULL REFERENCES "DealerErpOrder"("orderId"), "documentNo" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'SHIPPED' CHECK ("status" IN ('SHIPPED','DELIVERED','REVERSED')),
  "shippedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "deliveredAt" TIMESTAMPTZ,
  "actorId" TEXT NOT NULL, "reason" TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS "DealerErpShipmentLine" (
  "id" TEXT PRIMARY KEY, "shipmentId" TEXT NOT NULL REFERENCES "DealerErpShipment"("id"),
  "lineId" TEXT NOT NULL REFERENCES "DealerErpOrderLine"("lineId"),
  "stockId" TEXT NOT NULL REFERENCES "DealerErpStock"("id"), "quantity" INTEGER NOT NULL CHECK ("quantity">0),
  "returned" INTEGER NOT NULL DEFAULT 0 CHECK ("returned">=0 AND "returned"<="quantity"),
  "productName" TEXT NOT NULL, "productCode" TEXT NOT NULL, "category" TEXT NOT NULL,
  "unitPrice" INTEGER NOT NULL CHECK ("unitPrice">=0), "listPrice" INTEGER NOT NULL CHECK ("listPrice">="unitPrice"),
  "taxRate" INTEGER NOT NULL CHECK ("taxRate" BETWEEN 0 AND 100)
);
CREATE TABLE IF NOT EXISTS "DealerErpReturn" (
  "id" TEXT PRIMARY KEY, "shipmentLineId" TEXT NOT NULL REFERENCES "DealerErpShipmentLine"("id"),
  "quantity" INTEGER NOT NULL CHECK ("quantity">0), "restock" BOOLEAN NOT NULL,
  "reason" TEXT NOT NULL, "actorId" TEXT NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "DealerErpInvoice" (
  "id" TEXT PRIMARY KEY, "dealerId" TEXT NOT NULL REFERENCES "WholesaleDealer"("id"),
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id"), "documentNo" TEXT NOT NULL UNIQUE,
  "closingDate" DATE NOT NULL, "dueDate" DATE NOT NULL,
  "listYen" BIGINT NOT NULL, "discountYen" BIGINT NOT NULL, "subtotalYen" BIGINT NOT NULL,
  "taxYen" BIGINT NOT NULL, "totalYen" BIGINT NOT NULL,
  "snapshot" JSONB NOT NULL, "voided" BOOLEAN NOT NULL DEFAULT FALSE,
  "voidReason" TEXT, "actorId" TEXT NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "DealerErpCharge" (
  "id" TEXT PRIMARY KEY, "dealerId" TEXT NOT NULL REFERENCES "WholesaleDealer"("id"),
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id"),
  "orderId" TEXT NOT NULL REFERENCES "WholesaleOrder"("id"),
  "shipmentLineId" TEXT REFERENCES "DealerErpShipmentLine"("id"), "sourceId" TEXT NOT NULL UNIQUE,
  "productId" TEXT, "productName" TEXT NOT NULL, "productCode" TEXT NOT NULL, "category" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL CHECK ("quantity"<>0), "unitPrice" INTEGER NOT NULL, "listPrice" INTEGER NOT NULL,
  "taxRate" INTEGER NOT NULL, "salesMemberId" TEXT, "salesBranchId" TEXT, "closingDay" INTEGER,
  "invoiceId" TEXT REFERENCES "DealerErpInvoice"("id"), "occurredAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "DealerErpCharge_unbilled" ON "DealerErpCharge" ("dealerId","organizationId","occurredAt") WHERE "invoiceId" IS NULL;
CREATE TABLE IF NOT EXISTS "DealerErpPayment" (
  "id" TEXT PRIMARY KEY, "dealerId" TEXT NOT NULL REFERENCES "WholesaleDealer"("id"),
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id"), "reference" TEXT NOT NULL,
  "paidDate" DATE NOT NULL, "amountYen" BIGINT NOT NULL CHECK ("amountYen"<>0),
  "note" TEXT NOT NULL, "voided" BOOLEAN NOT NULL DEFAULT FALSE, "actorId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE ("dealerId","reference")
);
CREATE TABLE IF NOT EXISTS "DealerErpSettlement" (
  "id" TEXT PRIMARY KEY, "paymentId" TEXT NOT NULL REFERENCES "DealerErpPayment"("id"),
  "invoiceId" TEXT NOT NULL REFERENCES "DealerErpInvoice"("id"), "amountYen" BIGINT NOT NULL CHECK ("amountYen"<>0),
  "reversesId" TEXT UNIQUE REFERENCES "DealerErpSettlement"("id"), "reason" TEXT NOT NULL,
  "actorId" TEXT NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "DealerErpPurchase" (
  "id" TEXT PRIMARY KEY, "dealerId" TEXT NOT NULL REFERENCES "WholesaleDealer"("id"),
  "supplier" TEXT NOT NULL, "documentNo" TEXT NOT NULL UNIQUE, "expectedDate" DATE,
  "status" TEXT NOT NULL DEFAULT 'OPEN' CHECK ("status" IN ('OPEN','CLOSED','CANCELLED')),
  "actorId" TEXT NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "DealerErpPurchaseLine" (
  "id" TEXT PRIMARY KEY, "purchaseId" TEXT NOT NULL REFERENCES "DealerErpPurchase"("id"),
  "productId" TEXT NOT NULL REFERENCES "WholesaleDealerProduct"("id"),
  "quantity" INTEGER NOT NULL CHECK ("quantity">0), "received" INTEGER NOT NULL DEFAULT 0,
  "unitCost" INTEGER NOT NULL CHECK ("unitCost">=0), CHECK ("received" BETWEEN 0 AND "quantity")
);
CREATE TABLE IF NOT EXISTS "DealerErpSalonTerms" (
  "contractId" TEXT PRIMARY KEY REFERENCES "WholesaleDealerContract"("id"),
  "paymentDay" INTEGER NOT NULL DEFAULT 31 CHECK ("paymentDay" BETWEEN 1 AND 31),
  "paymentMonths" INTEGER NOT NULL DEFAULT 1 CHECK ("paymentMonths" BETWEEN 0 AND 6), "note" TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS "DealerErpBranchGoal" (
  "branchId" TEXT NOT NULL REFERENCES "DealerSalesBranch"("id"), "month" TEXT NOT NULL,
  "salesTargetYen" BIGINT NOT NULL CHECK ("salesTargetYen">=0), "acquisitionTarget" INTEGER NOT NULL CHECK ("acquisitionTarget">=0),
  PRIMARY KEY ("branchId","month")
);
CREATE TABLE IF NOT EXISTS "DealerErpActivity" (
  "id" TEXT PRIMARY KEY, "dealerId" TEXT NOT NULL REFERENCES "WholesaleDealer"("id"),
  "memberId" TEXT NOT NULL REFERENCES "DealerSalesMember"("id"), "branchId" TEXT REFERENCES "DealerSalesBranch"("id"),
  "organizationId" TEXT REFERENCES "Organization"("id"), "orderId" TEXT REFERENCES "WholesaleOrder"("id"),
  "kind" TEXT NOT NULL CHECK ("kind" IN ('VISIT','DELIVERY','SUPPORT','INTERNAL')),
  "title" TEXT NOT NULL, "startsAt" TIMESTAMPTZ NOT NULL, "endsAt" TIMESTAMPTZ NOT NULL,
  "visibility" TEXT NOT NULL CHECK ("visibility" IN ('PRIVATE','BRANCH','DEALER')),
  "status" TEXT NOT NULL DEFAULT 'PLANNED' CHECK ("status" IN ('PLANNED','DONE','CANCELLED')),
  "note" TEXT NOT NULL, "result" TEXT NOT NULL DEFAULT '', "version" INTEGER NOT NULL DEFAULT 1,
  CHECK ("endsAt">"startsAt")
);
CREATE INDEX IF NOT EXISTS "DealerErpActivity_calendar" ON "DealerErpActivity" ("dealerId","startsAt");
CREATE TABLE IF NOT EXISTS "DealerErpThread" (
  "id" TEXT PRIMARY KEY, "dealerId" TEXT NOT NULL REFERENCES "WholesaleDealer"("id"),
  "organizationId" TEXT REFERENCES "Organization"("id"), "orderId" TEXT REFERENCES "WholesaleOrder"("id"),
  "memberIds" TEXT[] NOT NULL, "subject" TEXT NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "DealerErpMessage" (
  "id" BIGSERIAL PRIMARY KEY, "threadId" TEXT NOT NULL REFERENCES "DealerErpThread"("id"),
  "senderId" TEXT NOT NULL, "senderName" TEXT NOT NULL, "senderType" TEXT NOT NULL,
  "body" TEXT NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "DealerErpMessage_thread" ON "DealerErpMessage" ("threadId","id");
CREATE TABLE IF NOT EXISTS "DealerErpRead" (
  "threadId" TEXT NOT NULL REFERENCES "DealerErpThread"("id"), "viewerId" TEXT NOT NULL,
  "messageId" BIGINT NOT NULL, PRIMARY KEY ("threadId","viewerId")
);
CREATE TABLE IF NOT EXISTS "DealerErpCommand" (
  "dealerId" TEXT NOT NULL REFERENCES "WholesaleDealer"("id"), "key" TEXT NOT NULL,
  "actorId" TEXT NOT NULL, "action" TEXT NOT NULL, "hash" TEXT NOT NULL, "result" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY ("dealerId","key")
);
CREATE INDEX IF NOT EXISTS "DealerErpCommand_audit" ON "DealerErpCommand" ("dealerId","createdAt" DESC);
CREATE INDEX IF NOT EXISTS "DealerErpStock_dealer" ON "DealerErpStock" ("dealerId");
CREATE INDEX IF NOT EXISTS "DealerErpOrderLine_order" ON "DealerErpOrderLine" ("orderId");
CREATE INDEX IF NOT EXISTS "DealerErpShipment_order" ON "DealerErpShipment" ("orderId","shippedAt");
CREATE INDEX IF NOT EXISTS "DealerErpShipmentLine_line" ON "DealerErpShipmentLine" ("lineId");
CREATE INDEX IF NOT EXISTS "DealerErpShipmentLine_shipment" ON "DealerErpShipmentLine" ("shipmentId");
CREATE INDEX IF NOT EXISTS "DealerErpCharge_reporting" ON "DealerErpCharge" ("dealerId","occurredAt","salesMemberId");
CREATE INDEX IF NOT EXISTS "DealerErpInvoice_dealer" ON "DealerErpInvoice" ("dealerId","organizationId","createdAt" DESC);
CREATE INDEX IF NOT EXISTS "DealerErpPayment_dealer" ON "DealerErpPayment" ("dealerId","paidDate" DESC);
CREATE INDEX IF NOT EXISTS "DealerErpSettlement_invoice" ON "DealerErpSettlement" ("invoiceId");
CREATE INDEX IF NOT EXISTS "DealerErpSettlement_payment" ON "DealerErpSettlement" ("paymentId");
CREATE INDEX IF NOT EXISTS "DealerErpThread_dealer" ON "DealerErpThread" ("dealerId","organizationId");
CREATE INDEX IF NOT EXISTS "DealerErpPurchase_dealer" ON "DealerErpPurchase" ("dealerId","createdAt" DESC);
CREATE INDEX IF NOT EXISTS "DealerErpPurchaseLine_purchase" ON "DealerErpPurchaseLine" ("purchaseId");
