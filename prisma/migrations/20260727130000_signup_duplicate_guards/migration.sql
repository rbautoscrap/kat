-- AlterTable
ALTER TABLE "User" ADD COLUMN "phoneKey" TEXT;
ALTER TABLE "User" ADD COLUMN "signupIpHash" TEXT;
ALTER TABLE "User" ADD COLUMN "signupDeviceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneKey_key" ON "User"("phoneKey");
CREATE INDEX "User_signupIpHash_idx" ON "User"("signupIpHash");
CREATE INDEX "User_signupDeviceId_idx" ON "User"("signupDeviceId");
