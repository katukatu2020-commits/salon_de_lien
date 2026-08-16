ALTER TABLE "AppUser"
ADD COLUMN IF NOT EXISTS "customerPublicCode" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "AppUser_customerPublicCode_key"
ON "AppUser"("customerPublicCode")
WHERE "customerPublicCode" IS NOT NULL;

CREATE SEQUENCE IF NOT EXISTS "CustomerPublicCodeSeq"
AS BIGINT
START WITH 36
INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS "CustomerStoreLink" (
  "id" TEXT NOT NULL,
  "appUserId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerStoreLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomerStoreLink_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CustomerStoreLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CustomerStoreLink_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerStoreLink_customerId_key"
ON "CustomerStoreLink"("customerId");

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerStoreLink_appUserId_organizationId_key"
ON "CustomerStoreLink"("appUserId", "organizationId");

CREATE INDEX IF NOT EXISTS "CustomerStoreLink_organizationId_createdAt_idx"
ON "CustomerStoreLink"("organizationId", "createdAt");
