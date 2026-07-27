-- Keep the newest offer per (listingId, userId), drop legacy duplicates from the old 3-offer cap.
DELETE FROM "PurchaseOffer"
WHERE "rowid" NOT IN (
  SELECT MAX("rowid")
  FROM "PurchaseOffer"
  GROUP BY "listingId", "userId"
);
