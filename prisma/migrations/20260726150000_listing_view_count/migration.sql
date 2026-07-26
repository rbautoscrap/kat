-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Listing_viewCount_idx" ON "Listing"("viewCount");
