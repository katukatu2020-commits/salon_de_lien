ALTER TABLE "Customer" ADD COLUMN "aiFrontImageUrl" TEXT;
ALTER TABLE "Customer" ADD COLUMN "aiSideImageUrl" TEXT;
ALTER TABLE "Customer" ADD COLUMN "aiBackImageUrl" TEXT;
ALTER TABLE "Customer" ADD COLUMN "aiPhotoConsent" BOOLEAN NOT NULL DEFAULT false;
