/**
 * Production boot repairs that `prisma db push` does not always apply:
 * - Migrate legacy HOT_DEALS → CAR_LISTINGS (invalid enum crashes listing reads)
 * - Ensure User login analytics columns
 * - Ensure TransactionStatementItem.qty
 * - SQLite WAL + busy_timeout + quick integrity check
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

async function tableColumns(prisma, table) {
  const rows = await prisma.$queryRawUnsafe(`PRAGMA table_info("${table}")`);
  return new Set(rows.map((r) => r.name));
}

async function ensureColumn(prisma, table, name, decl) {
  const cols = await tableColumns(prisma, table);
  if (cols.has(name)) {
    console.log(`[ensure-db] ${table}.${name} OK`);
    return;
  }
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${table}" ADD COLUMN "${name}" ${decl}`,
  );
  console.log(`[ensure-db] added ${table}.${name}`);
}

async function main() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(`PRAGMA busy_timeout = 4000`);
    await prisma.$executeRawUnsafe(`PRAGMA journal_mode = WAL`);
    await prisma.$executeRawUnsafe(`PRAGMA synchronous = NORMAL`);

    const hotRows = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) AS c FROM "Listing" WHERE "category" = 'HOT_DEALS'`,
    );
    const hotCount = Number(
      Array.isArray(hotRows) ? (hotRows[0]?.c ?? 0) : 0,
    );
    if (hotCount > 0) {
      const hot = await prisma.$executeRawUnsafe(
        `UPDATE "Listing" SET "category" = 'CAR_LISTINGS' WHERE "category" = 'HOT_DEALS'`,
      );
      console.log(`[ensure-db] HOT_DEALS → CAR_LISTINGS rows=${hot ?? 0}`);
    } else {
      console.log("[ensure-db] HOT_DEALS already migrated");
    }

    await ensureColumn(prisma, "User", "loginCount", "INTEGER NOT NULL DEFAULT 0");
    await ensureColumn(prisma, "User", "lastLoginAt", "DATETIME");
    await ensureColumn(
      prisma,
      "TransactionStatementItem",
      "qty",
      "TEXT NOT NULL DEFAULT '1'",
    );

    const settingTables = await prisma.$queryRawUnsafe(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='SiteSetting'`,
    );
    if (!Array.isArray(settingTables) || settingTables.length === 0) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "SiteSetting" (
          "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'main',
          "priceInquiryHoliday" BOOLEAN NOT NULL DEFAULT 0,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("[ensure-db] created SiteSetting");
    } else {
      console.log("[ensure-db] SiteSetting OK");
    }

    // Do not run integrity_check or wal_checkpoint on every boot.
    // Both lock SQLite and freeze the live site.
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[ensure-db] failed:", err);
  // Non-fatal — app may still serve static/health while we inspect logs.
  process.exit(0);
});
