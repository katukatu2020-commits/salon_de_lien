CREATE TABLE IF NOT EXISTS "DealerSalesBranch" (
  "id" TEXT PRIMARY KEY, "dealerId" TEXT NOT NULL REFERENCES "WholesaleDealer"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE ("dealerId", "name")
);
CREATE TABLE IF NOT EXISTS "DealerSalesMember" (
  "id" TEXT PRIMARY KEY, "dealerId" TEXT NOT NULL REFERENCES "WholesaleDealer"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL, "loginId" TEXT, "passwordHash" TEXT,
  "role" TEXT NOT NULL CHECK ("role" IN ('ADMIN','STAFF')),
  "branchId" TEXT REFERENCES "DealerSalesBranch"("id"), "legacyOwner" BOOLEAN NOT NULL DEFAULT FALSE,
  "active" BOOLEAN NOT NULL DEFAULT TRUE, "mustChangePassword" BOOLEAN NOT NULL DEFAULT TRUE,
  "authVersion" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "DealerSalesMember_login" ON "DealerSalesMember" (LOWER("loginId"));
CREATE UNIQUE INDEX IF NOT EXISTS "DealerSalesMember_owner" ON "DealerSalesMember" ("dealerId") WHERE "legacyOwner";
CREATE INDEX IF NOT EXISTS "DealerSalesMember_dealer" ON "DealerSalesMember" ("dealerId");
CREATE TABLE IF NOT EXISTS "DealerSalesGoal" (
  "memberId" TEXT NOT NULL REFERENCES "DealerSalesMember"("id") ON DELETE CASCADE,
  "monthKey" TEXT NOT NULL CHECK ("monthKey" ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
  "salesTargetYen" BIGINT NOT NULL CHECK ("salesTargetYen" BETWEEN 0 AND 1000000000000),
  "acquisitionTarget" INTEGER NOT NULL CHECK ("acquisitionTarget" BETWEEN 0 AND 999999),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY ("memberId","monthKey")
);
ALTER TABLE "WholesaleDealerContract" ADD COLUMN IF NOT EXISTS "salesMemberId" TEXT REFERENCES "DealerSalesMember"("id");
ALTER TABLE "WholesaleDealerContract" ADD COLUMN IF NOT EXISTS "salesBranchId" TEXT REFERENCES "DealerSalesBranch"("id");
ALTER TABLE "WholesaleDealerContract" ADD COLUMN IF NOT EXISTS "billingClosingDay" INTEGER NOT NULL DEFAULT 31 CHECK ("billingClosingDay" BETWEEN 1 AND 31);
ALTER TABLE "WholesaleDealerContract" ADD COLUMN IF NOT EXISTS "acquisitionMemberId" TEXT REFERENCES "DealerSalesMember"("id");
ALTER TABLE "WholesaleDealerContract" ADD COLUMN IF NOT EXISTS "acquisitionBranchId" TEXT REFERENCES "DealerSalesBranch"("id");
ALTER TABLE "WholesaleOrder" ADD COLUMN IF NOT EXISTS "salesMemberId" TEXT REFERENCES "DealerSalesMember"("id");
ALTER TABLE "WholesaleOrder" ADD COLUMN IF NOT EXISTS "salesBranchId" TEXT REFERENCES "DealerSalesBranch"("id");
ALTER TABLE "WholesaleOrder" ADD COLUMN IF NOT EXISTS "billingClosingDay" INTEGER NOT NULL DEFAULT 31 CHECK ("billingClosingDay" BETWEEN 1 AND 31);
CREATE INDEX IF NOT EXISTS "WholesaleOrder_sales_month" ON "WholesaleOrder" ("dealerId","deliveredAt","salesMemberId");
CREATE INDEX IF NOT EXISTS "WholesaleOrder_forecast_month" ON "WholesaleOrder" ("dealerId","orderedAt","salesMemberId");
CREATE TABLE IF NOT EXISTS "DealerTeamAudit" (
  "id" TEXT PRIMARY KEY, "dealerId" TEXT NOT NULL, "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL, "targetId" TEXT NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE OR REPLACE FUNCTION dealer_sales_order_snapshot_v671() RETURNS trigger AS $$
BEGIN
  SELECT "salesMemberId","salesBranchId","billingClosingDay" INTO NEW."salesMemberId",NEW."salesBranchId",NEW."billingClosingDay"
    FROM "WholesaleDealerContract" WHERE "dealerId"=NEW."dealerId" AND "organizationId"=NEW."organizationId";
  NEW."billingClosingDay" := COALESCE(NEW."billingClosingDay",31);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS dealer_sales_order_snapshot_v671 ON "WholesaleOrder";
CREATE TRIGGER dealer_sales_order_snapshot_v671 BEFORE INSERT ON "WholesaleOrder" FOR EACH ROW EXECUTE FUNCTION dealer_sales_order_snapshot_v671();
CREATE OR REPLACE FUNCTION dealer_team_login_namespace_v671() RETURNS trigger AS $$
BEGIN
  IF NEW."loginId" IS NULL THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('dealer-login:' || LOWER(NEW."loginId"),0));
  IF TG_TABLE_NAME='WholesaleDealer' THEN
    IF EXISTS (SELECT 1 FROM "DealerSalesMember" WHERE LOWER("loginId")=LOWER(NEW."loginId")) THEN
      RAISE EXCEPTION 'Login ID already exists' USING ERRCODE='23505';
    END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM "WholesaleDealer" WHERE LOWER("loginId")=LOWER(NEW."loginId")) THEN
      RAISE EXCEPTION 'Login ID already exists' USING ERRCODE='23505';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS dealer_team_login_namespace_v671 ON "WholesaleDealer";
CREATE TRIGGER dealer_team_login_namespace_v671 BEFORE INSERT OR UPDATE OF "loginId" ON "WholesaleDealer" FOR EACH ROW EXECUTE FUNCTION dealer_team_login_namespace_v671();
DROP TRIGGER IF EXISTS dealer_team_login_namespace_v671 ON "DealerSalesMember";
CREATE TRIGGER dealer_team_login_namespace_v671 BEFORE INSERT OR UPDATE OF "loginId" ON "DealerSalesMember" FOR EACH ROW EXECUTE FUNCTION dealer_team_login_namespace_v671();
