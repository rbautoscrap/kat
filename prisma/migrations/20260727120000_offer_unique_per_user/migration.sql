-- Keep the newest offer per (listingId, userId), drop legacy duplicates from the old 3-offer cap.
DELETE FROM "PurchaseOffer"
WHERE "rowid" NOT IN (
  SELECT MAX("rowid")
  FROM "PurchaseOffer"
  GROUP BY "listingId", "userId"
);

-- AlterTable
ALTER TABLE "PurchaseOffer" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseOffer_listingId_updatedAt_idx" ON "PurchaseOffer"("listingId", "updatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseOffer_userId_updatedAt_idx" ON "PurchaseOffer"("userId", "updatedAt");
