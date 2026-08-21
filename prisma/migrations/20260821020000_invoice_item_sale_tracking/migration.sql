-- AlterTable
ALTER TABLE "OverseasInvoiceItem" ADD COLUMN "paidAmount" TEXT NOT NULL DEFAULT '';
ALTER TABLE "OverseasInvoiceItem" ADD COLUMN "shipmentType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "OverseasInvoiceItem" ADD COLUMN "shippedDate" TEXT NOT NULL DEFAULT '';
ALTER TABLE "OverseasInvoiceItem" ADD COLUMN "reportNote" TEXT NOT NULL DEFAULT '';
ALTER TABLE "OverseasInvoiceItem" ADD COLUMN "inReceivableLedger" BOOLEAN NOT NULL DEFAULT false;
