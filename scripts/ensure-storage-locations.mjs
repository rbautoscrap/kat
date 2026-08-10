/**
 * Normalize Listing.storageLocation to canonical office names and
 * backfill costPrice from auctionPrice + incidentalCost when missing.
 * Safe to run on every boot.
 */
import { PrismaClient } from "@prisma/client";

function canonicalize(value) {
  if (value == null) return null;
  const cleaned = String(value)
    .normalize("NFC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "")
    .trim();
  if (!cleaned) return null;
  if (cleaned === "진천사업소" || cleaned.includes("진천")) return "진천사업소";
  if (cleaned === "충주사업소" || cleaned.includes("충주")) return "충주사업소";
  return cleaned;
}

function parseCost(value) {
  if (!value) return 0;
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

const prisma = new PrismaClient();

async function main() {
  // Only scan rows that still need work — full-table scans on every boot
  // were locking SQLite long enough to keep the site offline after redeploys.
  const rows = await prisma.listing.findMany({
    where: {
      OR: [
        { storageLocation: { not: null } },
        { costPrice: null },
        { costPrice: "" },
        { costPrice: "0" },
      ],
    },
    select: {
      id: true,
      storageLocation: true,
      costPrice: true,
      auctionPrice: true,
      incidentalCost: true,
    },
    take: 500,
  });

  let locationFixed = 0;
  let costFixed = 0;

  for (const row of rows) {
    const data = {};
    const canonical = canonicalize(row.storageLocation);
    const current = row.storageLocation ?? null;
    if (canonical && canonical !== current) {
      data.storageLocation = canonical;
    }

    const stored = parseCost(row.costPrice);
    if (stored <= 0) {
      const fallback =
        parseCost(row.auctionPrice) + parseCost(row.incidentalCost);
      if (fallback > 0) {
        data.costPrice = String(fallback);
      }
    }

    if (Object.keys(data).length === 0) continue;
    await prisma.listing.update({ where: { id: row.id }, data });
    if ("storageLocation" in data) locationFixed += 1;
    if ("costPrice" in data) costFixed += 1;
  }

  console.log(
    `[ensure-storage-locations] locationFixed=${locationFixed} costFixed=${costFixed} scanned=${rows.length}`,
  );
}

main()
  .catch((err) => {
    console.error("[ensure-storage-locations] failed", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
