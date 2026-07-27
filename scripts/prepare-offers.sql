DELETE FROM "PurchaseOffer"
WHERE "rowid" NOT IN (
  SELECT MAX("rowid") FROM "PurchaseOffer" GROUP BY "listingId", "userId"
);
