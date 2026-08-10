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
    await prisma.$executeRawUnsafe(`PRAGMA busy_timeout = 15000`);
    await prisma.$executeRawUnsafe(`PRAGMA journal_mode = WAL`);
    await prisma.$executeRawUnsafe(`PRAGMA synchronous = NORMAL`);

    const hot = await prisma.$executeRawUnsafe(
      `UPDATE "Listing" SET "category" = 'CAR_LISTINGS' WHERE "category" = 'HOT_DEALS'`,
    );
    console.log(`[ensure-db] HOT_DEALS → CAR_LISTINGS rows=${hot ?? 0}`);

    await ensureColumn(prisma, "User", "loginCount", "INTEGER NOT NULL DEFAULT 0");
    await ensureColumn(prisma, "User", "lastLoginAt", "DATETIME");
    await ensureColumn(
      prisma,
      "TransactionStatementItem",
      "qty",
      "TEXT NOT NULL DEFAULT '1'",
    );

    try {
      const integrity = await prisma.$queryRawUnsafe(`PRAGMA integrity_check`);
      const first = Array.isArray(integrity) ? integrity[0] : integrity;
      const ok =
        first?.integrity_check === "ok" ||
        first?.integrity_check === "OK" ||
        Object.values(first ?? {})[0] === "ok";
      console.log(
        `[ensure-db] integrity_check=${ok ? "ok" : JSON.stringify(first)}`,
      );
    } catch (error) {
      console.warn("[ensure-db] integrity_check skipped", error);
    }

    try {
      await prisma.$executeRawUnsafe(`PRAGMA wal_checkpoint(TRUNCATE)`);
      console.log("[ensure-db] wal_checkpoint OK");
    } catch (error) {
      console.warn("[ensure-db] wal_checkpoint skipped", error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[ensure-db] failed:", err);
  // Non-fatal — app may still serve static/health while we inspect logs.
  process.exit(0);
});
