-- AlterTable
ALTER TABLE "TransactionStatementItem" ADD COLUMN "paidAmount" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransactionStatementItem" ADD COLUMN "shipmentType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransactionStatementItem" ADD COLUMN "shippedDate" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransactionStatementItem" ADD COLUMN "reportNote" TEXT NOT NULL DEFAULT '';
