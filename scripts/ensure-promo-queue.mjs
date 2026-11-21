/**
 * Remove leftover PromoQueueItem table after SNS promo feature removal.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

async function main() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "PromoQueueItem"`);
    console.log("[ensure-promo-queue] PromoQueueItem dropped (if present)");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[ensure-promo-queue]", err);
  process.exit(1);
});
