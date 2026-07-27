/**
 * Ensure Listing.offersSeenAt exists even if prisma db push was skipped.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

async function main() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe(`PRAGMA table_info("Listing")`);
    const names = new Set(rows.map((r) => r.name));
    if (!names.has("offersSeenAt")) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "Listing" ADD COLUMN "offersSeenAt" DATETIME`,
      );
      console.log("[ensure-listing] added Listing.offersSeenAt");
    } else {
      console.log("[ensure-listing] Listing.offersSeenAt OK");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[ensure-listing] failed:", err);
  process.exit(0);
});
