ALTER TABLE "VisitCommunityPost"
  ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER;

WITH ranked AS (
  SELECT "id",
         ROW_NUMBER() OVER (
           PARTITION BY "organizationId"
           ORDER BY
             CASE WHEN "displayOrder" IS NULL OR "displayOrder" < 1 THEN 1 ELSE 0 END,
             "displayOrder" ASC NULLS LAST,
             "publishedAt" DESC,
             "id" DESC
         )::INTEGER AS "position"
  FROM "VisitCommunityPost"
)
UPDATE "VisitCommunityPost" AS post
SET "displayOrder" = ranked."position"
FROM ranked
WHERE post."id" = ranked."id";

CREATE INDEX IF NOT EXISTS "VisitCommunityPost_organizationId_displayOrder_idx"
  ON "VisitCommunityPost"("organizationId", "displayOrder");
