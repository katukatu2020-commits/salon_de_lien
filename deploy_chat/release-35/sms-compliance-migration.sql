ALTER TABLE "Customer"
  ADD COLUMN IF NOT EXISTS "phoneVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "smsTransactionalOptIn" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "smsTransactionalOptInAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "smsTransactionalOptOutAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "smsConsentSource" TEXT;

-- statement-breakpoint
ALTER TABLE "SmsVerificationChallenge"
  ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "smsProvider" TEXT,
  ADD COLUMN IF NOT EXISTS "smsMessageId" TEXT,
  ADD COLUMN IF NOT EXISTS "smsStatus" TEXT;

-- statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerPhoneIdentity_org_phone_compliance_key"
  ON "CustomerPhoneIdentity" ("organizationId", "phoneE164");

-- statement-breakpoint
CREATE TABLE IF NOT EXISTS "SmsSendLog" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "customerId" TEXT REFERENCES "Customer"("id") ON DELETE SET NULL,
  "appointmentId" TEXT REFERENCES "Appointment"("id") ON DELETE SET NULL,
  "challengeId" TEXT,
  "phoneE164" TEXT NOT NULL,
  "smsType" TEXT NOT NULL,
  "smsCategory" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL UNIQUE,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "success" BOOLEAN,
  "status" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'AWS_SNS',
  "awsMessageId" TEXT,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "transactionalOptInAtSend" BOOLEAN,
  "consentSourceAtSend" TEXT,
  "userInitiated" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SmsSendLog_category_check" CHECK ("smsCategory" IN ('OTP', 'RESERVATION'))
);

-- statement-breakpoint
CREATE INDEX IF NOT EXISTS "SmsSendLog_customer_sent_idx"
  ON "SmsSendLog" ("customerId", "requestedAt" DESC);

-- statement-breakpoint
CREATE INDEX IF NOT EXISTS "SmsSendLog_type_sent_idx"
  ON "SmsSendLog" ("smsType", "requestedAt" DESC);

-- statement-breakpoint
CREATE INDEX IF NOT EXISTS "SmsSendLog_appointment_idx"
  ON "SmsSendLog" ("appointmentId", "requestedAt" DESC);

-- statement-breakpoint
CREATE TABLE IF NOT EXISTS "SmsComplianceState" (
  "id" TEXT PRIMARY KEY,
  "initializedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- statement-breakpoint
CREATE TABLE IF NOT EXISTS "SmsAppointmentState" (
  "id" TEXT PRIMARY KEY,
  "appointmentId" TEXT NOT NULL UNIQUE REFERENCES "Appointment"("id") ON DELETE CASCADE,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT,
  "lastObservedUpdatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- statement-breakpoint
CREATE INDEX IF NOT EXISTS "SmsAppointmentState_observed_idx"
  ON "SmsAppointmentState" ("lastObservedUpdatedAt");

-- statement-breakpoint
UPDATE "Customer" AS customer
SET "phoneVerifiedAt" = identity."verifiedAt"
FROM "CustomerPhoneIdentity" AS identity
WHERE identity."customerId" = customer."id"
  AND customer."phoneVerifiedAt" IS DISTINCT FROM identity."verifiedAt";

-- statement-breakpoint
CREATE OR REPLACE FUNCTION lien_sync_customer_phone_verification()
RETURNS trigger AS $$
BEGIN
  UPDATE "Customer"
  SET "phoneVerifiedAt" = NEW."verifiedAt"
  WHERE "id" = NEW."customerId";

  UPDATE "SmsSendLog"
  SET "customerId" = NEW."customerId", "updatedAt" = CURRENT_TIMESTAMP
  WHERE "customerId" IS NULL
    AND "organizationId" = NEW."organizationId"
    AND "phoneE164" = NEW."phoneE164"
    AND "smsCategory" = 'OTP';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'CustomerPhoneIdentity_sync_verified_at'
  ) THEN
    CREATE TRIGGER "CustomerPhoneIdentity_sync_verified_at"
    AFTER INSERT OR UPDATE OF "verifiedAt" ON "CustomerPhoneIdentity"
    FOR EACH ROW EXECUTE FUNCTION lien_sync_customer_phone_verification();
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Customer_sms_transactional_consent_check'
  ) THEN
    ALTER TABLE "Customer" ADD CONSTRAINT "Customer_sms_transactional_consent_check"
      CHECK (
        NOT "smsTransactionalOptIn"
        OR (
          "phoneVerifiedAt" IS NOT NULL
          AND "smsTransactionalOptInAt" IS NOT NULL
          AND "smsTransactionalOptOutAt" IS NULL
          AND "smsConsentSource" IS NOT NULL
        )
      );
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- statement-breakpoint
WITH first_initialization AS (
  INSERT INTO "SmsComplianceState" ("id", "initializedAt", "updatedAt")
  VALUES ('sms-compliance-v1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  ON CONFLICT ("id") DO NOTHING
  RETURNING "initializedAt"
)
INSERT INTO "SmsAppointmentState" (
  "id", "appointmentId", "scheduledAt", "status", "lastObservedUpdatedAt", "createdAt", "updatedAt"
)
SELECT
  'sms-state-' || appointment."id",
  appointment."id",
  appointment."scheduledAt",
  appointment."status",
  appointment."updatedAt",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Appointment" AS appointment
WHERE EXISTS (SELECT 1 FROM first_initialization)
ON CONFLICT ("appointmentId") DO NOTHING;
