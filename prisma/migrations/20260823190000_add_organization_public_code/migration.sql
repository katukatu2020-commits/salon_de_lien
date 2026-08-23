ALTER TABLE "Organization"
ADD COLUMN IF NOT EXISTS "publicCode" TEXT;

UPDATE "Organization"
SET "publicCode" = CASE
  WHEN "id" = 'org_salon_de_lien' THEN 'LIEN-SALON'
  WHEN "id" = 'org_showcase_yohaku' THEN 'LIEN-YOHAKU'
  ELSE 'STORE-' || UPPER(SUBSTRING(MD5("id") FROM 1 FOR 8))
END
WHERE "publicCode" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_publicCode_key"
ON "Organization"("publicCode");
