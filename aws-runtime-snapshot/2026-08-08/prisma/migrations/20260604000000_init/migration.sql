CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT,
    "birthYear" INTEGER,
    "phone" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HairProfile" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "hairThickness" TEXT,
    "hairVolume" TEXT,
    "hairTexture" TEXT,
    "scalpCondition" TEXT,
    "faceShape" TEXT,
    "forehead" TEXT,
    "lifestyle" TEXT,
    "stylingTimeMinutes" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HairProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Preference" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "preferredLength" TEXT,
    "preferredStyle" TEXT,
    "dislikes" TEXT,
    "colorPreference" TEXT,
    "maintenanceLevel" TEXT,
    "referenceNotes" TEXT,

    CONSTRAINT "Preference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL,
    "stylistName" TEXT,
    "requestedStyle" TEXT,
    "performedStyle" TEXT,
    "cutNotes" TEXT,
    "colorNotes" TEXT,
    "permNotes" TEXT,
    "customerReaction" TEXT,
    "nextRecommendation" TEXT,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StyleSuggestion" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "visitId" TEXT,
    "suggestedStyleName" TEXT NOT NULL,
    "reason" TEXT,
    "caution" TEXT,
    "stylingAdvice" TEXT,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StyleSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HairProfile_customerId_key" ON "HairProfile"("customerId");
CREATE UNIQUE INDEX "Preference_customerId_key" ON "Preference"("customerId");
CREATE INDEX "Visit_customerId_visitedAt_idx" ON "Visit"("customerId", "visitedAt");
CREATE INDEX "StyleSuggestion_customerId_createdAt_idx" ON "StyleSuggestion"("customerId", "createdAt");

ALTER TABLE "HairProfile" ADD CONSTRAINT "HairProfile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Preference" ADD CONSTRAINT "Preference_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StyleSuggestion" ADD CONSTRAINT "StyleSuggestion_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StyleSuggestion" ADD CONSTRAINT "StyleSuggestion_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
