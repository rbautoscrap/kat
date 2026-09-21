-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "displayedImageGroup" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "ListingImage" ADD COLUMN "group" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ListingImage" ADD COLUMN "isCover" BOOLEAN NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "ListingImage_listingId_group_sortOrder_idx" ON "ListingImage"("listingId", "group", "sortOrder");
