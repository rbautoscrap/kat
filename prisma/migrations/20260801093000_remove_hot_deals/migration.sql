-- Reassign legacy Hot Deals listings, then drop the category from the Prisma enum.
-- SQLite stores ListingCategory as TEXT; no table rewrite required.
UPDATE "Listing" SET "category" = 'CAR_LISTINGS' WHERE "category" = 'HOT_DEALS';
