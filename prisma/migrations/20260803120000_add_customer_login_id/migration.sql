ALTER TABLE "AppUser" ADD COLUMN "loginId" TEXT;

CREATE UNIQUE INDEX "AppUser_loginId_key" ON "AppUser"("loginId");
