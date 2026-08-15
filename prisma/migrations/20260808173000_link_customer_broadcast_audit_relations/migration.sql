-- CreateIndex
CREATE INDEX "CustomerBroadcast_createdByStaffId_sentAt_idx" ON "CustomerBroadcast"("createdByStaffId", "sentAt");

-- AddForeignKey
ALTER TABLE "CustomerBroadcast" ADD CONSTRAINT "CustomerBroadcast_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerBroadcastRecipient" ADD CONSTRAINT "CustomerBroadcastRecipient_couponIssueId_fkey" FOREIGN KEY ("couponIssueId") REFERENCES "CouponIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
