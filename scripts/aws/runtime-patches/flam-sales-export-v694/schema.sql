CREATE TABLE IF NOT EXISTS "DealerFlamCustomer" (
 "dealerId" TEXT NOT NULL REFERENCES "WholesaleDealer"(id),
 "organizationId" TEXT NOT NULL REFERENCES "Organization"(id),
 code TEXT NOT NULL,
 "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY ("dealerId","organizationId")
);
