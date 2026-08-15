CREATE TABLE IF NOT EXISTS "BillingPlan" (
  "planKey" TEXT PRIMARY KEY,
  "displayName" TEXT NOT NULL,
  "monthlyAmount" INTEGER NOT NULL CHECK ("monthlyAmount" >= 0),
  "currency" TEXT NOT NULL DEFAULT 'jpy',
  "staffLimit" INTEGER,
  "customerLimit" INTEGER,
  "emailLimit" INTEGER,
  "smsLimit" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO "BillingPlan"
  ("planKey", "displayName", "monthlyAmount", "currency", "staffLimit", "customerLimit", "emailLimit", "smsLimit", "active", "sortOrder")
VALUES
  ('ume', '梅', 4980, 'jpy', 3, 500, 500, 100, TRUE, 10),
  ('take', '竹', 9800, 'jpy', 10, 3000, 5000, 1000, TRUE, 20),
  ('matsu', '松', 19800, 'jpy', NULL, NULL, NULL, 10000, TRUE, 30)
ON CONFLICT ("planKey") DO NOTHING;

CREATE TABLE IF NOT EXISTS "OrganizationBilling" (
  "organizationId" TEXT PRIMARY KEY REFERENCES "Organization"("id") ON DELETE CASCADE,
  "planKey" TEXT NOT NULL REFERENCES "BillingPlan"("planKey"),
  "onboardingStatus" TEXT NOT NULL DEFAULT 'PAYMENT_REQUIRED',
  "subscriptionStatus" TEXT NOT NULL DEFAULT 'none',
  "billingRequiredAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "stripeCustomerId" TEXT UNIQUE,
  "stripeSubscriptionId" TEXT UNIQUE,
  "stripeCheckoutSessionId" TEXT UNIQUE,
  "trialStartedAt" TIMESTAMPTZ,
  "trialEndsAt" TIMESTAMPTZ,
  "trialUsedAt" TIMESTAMPTZ,
  "currentPeriodStart" TIMESTAMPTZ,
  "currentPeriodEnd" TIMESTAMPTZ,
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT FALSE,
  "canceledAt" TIMESTAMPTZ,
  "paymentMethodBrand" TEXT,
  "paymentMethodLast4" TEXT,
  "paymentMethodExpMonth" INTEGER,
  "paymentMethodExpYear" INTEGER,
  "paymentMethodRegisteredAt" TIMESTAMPTZ,
  "trialEndingNoticeAt" TIMESTAMPTZ,
  "lastStripeEventAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "OrganizationBilling_status_idx"
  ON "OrganizationBilling" ("subscriptionStatus");

CREATE TABLE IF NOT EXISTS "StripeWebhookEvent" (
  "stripeEventId" TEXT PRIMARY KEY,
  "eventType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'processing',
  "attemptCount" INTEGER NOT NULL DEFAULT 1,
  "processingStartedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "processedAt" TIMESTAMPTZ,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "StripeWebhookEvent_status_idx"
  ON "StripeWebhookEvent" ("status", "updatedAt");

CREATE TABLE IF NOT EXISTS "StoreRegistrationVerification" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "consumedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "StoreRegistrationVerification_email_idx"
  ON "StoreRegistrationVerification" ("email", "createdAt");

CREATE INDEX IF NOT EXISTS "StoreRegistrationVerification_expiry_idx"
  ON "StoreRegistrationVerification" ("expiresAt", "consumedAt");
