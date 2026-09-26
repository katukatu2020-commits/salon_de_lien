CREATE TABLE IF NOT EXISTS "SalonGroup" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL UNIQUE REFERENCES "AppUser"("id"),
  "homeOrganizationId" TEXT NOT NULL UNIQUE REFERENCES "Organization"("id"),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "SalonGroupStore" (
  "organizationId" TEXT PRIMARY KEY REFERENCES "Organization"("id"),
  "groupId" TEXT NOT NULL REFERENCES "SalonGroup"("id"),
  "createdBy" TEXT NOT NULL REFERENCES "AppUser"("id"),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "SalonGroupStore_group_idx" ON "SalonGroupStore"("groupId");
CREATE TABLE IF NOT EXISTS "SalonGroupAction" (
  "id" TEXT PRIMARY KEY,
  "groupId" TEXT NOT NULL REFERENCES "SalonGroup"("id"),
  "actorId" TEXT NOT NULL REFERENCES "AppUser"("id"),
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id"),
  "action" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("actorId", "requestKey")
);
