CREATE TYPE "AppRole" AS ENUM ('ADMIN', 'STAFF', 'CUSTOMER', 'MANUFACTURER');

CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Organization" ("id", "slug", "name")
VALUES ('org_salon_de_lien', 'salon-de-lien', 'Salon de Lien');

ALTER TABLE "Customer"
ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_salon_de_lien';

ALTER TABLE "Product"
ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_salon_de_lien';

CREATE TABLE "AppUser" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "customerId" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "AppRole" NOT NULL,
    "manufacturerName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerPortalAccess" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomerPortalAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "AppUser_customerId_key" ON "AppUser"("customerId");
CREATE UNIQUE INDEX "AppUser_email_key" ON "AppUser"("email");
CREATE INDEX "AppUser_organizationId_role_idx" ON "AppUser"("organizationId", "role");
CREATE INDEX "AppUser_manufacturerName_idx" ON "AppUser"("manufacturerName");
CREATE UNIQUE INDEX "CustomerPortalAccess_tokenHash_key" ON "CustomerPortalAccess"("tokenHash");
CREATE INDEX "CustomerPortalAccess_customerId_expiresAt_idx" ON "CustomerPortalAccess"("customerId", "expiresAt");
CREATE INDEX "CustomerPortalAccess_expiresAt_revokedAt_idx" ON "CustomerPortalAccess"("expiresAt", "revokedAt");
CREATE INDEX "Customer_organizationId_deletedAt_idx" ON "Customer"("organizationId", "deletedAt");
CREATE INDEX "Product_organizationId_active_idx" ON "Product"("organizationId", "active");

ALTER TABLE "Customer"
ADD CONSTRAINT "Customer_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Product"
ADD CONSTRAINT "Product_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AppUser"
ADD CONSTRAINT "AppUser_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AppUser"
ADD CONSTRAINT "AppUser_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CustomerPortalAccess"
ADD CONSTRAINT "CustomerPortalAccess_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
