UPDATE "Referral"
SET "expiresAt" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "status" IN ('issued', 'registered')
  AND "expiresAt" IS NOT NULL;
