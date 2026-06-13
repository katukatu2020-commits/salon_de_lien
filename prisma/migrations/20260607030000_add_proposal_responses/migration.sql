CREATE TABLE "ProposalResponse" (
  "id" TEXT NOT NULL,
  "suggestionId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "intent" TEXT NOT NULL,
  "preferredDate" TIMESTAMP(3),
  "message" TEXT,
  "contactName" TEXT,
  "contactPhone" TEXT,
  "status" TEXT NOT NULL DEFAULT '未対応',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProposalResponse_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProposalResponse_suggestionId_createdAt_idx" ON "ProposalResponse"("suggestionId", "createdAt");
CREATE INDEX "ProposalResponse_customerId_createdAt_idx" ON "ProposalResponse"("customerId", "createdAt");
CREATE INDEX "ProposalResponse_status_idx" ON "ProposalResponse"("status");

ALTER TABLE "ProposalResponse"
  ADD CONSTRAINT "ProposalResponse_suggestionId_fkey"
  FOREIGN KEY ("suggestionId") REFERENCES "StyleSuggestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProposalResponse"
  ADD CONSTRAINT "ProposalResponse_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
