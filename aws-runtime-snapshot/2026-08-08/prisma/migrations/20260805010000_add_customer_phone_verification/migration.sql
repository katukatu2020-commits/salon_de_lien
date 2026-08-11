CREATE TABLE "CustomerPhoneIdentity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerPhoneIdentity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SmsVerificationChallenge" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "registrationTokenHash" TEXT,
    "requestIpHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsVerificationChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerPhoneIdentity_customerId_key" ON "CustomerPhoneIdentity"("customerId");
CREATE UNIQUE INDEX "CustomerPhoneIdentity_organizationId_phoneE164_key" ON "CustomerPhoneIdentity"("organizationId", "phoneE164");
CREATE INDEX "CustomerPhoneIdentity_phoneE164_idx" ON "CustomerPhoneIdentity"("phoneE164");
CREATE INDEX "SmsVerificationChallenge_organizationId_phoneE164_createdAt_idx" ON "SmsVerificationChallenge"("organizationId", "phoneE164", "createdAt");
CREATE INDEX "SmsVerificationChallenge_requestIpHash_createdAt_idx" ON "SmsVerificationChallenge"("requestIpHash", "createdAt");
CREATE INDEX "SmsVerificationChallenge_expiresAt_consumedAt_idx" ON "SmsVerificationChallenge"("expiresAt", "consumedAt");

ALTER TABLE "CustomerPhoneIdentity"
ADD CONSTRAINT "CustomerPhoneIdentity_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
