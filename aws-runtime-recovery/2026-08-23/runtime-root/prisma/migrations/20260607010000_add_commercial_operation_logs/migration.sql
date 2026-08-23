CREATE TABLE "ContactLog" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "purpose" TEXT,
  "message" TEXT NOT NULL,
  "outcome" TEXT,
  "nextAction" TEXT,
  "scheduledFollowUp" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ContactLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Appointment" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "menu" TEXT,
  "estimatedPrice" INTEGER,
  "status" TEXT NOT NULL DEFAULT '仮予約',
  "source" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContactLog_customerId_createdAt_idx" ON "ContactLog"("customerId", "createdAt");
CREATE INDEX "ContactLog_scheduledFollowUp_idx" ON "ContactLog"("scheduledFollowUp");
CREATE INDEX "Appointment_customerId_scheduledAt_idx" ON "Appointment"("customerId", "scheduledAt");
CREATE INDEX "Appointment_scheduledAt_idx" ON "Appointment"("scheduledAt");

ALTER TABLE "ContactLog"
  ADD CONSTRAINT "ContactLog_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
