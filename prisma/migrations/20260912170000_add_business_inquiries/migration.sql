CREATE TABLE IF NOT EXISTS "BusinessInquiry" (
    "id" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "preferredContact" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "operatorNote" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessInquiry_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BusinessInquiry_audience_check" CHECK ("audience" IN ('salon', 'dealer', 'other')),
    CONSTRAINT "BusinessInquiry_status_check" CHECK ("status" IN ('new', 'in_progress', 'closed')),
    CONSTRAINT "BusinessInquiry_preferredContact_check" CHECK ("preferredContact" IN ('email', 'phone', 'either'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "BusinessInquiry_requestKey_key" ON "BusinessInquiry"("requestKey");
CREATE INDEX IF NOT EXISTS "BusinessInquiry_status_createdAt_idx" ON "BusinessInquiry"("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "BusinessInquiry_audience_createdAt_idx" ON "BusinessInquiry"("audience", "createdAt" DESC);
