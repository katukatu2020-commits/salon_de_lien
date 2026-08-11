-- Online reservations receive 100 points after checkout. The unique point
-- transaction constraint keeps retries and duplicate checkout calls idempotent.
INSERT INTO "PointRule" (
    "id",
    "key",
    "label",
    "eventType",
    "points",
    "validDays",
    "active",
    "createdAt",
    "updatedAt"
)
VALUES (
    'point_rule_appointment_checkout',
    'appointment_checkout_completed',
    'オンライン予約・会計完了',
    'appointment_checkout_completed',
    100,
    180,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO UPDATE SET
    "label" = EXCLUDED."label",
    "eventType" = EXCLUDED."eventType",
    "points" = EXCLUDED."points",
    "validDays" = EXCLUDED."validDays",
    "active" = EXCLUDED."active",
    "updatedAt" = CURRENT_TIMESTAMP;

-- A purchased-product survey closes 14 days before its reward points expire.
-- Point validity is 180 days from the request, so the answer window is 166 days.
UPDATE "ProductReviewRequest" AS request
SET
    "expiresAt" = request."requestedAt" + INTERVAL '166 days',
    "updatedAt" = CURRENT_TIMESTAMP
FROM "ProductProposal" AS proposal
WHERE request."productProposalId" = proposal."id"
  AND request."status" = 'active'
  AND (proposal."purchased" = true OR proposal."status" = 'purchased');

-- The previous release held review rewards until a later visit. Convert those
-- pending rewards once into normal point transactions and dated point lots.
CREATE TEMP TABLE "_review_reward_migration" ON COMMIT DROP AS
SELECT
    pending."id",
    pending."customerId",
    pending."sourceType",
    pending."sourceId",
    pending."amount",
    pending."createdAt",
    COALESCE(request."requestedAt" + INTERVAL '180 days', pending."eligibleAfter" + INTERVAL '180 days') AS "pointExpiresAt"
FROM "PendingPointReward" AS pending
LEFT JOIN "ProductReview" AS review
    ON review."id" = pending."sourceId"
LEFT JOIN "ProductReviewRequest" AS request
    ON request."id" = review."reviewRequestId"
WHERE pending."status" = 'pending'
  AND pending."sourceType" = 'product_review';

CREATE TEMP TABLE "_review_reward_awards" ON COMMIT DROP AS
SELECT migration.*
FROM "_review_reward_migration" AS migration
WHERE migration."pointExpiresAt" > CURRENT_TIMESTAMP
  AND NOT EXISTS (
      SELECT 1
      FROM "PointTransaction" AS transaction
      WHERE transaction."sourceType" = migration."sourceType"
        AND transaction."sourceId" = migration."sourceId"
        AND transaction."type" = 'earn'
  );

INSERT INTO "PointTransaction" (
    "id",
    "customerId",
    "accountId",
    "type",
    "amount",
    "balanceAfter",
    "sourceType",
    "sourceId",
    "reason",
    "expiresAt",
    "createdAt"
)
SELECT
    'migrated-review-' || substr(md5(award."id"), 1, 20),
    award."customerId",
    account."id",
    'earn',
    award."amount",
    account."availablePoints" + SUM(award."amount") OVER (
        PARTITION BY award."customerId"
        ORDER BY award."createdAt", award."id"
    ),
    award."sourceType",
    award."sourceId",
    '商品アンケート回答',
    award."pointExpiresAt",
    CURRENT_TIMESTAMP
FROM "_review_reward_awards" AS award
JOIN "CustomerPointAccount" AS account
    ON account."customerId" = award."customerId"
ON CONFLICT ("sourceType", "sourceId", "type") DO NOTHING;

INSERT INTO "PointLot" (
    "id",
    "customerId",
    "earnTransactionId",
    "originalAmount",
    "remainingAmount",
    "expiresAt",
    "createdAt",
    "updatedAt"
)
SELECT
    'migrated-review-lot-' || substr(md5(award."id"), 1, 16),
    award."customerId",
    transaction."id",
    award."amount",
    award."amount",
    award."pointExpiresAt",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "_review_reward_awards" AS award
JOIN "PointTransaction" AS transaction
    ON transaction."sourceType" = award."sourceType"
   AND transaction."sourceId" = award."sourceId"
   AND transaction."type" = 'earn'
WHERE NOT EXISTS (
    SELECT 1
    FROM "PointLot" AS lot
    WHERE lot."earnTransactionId" = transaction."id"
);

UPDATE "CustomerPointAccount" AS account
SET
    "availablePoints" = account."availablePoints" + COALESCE(award_total."points", 0),
    "pendingPoints" = GREATEST(0, account."pendingPoints" - COALESCE(pending_total."points", 0)),
    "lifetimeEarned" = account."lifetimeEarned" + COALESCE(award_total."points", 0),
    "updatedAt" = CURRENT_TIMESTAMP
FROM (
    SELECT "customerId", SUM("amount") AS "points"
    FROM "_review_reward_migration"
    GROUP BY "customerId"
) AS pending_total
LEFT JOIN (
    SELECT "customerId", SUM("amount") AS "points"
    FROM "_review_reward_awards"
    GROUP BY "customerId"
) AS award_total
    ON award_total."customerId" = pending_total."customerId"
WHERE account."customerId" = pending_total."customerId";

UPDATE "PendingPointReward" AS pending
SET
    "status" = CASE
        WHEN migration."pointExpiresAt" > CURRENT_TIMESTAMP THEN 'claimed'
        ELSE 'expired'
    END,
    "claimedAt" = CASE
        WHEN migration."pointExpiresAt" > CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP
        ELSE pending."claimedAt"
    END,
    "claimContextType" = CASE
        WHEN migration."pointExpiresAt" > CURRENT_TIMESTAMP THEN 'migration'
        ELSE pending."claimContextType"
    END,
    "claimContextId" = CASE
        WHEN migration."pointExpiresAt" > CURRENT_TIMESTAMP THEN 'immediate-review-points'
        ELSE pending."claimContextId"
    END,
    "updatedAt" = CURRENT_TIMESTAMP
FROM "_review_reward_migration" AS migration
WHERE pending."id" = migration."id";
