-- CreateTable
CREATE TABLE "OverseasInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNo" TEXT NOT NULL,
    "invoiceDate" TEXT NOT NULL,
    "terms" TEXT NOT NULL DEFAULT '3days',
    "dueDate" TEXT NOT NULL,
    "company" TEXT,
    "consignee" TEXT NOT NULL,
    "businessNo" TEXT,
    "finalDestination" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "exchangeRate" TEXT NOT NULL,
    "prepaidLabel" TEXT NOT NULL DEFAULT '100% PREPAID',
    "amount" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OverseasInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OverseasInvoiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "listingId" TEXT,
    "isExtra" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL,
    "regNo" TEXT,
    "vin" TEXT,
    "qty" TEXT NOT NULL DEFAULT '1',
    "priceKrw" TEXT NOT NULL,
    "rate" TEXT NOT NULL,
    "finalPrice" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "OverseasInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "OverseasInvoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OverseasInvoiceItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "OverseasInvoice_invoiceNo_key" ON "OverseasInvoice"("invoiceNo");

-- CreateIndex
CREATE INDEX "OverseasInvoice_invoiceDate_idx" ON "OverseasInvoice"("invoiceDate");

-- CreateIndex
CREATE INDEX "OverseasInvoice_createdAt_idx" ON "OverseasInvoice"("createdAt");

-- CreateIndex
CREATE INDEX "OverseasInvoice_createdById_idx" ON "OverseasInvoice"("createdById");

-- CreateIndex
CREATE INDEX "OverseasInvoice_consignee_idx" ON "OverseasInvoice"("consignee");

-- CreateIndex
CREATE INDEX "OverseasInvoiceItem_invoiceId_sortOrder_idx" ON "OverseasInvoiceItem"("invoiceId", "sortOrder");

-- CreateIndex
CREATE INDEX "OverseasInvoiceItem_listingId_idx" ON "OverseasInvoiceItem"("listingId");
