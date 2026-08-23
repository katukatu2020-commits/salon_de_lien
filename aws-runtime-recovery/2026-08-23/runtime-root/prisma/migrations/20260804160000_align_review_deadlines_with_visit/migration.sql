-- Purchased-product surveys are answerable for 30 days from the visit.
-- Existing awarded point lots keep their original expiry to avoid shortening a
-- benefit that was already granted. New review rewards expire after 45 days.
UPDATE "ProductReviewRequest" AS request
SET
    "expiresAt" = request."requestedAt" + INTERVAL '30 days',
    "status" = CASE
        WHEN request."requestedAt" + INTERVAL '30 days' < CURRENT_TIMESTAMP
            THEN 'expired'
        ELSE request."status"
    END,
    "updatedAt" = CURRENT_TIMESTAMP
FROM "ProductProposal" AS proposal
WHERE request."productProposalId" = proposal."id"
  AND request."status" = 'active'
  AND request."answeredAt" IS NULL
  AND (proposal."purchased" = true OR proposal."status" = 'purchased');

UPDATE "PointRule"
SET "validDays" = 45, "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" IN ('product_review_submitted', 'product_review_used_submitted');
