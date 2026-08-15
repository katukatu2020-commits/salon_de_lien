-- Reconcile tables that were introduced directly in the AWS runtime before
-- source-controlled migrations became authoritative. Every statement is
-- idempotent so this migration works for both the existing AWS database and a
-- clean database built from the full migration history.

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
CREATE INDEX IF NOT EXISTS "OrganizationBilling_status_idx" ON "OrganizationBilling"("subscriptionStatus");

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
CREATE INDEX IF NOT EXISTS "StripeWebhookEvent_status_idx" ON "StripeWebhookEvent"("status", "updatedAt");

CREATE TABLE IF NOT EXISTS "StoreRegistrationVerification" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "consumedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "StoreRegistrationVerification_email_idx" ON "StoreRegistrationVerification"("email", "createdAt");
CREATE INDEX IF NOT EXISTS "StoreRegistrationVerification_expiry_idx" ON "StoreRegistrationVerification"("expiresAt", "consumedAt");

CREATE TABLE IF NOT EXISTS "OrganizationStoreProfile" (
  "organizationId" TEXT PRIMARY KEY,
  "ownerName" TEXT,
  "phone" TEXT,
  "postalCode" TEXT,
  "prefecture" TEXT,
  "city" TEXT,
  "addressLine1" TEXT,
  "addressLine2" TEXT,
  "businessHours" TEXT,
  "closedDays" TEXT,
  "websiteUrl" TEXT,
  "businessOpenMinutes" INTEGER NOT NULL DEFAULT 600,
  "businessCloseMinutes" INTEGER NOT NULL DEFAULT 1140,
  "closedWeekdays" TEXT NOT NULL DEFAULT '1',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "OrganizationGmailConnection" (
  "organizationId" TEXT PRIMARY KEY,
  "sourceEmail" TEXT NOT NULL,
  "connectedEmail" TEXT,
  "encryptedRefreshToken" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "connectedAt" TIMESTAMPTZ,
  "lastSyncAt" TIMESTAMPTZ,
  "lastError" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "GmailIngestMessage" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "gmailMessageId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "appointmentId" TEXT,
  "errorMessage" TEXT,
  "processedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("organizationId", "gmailMessageId")
);
CREATE INDEX IF NOT EXISTS "GmailIngestMessage_org_processed_idx" ON "GmailIngestMessage"("organizationId", "processedAt");

CREATE TABLE IF NOT EXISTS "OrganizationInboundEmail" (
  "organizationId" TEXT PRIMARY KEY,
  "localPart" TEXT NOT NULL UNIQUE,
  "address" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'active',
  "lastReceivedAt" TIMESTAMPTZ,
  "lastImportedAt" TIMESTAMPTZ,
  "lastError" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "InboundEmailMessage" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "sesMessageId" TEXT NOT NULL UNIQUE,
  "internetMessageId" TEXT,
  "provider" TEXT,
  "bookingReference" TEXT,
  "status" TEXT NOT NULL,
  "appointmentId" TEXT,
  "s3Bucket" TEXT,
  "s3ObjectKey" TEXT,
  "errorMessage" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 1,
  "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "processedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "InboundEmailMessage_org_internet_id_key" ON "InboundEmailMessage"("organizationId", "internetMessageId") WHERE "internetMessageId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "InboundEmailMessage_org_booking_idx" ON "InboundEmailMessage"("organizationId", "bookingReference");
CREATE INDEX IF NOT EXISTS "InboundEmailMessage_org_received_idx" ON "InboundEmailMessage"("organizationId", "receivedAt" DESC);

CREATE TABLE IF NOT EXISTS "SalonMenu" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "durationMinutes" INTEGER NOT NULL,
  "priceYen" INTEGER NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "sourceKey" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("organizationId", "name")
);
CREATE INDEX IF NOT EXISTS "SalonMenu_org_active_idx" ON "SalonMenu"("organizationId", "active", "sortOrder");

CREATE TABLE IF NOT EXISTS "StaffProfileSetting" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "introduction" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("organizationId", "userId")
);

CREATE TABLE IF NOT EXISTS "StaffNotificationState" (
  "userId" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "appointmentsReadAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CustomerRealName" (
  "customerId" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "realName" TEXT NOT NULL,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AutomatedCouponRule" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "createdByStaffId" TEXT,
  "name" TEXT NOT NULL,
  "triggerType" TEXT NOT NULL,
  "offsetDays" INTEGER NOT NULL DEFAULT 0,
  "stylistName" TEXT,
  "phoneLastDigit" TEXT,
  "couponTitle" TEXT NOT NULL,
  "discountRate" INTEGER NOT NULL,
  "targetMenu" TEXT NOT NULL,
  "validDays" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "AutomatedCouponRule_org_active_idx" ON "AutomatedCouponRule"("organizationId", "active");

CREATE TABLE IF NOT EXISTS "AutomatedCouponGrant" (
  "id" TEXT PRIMARY KEY,
  "ruleId" TEXT NOT NULL REFERENCES "AutomatedCouponRule"("id") ON DELETE CASCADE,
  "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,
  "triggerKey" TEXT NOT NULL,
  "couponIssueId" TEXT REFERENCES "CouponIssue"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  "broadcastId" TEXT REFERENCES "CustomerBroadcast"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  "grantedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("ruleId", "customerId", "triggerKey")
);
