CREATE TABLE "ServiceSale" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "appointmentId" TEXT,
  "title" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "paymentMethod" TEXT,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ServiceSale_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ServiceSale_customerId_paidAt_idx" ON "ServiceSale"("customerId", "paidAt");
CREATE INDEX "ServiceSale_appointmentId_idx" ON "ServiceSale"("appointmentId");
CREATE INDEX "ServiceSale_paidAt_idx" ON "ServiceSale"("paidAt");

ALTER TABLE "ServiceSale"
  ADD CONSTRAINT "ServiceSale_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ServiceSale"
  ADD CONSTRAINT "ServiceSale_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
