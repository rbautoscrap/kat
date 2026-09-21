/**
 * Ensure Listing columns exist even if prisma db push was skipped.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

async function ensureColumn(prisma, names, column, sqlType) {
  if (names.has(column)) {
    console.log(`[ensure-listing] Listing.${column} OK`);
    return;
  }
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Listing" ADD COLUMN "${column}" ${sqlType}`,
  );
  console.log(`[ensure-listing] added Listing.${column}`);
}

async function main() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe(`PRAGMA table_info("Listing")`);
    const names = new Set(rows.map((r) => r.name));
    await ensureColumn(prisma, names, "offersSeenAt", "DATETIME");
    await ensureColumn(prisma, names, "auctionEndsAt", "DATETIME");
    await ensureColumn(prisma, names, "bumpedAt", "DATETIME");
    await ensureColumn(prisma, names, "salePrice", "TEXT");
    await ensureColumn(prisma, names, "manufactureMonth", "INTEGER");
    await ensureColumn(prisma, names, "adminNote", "TEXT");
    await ensureColumn(
      prisma,
      names,
      "chungjuMoveRequested",
      "BOOLEAN NOT NULL DEFAULT 0",
    );
    await ensureColumn(
      prisma,
      names,
      "displayedImageGroup",
      "INTEGER NOT NULL DEFAULT 1",
    );

    const imageRows = await prisma.$queryRawUnsafe(
      `PRAGMA table_info("ListingImage")`,
    );
    const imageNames = new Set(imageRows.map((r) => r.name));
    if (!imageNames.has("group")) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "ListingImage" ADD COLUMN "group" INTEGER NOT NULL DEFAULT 1`,
      );
      console.log("[ensure-listing] added ListingImage.group");
    } else {
      console.log("[ensure-listing] ListingImage.group OK");
    }
    if (!imageNames.has("isCover")) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "ListingImage" ADD COLUMN "isCover" BOOLEAN NOT NULL DEFAULT 0`,
      );
      console.log("[ensure-listing] added ListingImage.isCover");
    } else {
      console.log("[ensure-listing] ListingImage.isCover OK");
    }

    const backfill = await prisma.$executeRawUnsafe(`
      UPDATE "ListingImage"
      SET "isCover" = 1
      WHERE "id" IN (
        SELECT li."id" FROM "ListingImage" li
        INNER JOIN (
          SELECT "listingId", MIN("sortOrder") AS minSort
          FROM "ListingImage"
          GROUP BY "listingId"
        ) t
          ON li."listingId" = t."listingId" AND li."sortOrder" = t.minSort
      )
      AND NOT EXISTS (
        SELECT 1 FROM "ListingImage" c
        WHERE c."listingId" = "ListingImage"."listingId" AND c."isCover" = 1
      )
    `);
    console.log(`[ensure-listing] cover backfill rows=${backfill ?? 0}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[ensure-listing] failed:", err);
  process.exit(0);
});
