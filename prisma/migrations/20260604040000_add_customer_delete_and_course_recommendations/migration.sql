-- Add logical deletion support for customers.
ALTER TABLE "Customer" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Store staff-facing AI treatment course recommendations.
CREATE TABLE "CourseRecommendation" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "visitId" TEXT,
  "title" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "caution" TEXT,
  "estimatedMinutes" INTEGER,
  "estimatedPrice" INTEGER,
  "priority" TEXT,
  "accepted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CourseRecommendation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CourseRecommendation_customerId_createdAt_idx"
  ON "CourseRecommendation"("customerId", "createdAt");

CREATE INDEX "CourseRecommendation_visitId_idx"
  ON "CourseRecommendation"("visitId");

ALTER TABLE "CourseRecommendation"
  ADD CONSTRAINT "CourseRecommendation_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CourseRecommendation"
  ADD CONSTRAINT "CourseRecommendation_visitId_fkey"
  FOREIGN KEY ("visitId") REFERENCES "Visit"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
