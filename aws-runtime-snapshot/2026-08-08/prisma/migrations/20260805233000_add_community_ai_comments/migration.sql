ALTER TABLE "VisitCommunityPost"
ADD COLUMN "aiCommentDueAt" TIMESTAMP(3),
ADD COLUMN "aiCommentedAt" TIMESTAMP(3);

ALTER TABLE "VisitCommunityComment"
ADD COLUMN "isAiAssistant" BOOLEAN NOT NULL DEFAULT false;

UPDATE "VisitCommunityPost"
SET "aiCommentDueAt" = "publishedAt" + INTERVAL '3 hours'
WHERE "aiCommentDueAt" IS NULL;

CREATE INDEX "VisitCommunityPost_organizationId_published_aiCommentDueAt_aiCommentedAt_idx"
ON "VisitCommunityPost"("organizationId", "published", "aiCommentDueAt", "aiCommentedAt");

CREATE INDEX "VisitCommunityComment_postId_isAiAssistant_deletedAt_idx"
ON "VisitCommunityComment"("postId", "isAiAssistant", "deletedAt");
