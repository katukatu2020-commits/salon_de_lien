-- Referral rewards are issued only after the referred customer's first checkout.
-- Distinct source types in PointTransaction keep both awards independently idempotent.
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
VALUES
(
    'point_rule_referral_referrer',
    'referral_first_visit_completed',
    '友達紹介成立（紹介者）',
    'referral_first_visit_completed',
    1000,
    180,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'point_rule_referral_referred',
    'referral_referred_checkout_completed',
    '友達紹介成立（紹介された方）',
    'referral_referred_checkout_completed',
    2000,
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
