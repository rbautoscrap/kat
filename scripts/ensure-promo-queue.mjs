/**
 * Ensure PromoQueueItem exists when prisma db push was skipped.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

async function main() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const tables = await prisma.$queryRawUnsafe(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='PromoQueueItem'`,
    );
    if (tables.length) {
      const cols = await prisma.$queryRawUnsafe(
        `PRAGMA table_info("PromoQueueItem")`,
      );
      const names = new Set(cols.map((c) => c.name));
      if (!names.has("channelResults")) {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "PromoQueueItem" ADD COLUMN "channelResults" TEXT`,
        );
        console.log("[ensure-promo-queue] added channelResults");
      } else {
        console.log("[ensure-promo-queue] PromoQueueItem OK");
      }
      return;
    }
    await prisma.$executeRawUnsafe(`
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
        "channelResults" TEXT,
        "approvedAt" DATETIME,
        "postedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "PromoQueueItem_listingId_fkey"
          FOREIGN KEY ("listingId") REFERENCES "Listing" ("id")
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX "PromoQueueItem_status_createdAt_idx" ON "PromoQueueItem"("status", "createdAt")`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX "PromoQueueItem_listingId_status_idx" ON "PromoQueueItem"("listingId", "status")`,
    );
    console.log("[ensure-promo-queue] created PromoQueueItem");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[ensure-promo-queue]", err);
  process.exit(1);
});
