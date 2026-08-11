CREATE TABLE "CustomerRegistrationInvite" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "contextJson" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerRegistrationInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerRegistrationInvite_customerId_key"
ON "CustomerRegistrationInvite"("customerId");

CREATE UNIQUE INDEX "CustomerRegistrationInvite_tokenHash_key"
ON "CustomerRegistrationInvite"("tokenHash");

CREATE INDEX "CustomerRegistrationInvite_organizationId_email_createdAt_idx"
ON "CustomerRegistrationInvite"("organizationId", "email", "createdAt");

CREATE INDEX "CustomerRegistrationInvite_expiresAt_usedAt_idx"
ON "CustomerRegistrationInvite"("expiresAt", "usedAt");

ALTER TABLE "CustomerRegistrationInvite"
ADD CONSTRAINT "CustomerRegistrationInvite_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerRegistrationInvite"
ADD CONSTRAINT "CustomerRegistrationInvite_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
