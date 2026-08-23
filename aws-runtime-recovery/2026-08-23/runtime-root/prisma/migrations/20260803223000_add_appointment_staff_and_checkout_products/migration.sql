ALTER TABLE "Appointment" ADD COLUMN "staffName" TEXT;

ALTER TABLE "Product" ADD COLUMN "retailPrice" INTEGER;

CREATE TABLE "ProductSaleLine" (
    "id" TEXT NOT NULL,
    "serviceSaleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "manufacturerNameSnapshot" TEXT NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineTotal" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductSaleLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductSaleLine_serviceSaleId_productId_key"
ON "ProductSaleLine"("serviceSaleId", "productId");

CREATE INDEX "ProductSaleLine_productId_createdAt_idx"
ON "ProductSaleLine"("productId", "createdAt");

CREATE INDEX "ProductSaleLine_serviceSaleId_idx"
ON "ProductSaleLine"("serviceSaleId");

ALTER TABLE "ProductSaleLine"
ADD CONSTRAINT "ProductSaleLine_serviceSaleId_fkey"
FOREIGN KEY ("serviceSaleId") REFERENCES "ServiceSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductSaleLine"
ADD CONSTRAINT "ProductSaleLine_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
