CREATE TABLE IF NOT EXISTS "OrganizationLineConnection" (
  "organizationId" TEXT NOT NULL,
  "messagingChannelId" TEXT NOT NULL,
  "lineLoginChannelId" TEXT NOT NULL,
  "liffId" TEXT NOT NULL,
  "encryptedChannelSecret" TEXT NOT NULL,
  "encryptedAccessToken" TEXT NOT NULL,
  "webhookKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "botUserId" TEXT,
  "basicId" TEXT,
  "displayName" TEXT,
  "lastVerifiedAt" TIMESTAMP(3),
  "lastWebhookAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationLineConnection_pkey" PRIMARY KEY ("organizationId"),
  CONSTRAINT "OrganizationLineConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationLineConnection_webhookKey_key" ON "OrganizationLineConnection"("webhookKey");
CREATE INDEX IF NOT EXISTS "OrganizationLineConnection_status_idx" ON "OrganizationLineConnection"("status");

CREATE TABLE IF NOT EXISTS "CustomerLineIdentity" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT,
  "lineUserId" TEXT NOT NULL,
  "displayName" TEXT,
  "pictureUrl" TEXT,
  "followed" BOOLEAN NOT NULL DEFAULT TRUE,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerLineIdentity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomerLineIdentity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE,
  CONSTRAINT "CustomerLineIdentity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerLineIdentity_organizationId_lineUserId_key" ON "CustomerLineIdentity"("organizationId", "lineUserId");
CREATE INDEX IF NOT EXISTS "CustomerLineIdentity_customerId_idx" ON "CustomerLineIdentity"("customerId");

CREATE TABLE IF NOT EXISTS "LineWebhookEvent" (
  "webhookEventId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "lineUserId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'received',
  "error" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "LineWebhookEvent_pkey" PRIMARY KEY ("webhookEventId"),
  CONSTRAINT "LineWebhookEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "LineWebhookEvent_organizationId_receivedAt_idx" ON "LineWebhookEvent"("organizationId", "receivedAt" DESC);

CREATE TABLE IF NOT EXISTS "LineBookingRequest" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "lineUserId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "appointmentId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'processing',
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LineBookingRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LineBookingRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE,
  CONSTRAINT "LineBookingRequest_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "LineBookingRequest_organizationId_lineUserId_idempotencyKey_key" ON "LineBookingRequest"("organizationId", "lineUserId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "LineBookingRequest_organizationId_createdAt_idx" ON "LineBookingRequest"("organizationId", "createdAt" DESC);
