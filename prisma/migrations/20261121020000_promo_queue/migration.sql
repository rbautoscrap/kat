-- CreateTable
CREATE TABLE "PromoQueueItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "headline" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "listingUrl" TEXT NOT NULL,
    "costWon" INTEGER NOT NULL DEFAULT 0,
    "ageDays" INTEGER NOT NULL DEFAULT 0,
    "channels" TEXT NOT NULL DEFAULT 'telegram,instagram,facebook,x',
    "approvedAt" DATETIME,
    "postedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PromoQueueItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PromoQueueItem_status_createdAt_idx" ON "PromoQueueItem"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PromoQueueItem_listingId_status_idx" ON "PromoQueueItem"("listingId", "status");
