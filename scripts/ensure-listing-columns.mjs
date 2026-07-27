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
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[ensure-listing] failed:", err);
  process.exit(0);
});
