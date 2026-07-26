-- CreateTable
CREATE TABLE "ListingView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ListingView_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ListingView_listingId_idx" ON "ListingView"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "ListingView_listingId_ipHash_key" ON "ListingView"("listingId", "ipHash");
