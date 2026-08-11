-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "manufacturerName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "concernTags" JSONB,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductProposal" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "visitId" TEXT,
    "staffId" TEXT,
    "proposalReason" TEXT,
    "concernTags" JSONB,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "reaction" TEXT,
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductReviewRequest" (
    "id" TEXT NOT NULL,
    "productProposalId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductReviewRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "productProposalId" TEXT NOT NULL,
    "reviewRequestId" TEXT NOT NULL,
    "usedStatus" TEXT NOT NULL,
    "rating" INTEGER,
    "goodPoints" JSONB,
    "badPoints" JSONB,
    "repeatIntent" TEXT,
    "freeComment" TEXT,
    "allowAnonymousShare" BOOLEAN NOT NULL DEFAULT false,
    "allowAnonymousQuote" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consent" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "productReviewId" TEXT,
    "consentType" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_manufacturerName_idx" ON "Product"("manufacturerName");

-- CreateIndex
CREATE INDEX "Product_active_idx" ON "Product"("active");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Product_manufacturerName_name_key" ON "Product"("manufacturerName", "name");

-- CreateIndex
CREATE INDEX "ProductProposal_customerId_createdAt_idx" ON "ProductProposal"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductProposal_productId_createdAt_idx" ON "ProductProposal"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductProposal_visitId_idx" ON "ProductProposal"("visitId");

-- CreateIndex
CREATE INDEX "ProductProposal_status_idx" ON "ProductProposal"("status");

-- CreateIndex
CREATE INDEX "ProductProposal_reaction_idx" ON "ProductProposal"("reaction");

-- CreateIndex
CREATE UNIQUE INDEX "ProductReviewRequest_tokenHash_key" ON "ProductReviewRequest"("tokenHash");

-- CreateIndex
CREATE INDEX "ProductReviewRequest_productProposalId_requestedAt_idx" ON "ProductReviewRequest"("productProposalId", "requestedAt");

-- CreateIndex
CREATE INDEX "ProductReviewRequest_status_expiresAt_idx" ON "ProductReviewRequest"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductReview_reviewRequestId_key" ON "ProductReview"("reviewRequestId");

-- CreateIndex
CREATE INDEX "ProductReview_productProposalId_submittedAt_idx" ON "ProductReview"("productProposalId", "submittedAt");

-- CreateIndex
CREATE INDEX "ProductReview_usedStatus_idx" ON "ProductReview"("usedStatus");

-- CreateIndex
CREATE INDEX "ProductReview_allowAnonymousShare_idx" ON "ProductReview"("allowAnonymousShare");

-- CreateIndex
CREATE INDEX "Consent_customerId_consentType_idx" ON "Consent"("customerId", "consentType");

-- CreateIndex
CREATE INDEX "Consent_productReviewId_idx" ON "Consent"("productReviewId");

-- CreateIndex
CREATE INDEX "Consent_consentType_createdAt_idx" ON "Consent"("consentType", "createdAt");

-- AddForeignKey
ALTER TABLE "ProductProposal" ADD CONSTRAINT "ProductProposal_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductProposal" ADD CONSTRAINT "ProductProposal_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductProposal" ADD CONSTRAINT "ProductProposal_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReviewRequest" ADD CONSTRAINT "ProductReviewRequest_productProposalId_fkey" FOREIGN KEY ("productProposalId") REFERENCES "ProductProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productProposalId_fkey" FOREIGN KEY ("productProposalId") REFERENCES "ProductProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_reviewRequestId_fkey" FOREIGN KEY ("reviewRequestId") REFERENCES "ProductReviewRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_productReviewId_fkey" FOREIGN KEY ("productReviewId") REFERENCES "ProductReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
