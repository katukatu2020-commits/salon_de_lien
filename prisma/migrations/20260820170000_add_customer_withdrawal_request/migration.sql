CREATE TABLE "CustomerWithdrawalRequest" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerWithdrawalRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerWithdrawalRequest_tokenHash_key"
ON "CustomerWithdrawalRequest"("tokenHash");

CREATE INDEX "CustomerWithdrawalRequest_appUserId_createdAt_idx"
ON "CustomerWithdrawalRequest"("appUserId", "createdAt");

CREATE INDEX "CustomerWithdrawalRequest_customerId_createdAt_idx"
ON "CustomerWithdrawalRequest"("customerId", "createdAt");

CREATE INDEX "CustomerWithdrawalRequest_expiresAt_usedAt_idx"
ON "CustomerWithdrawalRequest"("expiresAt", "usedAt");

ALTER TABLE "CustomerWithdrawalRequest"
ADD CONSTRAINT "CustomerWithdrawalRequest_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerWithdrawalRequest"
ADD CONSTRAINT "CustomerWithdrawalRequest_appUserId_fkey"
FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
