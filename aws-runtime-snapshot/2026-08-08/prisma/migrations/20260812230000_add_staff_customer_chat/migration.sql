CREATE TABLE "ChatThread" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "staffKey" TEXT NOT NULL,
  "staffName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "customerLastReadAt" TIMESTAMP(3),
  "staffLastReadAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatThread_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ChatThread_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE,
  CONSTRAINT "ChatThread_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE
);

CREATE TABLE "ChatMessage" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "senderType" TEXT NOT NULL,
  "senderUserId" TEXT,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ChatMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "ChatThread_customerId_staffKey_key" ON "ChatThread"("customerId", "staffKey");
CREATE INDEX "ChatThread_org_staff_updated_idx" ON "ChatThread"("organizationId", "staffKey", "updatedAt");
CREATE INDEX "ChatMessage_thread_created_idx" ON "ChatMessage"("threadId", "createdAt");
