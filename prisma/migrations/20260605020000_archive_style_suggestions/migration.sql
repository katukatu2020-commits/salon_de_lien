ALTER TABLE "StyleSuggestion" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "StyleSuggestion_customerId_archivedAt_createdAt_idx" ON "StyleSuggestion"("customerId", "archivedAt", "createdAt");
