ALTER TABLE "AppUser"
ADD COLUMN "displayName" TEXT;

CREATE TABLE "VisitPhoto" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "storageReference" TEXT NOT NULL,
    "caption" TEXT,
    "uploadedByUserId" TEXT,
    "uploadedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitPhoto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VisitPhoto_storageReference_key" ON "VisitPhoto"("storageReference");
CREATE INDEX "VisitPhoto_customerId_createdAt_idx" ON "VisitPhoto"("customerId", "createdAt");
CREATE INDEX "VisitPhoto_visitId_createdAt_idx" ON "VisitPhoto"("visitId", "createdAt");

ALTER TABLE "VisitPhoto"
ADD CONSTRAINT "VisitPhoto_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VisitPhoto"
ADD CONSTRAINT "VisitPhoto_visitId_fkey"
FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
