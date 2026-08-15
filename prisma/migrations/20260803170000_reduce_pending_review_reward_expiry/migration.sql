-- Product review rewards can be used on the next visit for 45 days after answering.
UPDATE "PendingPointReward"
SET
  "expiresAt" = "eligibleAfter" + INTERVAL '45 days',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE
  "sourceType" = 'product_review'
  AND "status" = 'pending'
  AND "expiresAt" > "eligibleAfter" + INTERVAL '45 days';
