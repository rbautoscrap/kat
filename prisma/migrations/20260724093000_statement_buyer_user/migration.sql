-- AlterTable
ALTER TABLE "TransactionStatement" ADD COLUMN "buyerUserId" TEXT;

-- CreateIndex
CREATE INDEX "TransactionStatement_buyerUserId_idx" ON "TransactionStatement"("buyerUserId");
