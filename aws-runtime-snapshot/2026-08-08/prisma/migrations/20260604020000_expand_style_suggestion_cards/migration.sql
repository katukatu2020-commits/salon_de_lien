ALTER TABLE "StyleSuggestion" ADD COLUMN "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "StyleSuggestion" ADD COLUMN "menuSuggestion" TEXT;
ALTER TABLE "StyleSuggestion" ADD COLUMN "estimatedMinutes" INTEGER;
ALTER TABLE "StyleSuggestion" ADD COLUMN "maintenanceLevel" TEXT;
ALTER TABLE "StyleSuggestion" ADD COLUMN "label" TEXT;
