CREATE TABLE IF NOT EXISTS "CustomerCampaign" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdByStaffId" TEXT,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "imageKey" TEXT,
  "targetMenu" TEXT,
  "discountRate" INTEGER,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'published',
  "audienceGender" TEXT,
  "audienceMinAge" INTEGER,
  "audienceMaxAge" INTEGER,
  "audienceMatchedCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerCampaign_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomerCampaign_dates_check" CHECK ("endsAt" > "startsAt"),
  CONSTRAINT "CustomerCampaign_discount_check" CHECK ("discountRate" IS NULL OR "discountRate" BETWEEN 1 AND 100),
  CONSTRAINT "CustomerCampaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CustomerCampaign_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CustomerCampaignRecipient" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "viewedAt" TIMESTAMP(3),
  CONSTRAINT "CustomerCampaignRecipient_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomerCampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "CustomerCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CustomerCampaignRecipient_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerCampaignRecipient_campaignId_customerId_key" ON "CustomerCampaignRecipient"("campaignId", "customerId");
CREATE INDEX IF NOT EXISTS "CustomerCampaign_organizationId_status_startsAt_endsAt_idx" ON "CustomerCampaign"("organizationId", "status", "startsAt", "endsAt");
CREATE INDEX IF NOT EXISTS "CustomerCampaign_createdByStaffId_createdAt_idx" ON "CustomerCampaign"("createdByStaffId", "createdAt");
CREATE INDEX IF NOT EXISTS "CustomerCampaignRecipient_customerId_deliveredAt_idx" ON "CustomerCampaignRecipient"("customerId", "deliveredAt");
