ALTER TABLE "Referral"
ADD COLUMN "referrerDiscountIssuedAt" TIMESTAMP(3),
ADD COLUMN "referrerDiscountUsedAt" TIMESTAMP(3),
ADD COLUMN "referredDiscountUsedAt" TIMESTAMP(3);

ALTER TABLE "PointRule" ALTER COLUMN "validDays" SET DEFAULT 40;

UPDATE "PointRule"
SET "validDays" = 40,
    "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "PointRule"
SET "active" = false,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" IN (
  'referral_first_visit_completed',
  'referral_referred_checkout_completed'
);

UPDATE "PointLot"
SET "expiresAt" = "createdAt" + INTERVAL '40 days',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "expiresAt" <> "createdAt" + INTERVAL '40 days';

UPDATE "PointTransaction" AS point_transaction
SET "expiresAt" = lot."expiresAt"
FROM "PointLot" AS lot
WHERE lot."earnTransactionId" = point_transaction."id"
  AND point_transaction."amount" > 0;

CREATE TEMP TABLE "PointPolicyExpiredLot" ON COMMIT DROP AS
SELECT
  lot."id",
  lot."customerId",
  lot."remainingAmount",
  lot."expiresAt",
  account."id" AS "accountId",
  account."availablePoints",
  SUM(lot."remainingAmount") OVER (
    PARTITION BY lot."customerId"
    ORDER BY lot."expiresAt", lot."createdAt", lot."id"
  ) AS "cumulativeExpired"
FROM "PointLot" AS lot
JOIN "CustomerPointAccount" AS account
  ON account."customerId" = lot."customerId"
WHERE lot."remainingAmount" > 0
  AND lot."expiresAt" < CURRENT_TIMESTAMP;

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
  'point-policy-40-' || expired."id",
  expired."customerId",
  expired."accountId",
  'expire',
  -expired."remainingAmount",
  GREATEST(0, expired."availablePoints" - expired."cumulativeExpired"),
  'point_policy',
  expired."id",
  'ポイント有効期限切れ（40日ルール）',
  expired."expiresAt",
  CURRENT_TIMESTAMP
FROM "PointPolicyExpiredLot" AS expired
ON CONFLICT ("sourceType", "sourceId", "type") DO NOTHING;

UPDATE "CustomerPointAccount" AS account
SET "availablePoints" = GREATEST(0, account."availablePoints" - expired."amount"),
    "lifetimeExpired" = account."lifetimeExpired" + expired."amount",
    "updatedAt" = CURRENT_TIMESTAMP
FROM (
  SELECT "customerId", SUM("remainingAmount")::INTEGER AS "amount"
  FROM "PointPolicyExpiredLot"
  GROUP BY "customerId"
) AS expired
WHERE account."customerId" = expired."customerId";

UPDATE "PointLot" AS lot
SET "remainingAmount" = 0,
    "updatedAt" = CURRENT_TIMESTAMP
FROM "PointPolicyExpiredLot" AS expired
WHERE lot."id" = expired."id";
