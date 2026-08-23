DROP INDEX IF EXISTS "Product_manufacturerName_name_key";

CREATE UNIQUE INDEX "Product_organizationId_manufacturerName_name_key"
ON "Product"("organizationId", "manufacturerName", "name");
